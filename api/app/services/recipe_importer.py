"""Recipe dataset importer for Kaggle and other sources."""

import csv
import json
import logging
import os
from contextlib import suppress
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import kagglehub  # type: ignore[import-untyped]
from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from api.app.models import (
    ImportJob,
    ImportJobStatus,
    IntegrationCredential,
    Recipe,
    RecipeIngredient,
)
from api.app.services.provider_credentials import decrypt_api_key

logger = logging.getLogger(__name__)

BATCH_SIZE = 1000


def import_kaggle_dataset(session: Session, import_job_id: int) -> ImportJob:
    job = session.get(ImportJob, import_job_id)
    if not job:
        raise ValueError(f"ImportJob {import_job_id} not found")

    try:
        job.status = ImportJobStatus.RUNNING
        session.commit()

        credential = session.scalar(
            select(IntegrationCredential).where(
                IntegrationCredential.integration_key == "kaggle-recipes"
            )
        )
        if credential is None or not credential.account_name:
            raise ValueError(
                "Kaggle credentials must be configured in Kombu settings. "
                "Create a free Kaggle account and generate an API token at "
                "https://www.kaggle.com/settings"
            )
        # kagglehub reads these process-local variables; values originate from
        # the encrypted database record and are never logged or persisted raw.
        os.environ["KAGGLE_USERNAME"] = credential.account_name
        os.environ["KAGGLE_KEY"] = decrypt_api_key(credential.encrypted_secret)

        logger.info(
            "Downloading Kaggle dataset 'wilmerarltstrmberg/recipe-dataset-over-2m'..."
        )
        download_path = kagglehub.dataset_download(
            "wilmerarltstrmberg/recipe-dataset-over-2m"
        )
        logger.info(f"Downloaded to: {download_path}")

        csv_files = list(Path(download_path).glob("*.csv"))
        if not csv_files:
            raise FileNotFoundError(f"No CSV files found in {download_path}")

        csv_path = csv_files[0]
        logger.info(f"Reading CSV: {csv_path}")

        with open(csv_path, newline="", encoding="utf-8") as f:
            total_rows = sum(1 for _ in f) - 1  # minus header

        logger.info(f"CSV has {total_rows:,} rows")

        job.total_records = total_rows
        job.imported_records = 0
        session.merge(job)
        session.commit()

        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            logger.info(f"CSV columns: {reader.fieldnames}")

            total_recipes = 0
            total_ingredients = 0
            batch_recipes: list[dict] = []

            for row in reader:
                recipe_map = _map_recipe(row)
                batch_recipes.append(recipe_map)
                total_recipes += 1

                if len(batch_recipes) >= BATCH_SIZE:
                    total_ingredients += _flush_batch(session, batch_recipes)
                    batch_recipes = []

                if total_recipes % 10000 == 0:
                    job.imported_records = total_recipes
                    session.merge(job)
                    session.commit()
                    logger.info(f"Imported {total_recipes:,}/{total_rows:,} recipes...")

            if batch_recipes:
                total_ingredients += _flush_batch(session, batch_recipes)

        job.imported_records = total_recipes
        job.status = ImportJobStatus.COMPLETED
        job.completed_at = datetime.now(UTC)
        session.merge(job)
        session.commit()

        logger.info(
            f"Import complete: {total_recipes} recipes, {total_ingredients} ingredients"
        )
        return job

    except Exception as exc:
        logger.exception(f"Import job {import_job_id} failed")
        job.status = ImportJobStatus.FAILED
        job.error_message = str(exc)
        job.completed_at = datetime.now(UTC)
        session.merge(job)
        session.commit()
        raise


def _flush_batch(session: Session, batch: list[dict]) -> int:
    """Insert a batch of recipes and their ingredients. Returns ingredient count."""
    total_ingredients = 0
    for recipe_map in batch:
        ingredients = recipe_map.pop("_ingredients", [])
        stmt = insert(Recipe).values(**recipe_map)
        result: Any = session.execute(stmt)
        recipe_id: int = result.inserted_primary_key[0]

        for ing in ingredients:
            ing["recipe_id"] = recipe_id
            session.execute(insert(RecipeIngredient).values(**ing))
            total_ingredients += 1

    session.commit()
    return total_ingredients


def _map_recipe(row: dict) -> dict:
    """Map a CSV row to a Recipe dict for bulk insert."""
    source_url = row.get("link") or row.get("source_url") or None
    if source_url and "://" not in source_url:
        source_url = f"https://{source_url}"

    recipe: dict = {
        "title": (row.get("title") or row.get("name") or "").strip()[:240],
        "source_type": "import",
        "source_url": source_url,
    }

    image_url = row.get("image_url") or row.get("image") or row.get("photo_url")
    if image_url:
        recipe["image_url"] = image_url.strip()[:2048]

    instructions = row.get("instructions") or row.get("directions") or row.get("steps")
    if instructions:
        recipe["instructions"] = instructions.strip()

    cuisine = row.get("cuisine") or row.get("category")
    if cuisine:
        recipe["cuisine"] = cuisine.strip()[:120]

    for csv_key, model_key in [
        ("prep_time", "prep_minutes"),
        ("prep_minutes", "prep_minutes"),
        ("cook_time", "cook_minutes"),
        ("cook_minutes", "cook_minutes"),
        ("servings", "yield_servings"),
        ("yield", "yield_servings"),
        ("yield_servings", "yield_servings"),
    ]:
        val = row.get(csv_key)
        if val and str(val).strip():
            with suppress(ValueError, TypeError):
                recipe[model_key] = int(float(str(val).strip()))

    summary = row.get("description") or row.get("summary")
    if summary:
        recipe["summary"] = summary.strip()

    recipe["_ingredients"] = _parse_ingredients(row)

    return recipe


def _parse_ingredients(row: dict) -> list[dict]:
    """Parse ingredients from CSV row into dicts for bulk insert."""
    ingredients: list[dict] = []
    raw = row.get("ingredients") or row.get("NER") or "[]"

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            for i, item in enumerate(parsed):
                if isinstance(item, str):
                    ingredients.append(
                        {
                            "name": item.strip()[:240],
                            "position": i,
                            "quantity": None,
                            "unit": None,
                            "note": None,
                        }
                    )
                elif isinstance(item, dict):
                    ingredients.append(
                        {
                            "name": str(
                                item.get("name", item.get("ingredient", ""))
                            ).strip()[:240],
                            "position": i,
                            "quantity": _try_float(item.get("quantity")),
                            "unit": str(item.get("unit", ""))[:80]
                            if item.get("unit")
                            else None,
                            "note": str(item.get("note", item.get("notes", "")))[:240]
                            if item.get("note") or item.get("notes")
                            else None,
                        }
                    )
    except (json.JSONDecodeError, TypeError):
        if raw and raw.strip():
            for i, item in enumerate(raw.split(",")):
                name = item.strip().strip("'\"[]")
                if name:
                    ingredients.append(
                        {
                            "name": name[:240],
                            "position": i,
                            "quantity": None,
                            "unit": None,
                            "note": None,
                        }
                    )

    return ingredients


def _try_float(val: object) -> float | None:
    if val is None:
        return None
    with suppress(ValueError, TypeError):
        return float(str(val))
    return None

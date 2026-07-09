"""Recipe dataset importer for Kaggle and other sources."""

import csv
import json
import logging
import os
from contextlib import suppress
from pathlib import Path

import kagglehub  # type: ignore[import-untyped]
from sqlalchemy.orm import Session

from api.app.config import get_settings
from api.app.models import ImportJob, ImportJobStatus, Recipe, RecipeIngredient

logger = logging.getLogger(__name__)

BATCH_SIZE = 1000


def import_kaggle_dataset(session: Session, import_job_id: int) -> ImportJob:
    settings = get_settings()
    job = session.get(ImportJob, import_job_id)
    if not job:
        raise ValueError(f"ImportJob {import_job_id} not found")

    try:
        job.status = ImportJobStatus.RUNNING
        session.commit()

        os.environ["KAGGLE_USERNAME"] = settings.kaggle_username
        os.environ["KAGGLE_KEY"] = settings.kaggle_key

        if not settings.kaggle_username or not settings.kaggle_key:
            raise ValueError(
                "KAGGLE_USERNAME and KAGGLE_KEY must be set. "
                "Create a free Kaggle account and generate an API token at "
                "https://www.kaggle.com/settings"
            )

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
                    _flush_recipes(session, batch_recipes)
                    _flush_ingredients_for_batch(session, batch_recipes)
                    total_ingredients += sum(
                        len(r.get("_ingredients", [])) for r in batch_recipes
                    )
                    batch_recipes = []

                if total_recipes % 10000 == 0:
                    job.total_records = total_recipes
                    job.imported_records = total_recipes
                    session.merge(job)
                    session.commit()
                    logger.info(f"Imported {total_recipes} recipes so far...")

            if batch_recipes:
                _flush_recipes(session, batch_recipes)
                _flush_ingredients_for_batch(session, batch_recipes)
                total_ingredients += sum(
                    len(r.get("_ingredients", [])) for r in batch_recipes
                )

        job.total_records = total_recipes
        job.imported_records = total_recipes
        job.status = ImportJobStatus.COMPLETED
        session.merge(job)
        session.commit()

        logger.info(
            f"Import complete: {total_recipes} recipes, {total_ingredients} ingredients"
        )
        return job

    except Exception:
        logger.exception(f"Import job {import_job_id} failed")
        job.status = ImportJobStatus.FAILED
        job.error_message = str(Exception)
        session.merge(job)
        session.commit()
        raise


def _flush_recipes(session: Session, batch: list[dict]) -> None:
    mappings = [{k: v for k, v in r.items() if k != "_ingredients"} for r in batch]
    session.bulk_insert_mappings(Recipe, mappings)
    session.commit()


def _flush_ingredients_for_batch(session: Session, batch: list[dict]) -> None:
    recipes_inserted = batch[0].get("title") if batch else None
    if not recipes_inserted:
        return

    all_ingredient_mappings = []
    for recipe in batch:
        ingredients = recipe.get("_ingredients", [])
        if not ingredients:
            continue
        all_ingredient_mappings.extend(ingredients)

    if all_ingredient_mappings:
        session.bulk_insert_mappings(RecipeIngredient, all_ingredient_mappings)
        session.commit()


def _map_recipe(row: dict) -> dict:
    """Map a CSV row to a Recipe dict for bulk insert."""
    recipe: dict = {
        "title": (row.get("title") or row.get("name") or "").strip()[:240],
        "source_type": "import",
        "source_url": row.get("source_url") or row.get("link") or None,
    }

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

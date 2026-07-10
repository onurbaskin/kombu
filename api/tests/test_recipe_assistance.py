"""Recipe filtering, cache, and intelligent shopping behavior tests."""

import json

from api.app.database import Base
from api.app.models import InventoryItem
from api.app.routes.recipes.schemas import RecipeCreate, RecipeIngredientCreate
from api.app.routes.recipes.utils import (
    add_missing_recipe_items,
    cache_recipe_enhancement,
    count_recipes,
    create_recipe,
    get_filter_values,
    latest_recipe_enhancement,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool


def recipe_session() -> Session:
    """Create a disposable in-memory session containing the full schema."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return Session(engine)


def test_recipe_filters_are_derived_from_stored_ingredients() -> None:
    """Popular imported ingredient names should become listing filters."""
    with recipe_session() as session:
        create_recipe(
            session,
            RecipeCreate(
                title="Tomato pasta",
                cuisine="Italian",
                prep_minutes=10,
                cook_minutes=20,
                ingredients=[RecipeIngredientCreate(name="Tomato")],
            ),
        )

        values = get_filter_values(session)

        assert values.cuisines == ["Italian"]
        assert values.ingredients == ["Tomato"]
        assert count_recipes(session, ingredient="tomato") == 1
        assert count_recipes(session, max_total_minutes=15) == 0


def test_recipe_enhancement_uses_latest_cached_response() -> None:
    """Enhancements should persist and the latest regeneration should win."""
    with recipe_session() as session:
        recipe = create_recipe(session, RecipeCreate(title="Soup"))
        cache_recipe_enhancement(
            session,
            recipe.id,
            {"title": "Soup", "summary": "Warm", "instructions": "Cook", "tips": []},
        )
        cache_recipe_enhancement(
            session,
            recipe.id,
            {
                "title": "Better soup",
                "summary": "Warmer",
                "instructions": "Simmer",
                "tips": ["Taste"],
            },
        )

        cached = latest_recipe_enhancement(session, recipe.id)

        assert cached is not None
        assert json.loads(cached.suggestion)["title"] == "Better soup"


def test_shopping_action_skips_inventory_and_tiny_pantry_amounts() -> None:
    """A recipe should add purchase-worthy gaps, not half-spoons of staples."""
    with recipe_session() as session:
        recipe = create_recipe(
            session,
            RecipeCreate(
                title="Pasta",
                ingredients=[
                    RecipeIngredientCreate(name="Tomato", quantity=2),
                    RecipeIngredientCreate(name="Pasta", quantity=500, unit="g"),
                    RecipeIngredientCreate(name="Salt", quantity=0.5, unit="tsp"),
                ],
            ),
        )
        session.add(InventoryItem(name="Tomato", quantity=4))
        session.commit()

        result = add_missing_recipe_items(session, recipe)

        assert result["added"] == ["Pasta"]
        assert result["skipped_available"] == ["Tomato"]
        assert result["skipped_household_quantity"] == ["Salt"]

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.app.config import Settings, get_settings
from api.app.routes.ai.endpoints import router as ai_router
from api.app.routes.alerts.endpoints import router as alerts_router
from api.app.routes.health.endpoints import router as health_router
from api.app.routes.imports.endpoints import router as imports_router
from api.app.routes.inventory.endpoints import router as inventory_router
from api.app.routes.meal_plans.endpoints import router as meal_plans_router
from api.app.routes.recipes.endpoints import router as recipes_router
from api.app.routes.scanner.endpoints import router as scanner_router
from api.app.routes.shopping_list.endpoints import router as shopping_list_router
from api.app.routes.system.endpoints import router as system_router
from api.app.routes.users.endpoints import router as users_router


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    app_settings = settings or get_settings()
    app = FastAPI(
        title=app_settings.app_name,
        description=(
            "Self-hostable kitchen OS API for recipes, inventory, shopping, "
            "scanners, and AI-ready workflows."
        ),
        version="0.1.0",
        openapi_url="/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(system_router, prefix=app_settings.api_prefix)
    app.include_router(users_router, prefix=app_settings.api_prefix)
    app.include_router(recipes_router, prefix=app_settings.api_prefix)
    app.include_router(inventory_router, prefix=app_settings.api_prefix)
    app.include_router(meal_plans_router, prefix=app_settings.api_prefix)
    app.include_router(shopping_list_router, prefix=app_settings.api_prefix)
    app.include_router(alerts_router, prefix=app_settings.api_prefix)
    app.include_router(imports_router, prefix=app_settings.api_prefix)
    app.include_router(scanner_router, prefix=app_settings.api_prefix)
    app.include_router(ai_router, prefix=app_settings.api_prefix)
    return app


app = create_app()

from api.app.routes.users.schemas import CurrentUserRead


def build_current_user() -> CurrentUserRead:
    """Build a safe local-development current user placeholder."""
    return CurrentUserRead(
        id="local-admin",
        email="admin@example.invalid",
        display_name="Local Administrator",
        role="owner",
        auth_provider="local",
        permissions=[
            "recipes:write",
            "inventory:write",
            "shopping:write",
            "imports:write",
            "scanner:write",
            "settings:read",
        ],
    )

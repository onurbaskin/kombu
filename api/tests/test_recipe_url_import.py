import socket

import pytest
from api.app.routes.recipes.endpoints import validate_public_recipe_url, webpage_text
from fastapi import HTTPException


def test_recipe_url_rejects_non_http_scheme() -> None:
    """Recipe extraction only fetches public HTTP(S) pages."""
    with pytest.raises(HTTPException, match="absolute HTTP or HTTPS"):
        validate_public_recipe_url("file:///etc/passwd")


def test_recipe_url_rejects_private_address(monkeypatch: pytest.MonkeyPatch) -> None:
    """Recipe extraction cannot target private services through a hostname."""
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *_args, **_kwargs: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 0))
        ],
    )

    with pytest.raises(HTTPException, match="public internet hosts"):
        validate_public_recipe_url("https://internal.example/recipe")


def test_webpage_text_removes_noncontent_markup() -> None:
    """Only readable page content is sent to an AI provider."""
    text = webpage_text(
        "<html><style>hidden</style><script>secret()</script>"
        "<body>Weeknight soup</body></html>"
    )

    assert text == "Weeknight soup"

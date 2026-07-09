from collections.abc import Generator
from datetime import UTC, datetime

import pytest
from api.app.config import get_settings
from api.app.models import AiProviderConfig
from api.app.routes.ai.endpoints import _provider_response
from api.app.services.ai import _get_client_kwargs
from api.app.services.provider_credentials import (
    ProviderCredentialError,
    decrypt_api_key,
    encrypt_api_key,
    normalize_model,
)


@pytest.fixture(autouse=True)
def encryption_key(monkeypatch: pytest.MonkeyPatch) -> Generator[None]:
    monkeypatch.setenv(
        "KOMBU_ENCRYPTION_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    )
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_api_keys_are_encrypted_at_rest() -> None:
    encrypted = encrypt_api_key("secret-provider-key")

    assert encrypted != "secret-provider-key"
    assert decrypt_api_key(encrypted) == "secret-provider-key"


def test_missing_encryption_key_is_a_controlled_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("KOMBU_ENCRYPTION_KEY")
    get_settings.cache_clear()

    with pytest.raises(ProviderCredentialError, match="not configured"):
        encrypt_api_key("secret-provider-key")


@pytest.mark.parametrize(
    ("provider", "model", "expected"),
    [
        ("openai", "gpt-4o-mini", "openai/gpt-4o-mini"),
        ("openai", "openai/gpt-4o-mini", "openai/gpt-4o-mini"),
        ("google", "gemini/gemini-2.5-flash", "gemini/gemini-2.5-flash"),
    ],
)
def test_model_normalization_preserves_litellm_identifiers(
    provider: str, model: str, expected: str
) -> None:
    assert normalize_model(provider, model) == expected


def test_provider_response_does_not_include_the_api_key() -> None:
    now = datetime.now(UTC)
    config = AiProviderConfig(
        id=1,
        provider="openai",
        label="OpenAI",
        encrypted_api_key=encrypt_api_key("secret-provider-key"),
        default_model="openai/gpt-4o-mini",
        is_enabled=True,
        created_at=now,
        updated_at=now,
    )

    response = _provider_response(config)

    assert response.api_key_configured is True
    assert response.api_key_hint is None
    assert "secret-provider-key" not in response.model_dump_json()


def test_client_kwargs_support_existing_suffix_only_models() -> None:
    config = AiProviderConfig(
        provider="anthropic",
        label="Anthropic",
        encrypted_api_key=encrypt_api_key("secret-provider-key"),
        default_model="claude-3-5-haiku-latest",
        is_enabled=True,
    )

    assert _get_client_kwargs(config) == {
        "model": "anthropic/claude-3-5-haiku-latest",
        "api_key": "secret-provider-key",
    }

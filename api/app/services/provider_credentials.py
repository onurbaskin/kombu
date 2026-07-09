"""Encryption and model normalization for UI-managed AI provider settings."""

from cryptography.fernet import Fernet, InvalidToken

from api.app.config import get_settings


class ProviderCredentialError(ValueError):
    """A provider credential cannot be safely used."""


def _fernet() -> Fernet:
    key = get_settings().encryption_key
    if not key:
        raise ProviderCredentialError(
            "AI provider encryption is not configured. Set KOMBU_ENCRYPTION_KEY."
        )
    try:
        return Fernet(key.encode())
    except (TypeError, ValueError) as exc:
        raise ProviderCredentialError(
            "KOMBU_ENCRYPTION_KEY must be a valid Fernet key."
        ) from exc


def encrypt_api_key(api_key: str) -> str:
    """Encrypt a provider key before it is stored."""
    return _fernet().encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_api_key: str) -> str:
    """Decrypt a provider key immediately before sending a provider request."""
    try:
        return _fernet().decrypt(encrypted_api_key.encode()).decode()
    except InvalidToken as exc:
        raise ProviderCredentialError(
            "The stored AI provider API key cannot be decrypted."
        ) from exc


def normalize_model(provider: str, model: str) -> str:
    """Return a LiteLLM model identifier without duplicating a provider prefix."""
    return model if "/" in model else f"{provider}/{model}"

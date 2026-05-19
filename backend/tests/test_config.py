"""Tests for Settings loading from environment variables."""
import os
from unittest.mock import patch


def test_settings_load() -> None:
    """Settings() must initialise without error when required vars are provided."""
    test_env = {
        "GEMINI_API_KEY": "test-gemini",
        "ANTHROPIC_API_KEY": "test-anthropic",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test-anon",
        "SUPABASE_SERVICE_KEY": "test-service",
        "SUPABASE_DB_URL": "postgresql+asyncpg://user:pass@localhost/db",
        "REDIS_URL": "redis://localhost:6379/0",
        "JWT_SECRET": "test-secret",
        "ENVIRONMENT": "test",
    }
    with patch.dict(os.environ, test_env, clear=False):
        from importlib import reload
        import backend.core.config as cfg_module

        reload(cfg_module)
        settings = cfg_module.Settings()

    assert settings.ENVIRONMENT == "test"
    assert settings.JWT_SECRET == "test-secret"
    assert settings.GEMINI_API_KEY == "test-gemini"

"""Application configuration — loads all env vars via pydantic-settings."""
from pydantic_settings import BaseSettings

DEFAULT_JWT_SECRET = "change-me-in-production"
DEFAULT_ENVIRONMENT = "development"
DEFAULT_DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:54322/postgres"
DEFAULT_REDIS_URL = "redis://localhost:6379/0"


class Settings(BaseSettings):
    # AI
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_DB_URL: str = DEFAULT_DB_URL

    # Infrastructure
    REDIS_URL: str = DEFAULT_REDIS_URL

    # Affiliate / monetisation
    SERPAPI_KEY: str = ""
    MYNTRA_AFFILIATE_ID: str = ""
    NYKAA_AFFILIATE_ID: str = ""
    FLIPKART_AFFILIATE_ID: str = ""
    FLIPKART_AFFILIATE_TOKEN: str = ""
    AMAZON_ASSOC_TAG: str = ""
    AMAZON_ACCESS_KEY: str = ""
    AMAZON_SECRET_KEY: str = ""
    ADMOB_APP_ID: str = ""
    OPENWEATHER_API_KEY: str = ""

    # Security / app
    JWT_SECRET: str = DEFAULT_JWT_SECRET
    ENVIRONMENT: str = DEFAULT_ENVIRONMENT

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

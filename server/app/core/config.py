from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "RevivePilot"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/revivepilot"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security / JWT
    JWT_SECRET_KEY: str = "revivepilot-insecure-dev-secret-key-replace-in-production-min32"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALLOW_MERCHANT_REGISTRATION: bool = False

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Razorpay (Test Mode)
    RAZORPAY_KEY_ID: str = "rzp_test_mock"
    RAZORPAY_KEY_SECRET: str = "mock_secret"
    RAZORPAY_WEBHOOK_SECRET: str = "rzp_webhook_secret_dev"

    # AI & Multi-Agent Reasoning Pipeline (Google Gemini)
    GEMINI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    @property
    def active_gemini_api_key(self) -> str:
        return self.GEMINI_API_KEY or self.GOOGLE_API_KEY or ""

    # SMTP Mailer Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_APP_PASSWORD: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "RevivePilot Recovery"
    SMTP_TLS: bool = True

    # OTP Security Parameters
    OTP_EXPIRE_SECONDS: int = 300      # 5 minutes expiration
    OTP_MAX_ATTEMPTS: int = 5          # Maximum verification tries before invalidation
    OTP_COOLDOWN_SECONDS: int = 60     # Minimum time between resends

    @property
    def resolved_smtp_password(self) -> str:
        return self.SMTP_APP_PASSWORD or self.SMTP_PASSWORD

    @property
    def resolved_smtp_from(self) -> str:
        return self.SMTP_FROM or self.SMTP_FROM_EMAIL or self.SMTP_USER


settings = Settings()

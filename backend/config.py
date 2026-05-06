from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = ["http://localhost:5173"]
    hmac_secret: str = "dev-secret-replace-in-production"
    environment: str = "development"

    # Gemini API (Google AI Studio) — used by the intent guardrail service
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list) -> list[str]:
        if isinstance(v, list):
            return v
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass
        return [v]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()

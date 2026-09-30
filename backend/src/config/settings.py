import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
BACKEND_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://DTY:24102026@localhost:5432/fastapi_db"

    @property
    def DATABASE_URL(self) -> str:
        return self.database_url

    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_ENV_PATH), str(ENV_PATH), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

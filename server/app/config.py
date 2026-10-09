from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    env: str = os.getenv("QIUZHI_ENV", "development")
    data_dir: Path = Path(os.getenv("QIUZHI_DATA_DIR", ".data"))
    ai_provider: str = os.getenv("QIUZHI_AI_PROVIDER", "mock")
    ai_base_url: str = os.getenv("QIUZHI_AI_BASE_URL", "https://api.deepseek.com")
    ai_api_key: str = os.getenv("QIUZHI_AI_API_KEY", "")
    ai_model: str = os.getenv("QIUZHI_AI_MODEL", "deepseek-chat")
    cors_origins_raw: str = os.getenv(
        "QIUZHI_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins_raw.split(",") if item.strip()]


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)

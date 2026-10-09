from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from typing import Any

import httpx

from .config import settings


class AIProvider(ABC):
    @property
    def enabled(self) -> bool:
        return True

    @abstractmethod
    async def complete(self, system: str, user: str) -> str:
        raise NotImplementedError

    async def json(self, system: str, user: str) -> dict[str, Any] | None:
        text = await self.complete(system, user)
        cleaned = text.strip()
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
        try:
            value = json.loads(cleaned)
            return value if isinstance(value, dict) else None
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, re.S)
            if not match:
                return None
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None


class MockAIProvider(AIProvider):
    @property
    def enabled(self) -> bool:
        return False

    async def complete(self, system: str, user: str) -> str:
        return ""


class OpenAICompatibleProvider(AIProvider):
    def __init__(self, base_url: str, api_key: str, model: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model

    async def complete(self, system: str, user: str) -> str:
        if not self.api_key:
            return ""
        url = self.base_url
        if not url.endswith("/v1"):
            url += "/v1"
        url += "/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": self.model,
            "temperature": 0.25,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        return data["choices"][0]["message"]["content"]


def get_ai_provider() -> AIProvider:
    if settings.ai_provider.lower() in {"openai", "compatible", "deepseek", "qwen", "doubao"}:
        return OpenAICompatibleProvider(settings.ai_base_url, settings.ai_api_key, settings.ai_model)
    return MockAIProvider()

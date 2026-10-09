from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from threading import Lock
from typing import Any


class JsonRepository:
    """Small persistent repository for V1.

    The service contract is intentionally generic so it can be replaced by a
    PostgreSQL implementation without changing API or domain services.
    """

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._lock = Lock()
        self._init()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS records (
                    kind TEXT NOT NULL,
                    id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY(kind, id)
                )
                """
            )
            conn.commit()

    def put(self, kind: str, item_id: str, payload: Any) -> None:
        raw = json.dumps(payload, ensure_ascii=False)
        with self._lock, self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO records(kind, id, payload) VALUES (?, ?, ?)",
                (kind, item_id, raw),
            )
            conn.commit()

    def get(self, kind: str, item_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT payload FROM records WHERE kind = ? AND id = ?", (kind, item_id)
            ).fetchone()
        return json.loads(row["payload"]) if row else None

    def list(self, kind: str, limit: int = 20) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT payload FROM records WHERE kind = ? ORDER BY created_at DESC LIMIT ?",
                (kind, limit),
            ).fetchall()
        return [json.loads(row["payload"]) for row in rows]

    def count(self, kind: str) -> int:
        with self._connect() as conn:
            row = conn.execute("SELECT COUNT(*) AS n FROM records WHERE kind = ?", (kind,)).fetchone()
        return int(row["n"])

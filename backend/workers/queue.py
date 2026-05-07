from __future__ import annotations

import json
import os
import importlib
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Literal, Protocol

TaskStatus = Literal["queued", "running", "succeeded", "failed", "cancelled"]


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def utc_after(seconds: float) -> str:
    return (
        datetime.now(UTC) + timedelta(seconds=max(0.0, seconds))
    ).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _sqlite3_module():
    module = importlib.import_module("sqlite3")
    if hasattr(module, "Connection"):
        return module
    import sys

    fake = module
    sys.modules.pop("sqlite3", None)
    try:
        return importlib.import_module("sqlite3")
    finally:
        sys.modules["sqlite3"] = fake


@dataclass(frozen=True)
class QueuedTask:
    id: str
    queue: str
    kind: str
    payload: dict
    status: TaskStatus
    attempts: int
    max_attempts: int
    priority: int
    unique_key: str
    available_at: str
    created_at: str
    updated_at: str
    started_at: str | None = None
    finished_at: str | None = None
    leased_by: str | None = None
    lease_expires_at: str | None = None
    last_error: str | None = None


class QueueBackend(Protocol):
    """Backend-neutral queue contract; Redis can implement this shape later."""

    def enqueue(
        self,
        kind: str,
        payload: dict | None = None,
        *,
        queue: str = "default",
        priority: int = 100,
        max_attempts: int = 3,
        available_in: float = 0,
        unique_key: str = "",
    ) -> QueuedTask:
        ...

    def claim_next(
        self,
        *,
        queues: tuple[str, ...],
        worker_id: str,
        lease_seconds: int,
    ) -> QueuedTask | None:
        ...

    def complete(self, task_id: str) -> None:
        ...

    def fail(self, task_id: str, error: str, *, retry_in: float | None = None) -> None:
        ...

    def cancel(self, task_id: str, reason: str = "") -> bool:
        ...

    def get(self, task_id: str) -> QueuedTask | None:
        ...

    def active(self, *, kind: str | None = None, unique_key: str | None = None) -> list[QueuedTask]:
        ...

    def list_recent(self, *, status: str | None = None, limit: int = 50) -> list[QueuedTask]:
        ...


class SQLiteQueueBackend:
    def __init__(self, path: str | os.PathLike[str]):
        self.path = str(path)
        parent = Path(self.path).parent
        parent.mkdir(parents=True, exist_ok=True)
        self._init()

    def _connect(self):
        sqlite3 = _sqlite3_module()
        conn = sqlite3.connect(self.path, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def _init(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS worker_tasks(
                    id TEXT PRIMARY KEY,
                    queue TEXT NOT NULL DEFAULT 'default',
                    kind TEXT NOT NULL,
                    payload_json TEXT NOT NULL DEFAULT '{}',
                    status TEXT NOT NULL DEFAULT 'queued',
                    attempts INTEGER NOT NULL DEFAULT 0,
                    max_attempts INTEGER NOT NULL DEFAULT 3,
                    priority INTEGER NOT NULL DEFAULT 100,
                    unique_key TEXT NOT NULL DEFAULT '',
                    available_at TEXT NOT NULL,
                    leased_by TEXT,
                    lease_expires_at TEXT,
                    last_error TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    started_at TEXT,
                    finished_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_worker_tasks_claim
                    ON worker_tasks(status, available_at, priority, created_at);
                CREATE INDEX IF NOT EXISTS idx_worker_tasks_active
                    ON worker_tasks(kind, unique_key, status);
                """
            )

    def enqueue(
        self,
        kind: str,
        payload: dict | None = None,
        *,
        queue: str = "default",
        priority: int = 100,
        max_attempts: int = 3,
        available_in: float = 0,
        unique_key: str = "",
    ) -> QueuedTask:
        now = utc_now()
        task_id = uuid.uuid4().hex
        available_at = utc_after(available_in)
        with self._connect() as conn:
            if unique_key:
                existing = conn.execute(
                    """
                    SELECT * FROM worker_tasks
                    WHERE kind=? AND unique_key=? AND status IN ('queued', 'running')
                    ORDER BY created_at ASC LIMIT 1
                    """,
                    (kind, unique_key),
                ).fetchone()
                if existing:
                    return self._row_to_task(existing)
            conn.execute(
                """
                INSERT INTO worker_tasks(
                    id, queue, kind, payload_json, status, attempts, max_attempts,
                    priority, unique_key, available_at, created_at, updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    task_id,
                    queue,
                    kind,
                    json.dumps(payload or {}, sort_keys=True),
                    "queued",
                    0,
                    max(1, int(max_attempts)),
                    int(priority),
                    unique_key,
                    available_at,
                    now,
                    now,
                ),
            )
            row = conn.execute("SELECT * FROM worker_tasks WHERE id=?", (task_id,)).fetchone()
            return self._row_to_task(row)

    def claim_next(
        self,
        *,
        queues: tuple[str, ...] = ("default",),
        worker_id: str,
        lease_seconds: int = 300,
    ) -> QueuedTask | None:
        now = utc_now()
        lease_expires_at = utc_after(lease_seconds)
        placeholders = ",".join("?" for _ in queues)
        params = [*queues, now, now]
        with self._connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute(
                f"""
                SELECT * FROM worker_tasks
                WHERE queue IN ({placeholders})
                  AND (
                    (status='queued' AND available_at <= ?)
                    OR (status='running' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)
                  )
                ORDER BY priority ASC, created_at ASC
                LIMIT 1
                """,
                params,
            ).fetchone()
            if not row:
                conn.commit()
                return None
            attempts = int(row["attempts"] or 0) + 1
            conn.execute(
                """
                UPDATE worker_tasks
                SET status='running',
                    attempts=?,
                    leased_by=?,
                    lease_expires_at=?,
                    started_at=COALESCE(started_at, ?),
                    updated_at=?
                WHERE id=?
                """,
                (attempts, worker_id, lease_expires_at, now, now, row["id"]),
            )
            claimed = conn.execute("SELECT * FROM worker_tasks WHERE id=?", (row["id"],)).fetchone()
            conn.commit()
            return self._row_to_task(claimed)

    def complete(self, task_id: str) -> None:
        now = utc_now()
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE worker_tasks
                SET status='succeeded', finished_at=?, updated_at=?,
                    leased_by=NULL, lease_expires_at=NULL
                WHERE id=?
                """,
                (now, now, task_id),
            )

    def fail(self, task_id: str, error: str, *, retry_in: float | None = None) -> None:
        now = utc_now()
        with self._connect() as conn:
            row = conn.execute("SELECT attempts, max_attempts FROM worker_tasks WHERE id=?", (task_id,)).fetchone()
            if not row:
                return
            attempts = int(row["attempts"] or 0)
            max_attempts = int(row["max_attempts"] or 1)
            retry = retry_in is not None and attempts < max_attempts
            status = "queued" if retry else "failed"
            finished_at = None if retry else now
            conn.execute(
                """
                UPDATE worker_tasks
                SET status=?, available_at=?, finished_at=?, updated_at=?,
                    leased_by=NULL, lease_expires_at=NULL, last_error=?
                WHERE id=?
                """,
                (status, utc_after(retry_in or 0), finished_at, now, str(error)[:4000], task_id),
            )

    def cancel(self, task_id: str, reason: str = "") -> bool:
        now = utc_now()
        with self._connect() as conn:
            cur = conn.execute(
                """
                UPDATE worker_tasks
                SET status='cancelled', finished_at=?, updated_at=?,
                    leased_by=NULL, lease_expires_at=NULL, last_error=?
                WHERE id=? AND status IN ('queued', 'running')
                """,
                (now, now, str(reason)[:4000], task_id),
            )
            return cur.rowcount > 0

    def get(self, task_id: str) -> QueuedTask | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM worker_tasks WHERE id=?", (task_id,)).fetchone()
            return self._row_to_task(row) if row else None

    def active(self, *, kind: str | None = None, unique_key: str | None = None) -> list[QueuedTask]:
        clauses = ["status IN ('queued', 'running')"]
        params: list[str] = []
        if kind is not None:
            clauses.append("kind=?")
            params.append(kind)
        if unique_key is not None:
            clauses.append("unique_key=?")
            params.append(unique_key)
        with self._connect() as conn:
            rows = conn.execute(
                f"SELECT * FROM worker_tasks WHERE {' AND '.join(clauses)} ORDER BY priority ASC, created_at ASC",
                params,
            ).fetchall()
            return [self._row_to_task(row) for row in rows]

    def list_recent(self, *, status: str | None = None, limit: int = 50) -> list[QueuedTask]:
        clauses: list[str] = []
        params: list[str | int] = []
        if status:
            clauses.append("status=?")
            params.append(status)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        params.append(max(1, min(int(limit), 200)))
        with self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT * FROM worker_tasks
                {where}
                ORDER BY updated_at DESC, created_at DESC
                LIMIT ?
                """,
                params,
            ).fetchall()
            return [self._row_to_task(row) for row in rows]

    def _row_to_task(self, row) -> QueuedTask:
        payload_raw = row["payload_json"] or "{}"
        try:
            payload = json.loads(payload_raw)
        except Exception:
            payload = {}
        return QueuedTask(
            id=row["id"],
            queue=row["queue"],
            kind=row["kind"],
            payload=payload if isinstance(payload, dict) else {},
            status=row["status"],
            attempts=int(row["attempts"] or 0),
            max_attempts=int(row["max_attempts"] or 1),
            priority=int(row["priority"] or 100),
            unique_key=row["unique_key"] or "",
            available_at=row["available_at"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            started_at=row["started_at"],
            finished_at=row["finished_at"],
            leased_by=row["leased_by"],
            lease_expires_at=row["lease_expires_at"],
            last_error=row["last_error"],
        )


def default_queue_path() -> str:
    base = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))
    return os.path.join(base, "JustHireMe", "worker.db")

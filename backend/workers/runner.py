from __future__ import annotations

import asyncio
import inspect
import socket
import uuid
from collections.abc import Awaitable, Callable

from logger import get_logger
from workers.queue import QueueBackend, QueuedTask

_log = get_logger(__name__)

TaskHandler = Callable[[QueuedTask], Awaitable[None] | None]


class WorkerService:
    def __init__(
        self,
        backend: QueueBackend,
        handlers: dict[str, TaskHandler] | None = None,
        *,
        queues: tuple[str, ...] = ("default",),
        concurrency: int = 1,
        lease_seconds: int = 900,
        poll_interval: float = 0.5,
        retry_base_seconds: float = 5.0,
        worker_id: str | None = None,
    ):
        self.backend = backend
        self.handlers = dict(handlers or {})
        self.queues = queues
        self.concurrency = max(1, int(concurrency))
        self.lease_seconds = lease_seconds
        self.poll_interval = poll_interval
        self.retry_base_seconds = retry_base_seconds
        self.worker_id = worker_id or f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
        self._stop = asyncio.Event()
        self._tasks: list[asyncio.Task] = []

    def register(self, kind: str, handler: TaskHandler) -> None:
        self.handlers[kind] = handler

    def start(self) -> None:
        if self._tasks:
            return
        self._stop.clear()
        self._tasks = [
            asyncio.create_task(self._run_loop(index), name=f"jhm-worker-{index}")
            for index in range(self.concurrency)
        ]

    async def stop(self) -> None:
        self._stop.set()
        for task in self._tasks:
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks = []

    async def run_once(self) -> bool:
        task = await asyncio.to_thread(
            self.backend.claim_next,
            queues=self.queues,
            worker_id=f"{self.worker_id}-once",
            lease_seconds=self.lease_seconds,
        )
        if task is None:
            return False
        await self._run_task(task)
        return True

    async def _run_loop(self, index: int) -> None:
        worker_id = f"{self.worker_id}-{index}"
        while not self._stop.is_set():
            try:
                task = await asyncio.to_thread(
                    self.backend.claim_next,
                    queues=self.queues,
                    worker_id=worker_id,
                    lease_seconds=self.lease_seconds,
                )
                if task is None:
                    await asyncio.sleep(self.poll_interval)
                    continue
                await self._run_task(task)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                _log.exception("worker loop failed: %s", exc)
                await asyncio.sleep(self.poll_interval)

    async def _run_task(self, task: QueuedTask) -> None:
        handler = self.handlers.get(task.kind)
        if handler is None:
            await asyncio.to_thread(self.backend.fail, task.id, f"No handler registered for {task.kind}")
            return
        try:
            result = handler(task)
            if inspect.isawaitable(result):
                await result
            await asyncio.to_thread(self.backend.complete, task.id)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            delay = self.retry_base_seconds * max(1, task.attempts)
            await asyncio.to_thread(self.backend.fail, task.id, str(exc), retry_in=delay)
            _log.exception("task failed (%s:%s): %s", task.kind, task.id, exc)

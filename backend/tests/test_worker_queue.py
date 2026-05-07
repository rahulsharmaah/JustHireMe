import asyncio
import inspect
import tempfile
import unittest
from pathlib import Path

import pytest


workers = pytest.importorskip(
    "workers",
    reason="TODO(worker-queue): expose SQLiteQueueBackend and WorkerService from backend/workers.",
)


SQLiteQueueBackend = getattr(workers, "SQLiteQueueBackend", None)
WorkerService = getattr(workers, "WorkerService", None)


def _skip_missing(name: str):
    raise unittest.SkipTest(
        f"TODO(worker-queue): backend/workers should expose {name}; update this "
        "test adapter if the final implementation uses a different name."
    )


async def _resolve(value):
    if inspect.isawaitable(value):
        return await value
    return value


def _task_id(task):
    if isinstance(task, dict):
        return task.get("id") or task.get("task_id")
    return getattr(task, "id", None) or getattr(task, "task_id", None)


def _task_type(task):
    if isinstance(task, dict):
        return task.get("type") or task.get("task_type") or task.get("kind")
    return (
        getattr(task, "type", None)
        or getattr(task, "task_type", None)
        or getattr(task, "kind", None)
    )


def _task_payload(task):
    if isinstance(task, dict):
        return task.get("payload")
    return getattr(task, "payload", None)


async def _call_method(target, names, *args, **kwargs):
    for name in names:
        method = getattr(target, name, None)
        if method is None:
            continue
        try:
            return await _resolve(method(*args, **kwargs))
        except TypeError:
            continue
    raise AssertionError(
        "TODO(worker-queue): expected one of these queue/runner methods: "
        + ", ".join(names)
    )


async def _enqueue(queue, task_type, payload):
    # TODO(worker-queue): keep one of these names or update the test adapter:
    # enqueue(task_type, payload), enqueue(type=..., payload=...), or
    # enqueue_task(task_type, payload).
    for name in ("enqueue", "enqueue_task", "put"):
        method = getattr(queue, name, None)
        if method is None:
            continue
        call_shapes = (
            lambda: method(task_type, payload),
            lambda: method(task_type=task_type, payload=payload),
            lambda: method(type=task_type, payload=payload),
            lambda: method(kind=task_type, payload=payload),
        )
        for call in call_shapes:
            try:
                return await _resolve(call())
            except TypeError:
                continue
    raise AssertionError(
        "TODO(worker-queue): expected enqueue/enqueue_task/put to accept a task type and payload."
    )


async def _claim(queue):
    # TODO(worker-queue): keep one of these names or update the test adapter:
    # claim_next(), fetch_next(), claim(), or fetch().
    for name in ("claim_next", "fetch_next", "claim", "fetch"):
        method = getattr(queue, name, None)
        if method is None:
            continue
        call_shapes = (
            lambda: method(worker_id="test-worker"),
            lambda: method(queues=("default",), worker_id="test-worker", lease_seconds=30),
            lambda: method(),
        )
        for call in call_shapes:
            try:
                return await _resolve(call())
            except TypeError:
                continue
    raise AssertionError(
        "TODO(worker-queue): expected claim_next/fetch_next/claim/fetch to claim one task."
    )


async def _complete(queue, task):
    task_id = _task_id(task)
    for name in ("complete", "complete_task", "mark_complete"):
        method = getattr(queue, name, None)
        if method is None:
            continue
        call_shapes = (
            lambda: method(task_id),
            lambda: method(task_id=task_id),
            lambda: method(task),
        )
        for call in call_shapes:
            try:
                return await _resolve(call())
            except TypeError:
                continue
    raise AssertionError(
        "TODO(worker-queue): expected complete/complete_task/mark_complete to accept a task or task id."
    )


async def _fail(queue, task, error):
    task_id = _task_id(task)
    for name in ("fail", "fail_task", "mark_failed"):
        method = getattr(queue, name, None)
        if method is None:
            continue
        call_shapes = (
            lambda: method(task_id, error),
            lambda: method(task_id=task_id, error=error),
            lambda: method(task_id=task_id, message=error),
            lambda: method(task, error),
        )
        for call in call_shapes:
            try:
                return await _resolve(call())
            except TypeError:
                continue
    raise AssertionError(
        "TODO(worker-queue): expected fail/fail_task/mark_failed to accept a task or task id plus an error."
    )


async def _has_active(queue, task_type=None):
    for name in ("active", "has_active_tasks", "has_active_task", "active_task_exists", "is_active"):
        method = getattr(queue, name, None)
        if method is None:
            continue
        call_shapes = (
            lambda: method(kind=task_type),
            lambda: method(task_type=task_type),
            lambda: method(type=task_type),
            lambda: method(task_type),
            lambda: method(),
        )
        for call in call_shapes:
            try:
                return bool(await _resolve(call()))
            except TypeError:
                continue
    raise AssertionError(
        "TODO(worker-queue): expected an active-task detection method on the queue backend."
    )


async def _run_once(worker):
    for name in ("run_once", "run_next", "process_once", "tick"):
        method = getattr(worker, name, None)
        if method is None:
            continue
        try:
            return await _resolve(method())
        except TypeError:
            continue

    run_task = getattr(worker, "_run_task", None)
    backend = getattr(worker, "backend", None) or getattr(worker, "queue", None)
    if run_task is not None and backend is not None:
        # TODO(worker-queue): prefer a public run_once/process_once method when the
        # runner contract settles. This fallback keeps the async-handler behavior
        # covered against the current partial WorkerService.
        task = await _resolve(
            backend.claim_next(
                queues=getattr(worker, "queues", ("default",)),
                worker_id=getattr(worker, "worker_id", "test-worker"),
                lease_seconds=getattr(worker, "lease_seconds", 30),
            )
        )
        if task is not None:
            return await _resolve(run_task(task))
        return None

    raise AssertionError(
        "TODO(worker-queue): expected run_once/run_next/process_once/tick on WorkerService."
    )


def _make_queue(db_path: Path):
    if SQLiteQueueBackend is None:
        _skip_missing("SQLiteQueueBackend")

    call_shapes = (
        lambda: SQLiteQueueBackend(db_path=db_path),
        lambda: SQLiteQueueBackend(path=db_path),
        lambda: SQLiteQueueBackend(database_path=db_path),
        lambda: SQLiteQueueBackend(db_path=str(db_path)),
        lambda: SQLiteQueueBackend(str(db_path)),
    )
    last_error = None
    for call in call_shapes:
        try:
            queue = call()
            break
        except TypeError as exc:
            last_error = exc
    else:
        raise AssertionError(
            "TODO(worker-queue): SQLiteQueueBackend should accept a sqlite file path."
        ) from last_error

    for name in ("initialize", "init_schema", "setup", "create_schema"):
        method = getattr(queue, name, None)
        if method is not None:
            asyncio.run(_resolve(method()))
            break

    return queue


class SQLiteWorkerQueueTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.tmp.name) / "worker-queue.sqlite3"
        self.queue = _make_queue(self.db_path)

    def tearDown(self):
        close = getattr(self.queue, "close", None)
        if close is not None:
            asyncio.run(_resolve(close()))
        self.tmp.cleanup()

    def test_enqueue_claim_complete_uses_real_sqlite_file(self):
        async def scenario():
            first = await _enqueue(self.queue, "apply_job", {"jobId": "job-1"})
            second = await _enqueue(self.queue, "apply_job", {"jobId": "job-2"})
            self.assertIsNotNone(_task_id(first))
            self.assertIsNotNone(_task_id(second))

            claimed = await _claim(self.queue)
            self.assertEqual(_task_type(claimed), "apply_job")
            self.assertEqual(_task_payload(claimed)["jobId"], "job-1")
            self.assertTrue(await _has_active(self.queue, "apply_job"))

            await _complete(self.queue, claimed)
            self.assertTrue(await _has_active(self.queue, "apply_job"))

            claimed = await _claim(self.queue)
            self.assertEqual(_task_payload(claimed)["jobId"], "job-2")
            await _complete(self.queue, claimed)
            self.assertFalse(await _has_active(self.queue, "apply_job"))

        asyncio.run(scenario())
        self.assertTrue(self.db_path.exists(), "queue should persist to the tempfile SQLite database")

    def test_failed_task_is_not_reported_as_active(self):
        async def scenario():
            await _enqueue(self.queue, "sync_profile", {"candidateId": "candidate-1"})
            claimed = await _claim(self.queue)
            self.assertTrue(await _has_active(self.queue, "sync_profile"))

            await _fail(self.queue, claimed, "handler crashed")
            self.assertFalse(await _has_active(self.queue, "sync_profile"))

        asyncio.run(scenario())

    def test_concurrent_claims_get_distinct_tasks(self):
        async def scenario():
            first = await _enqueue(self.queue, "apply_job", {"jobId": "job-1"})
            second = await _enqueue(self.queue, "apply_job", {"jobId": "job-2"})

            claimed = await asyncio.gather(
                asyncio.to_thread(self.queue.claim_next, queues=("default",), worker_id="worker-1", lease_seconds=30),
                asyncio.to_thread(self.queue.claim_next, queues=("default",), worker_id="worker-2", lease_seconds=30),
            )

            claimed_ids = {_task_id(task) for task in claimed if task is not None}
            self.assertEqual(claimed_ids, {_task_id(first), _task_id(second)})

        asyncio.run(scenario())


@pytest.mark.skipif(WorkerService is None, reason="TODO(worker-queue): expose WorkerService.")
def test_worker_service_executes_async_handler_and_completes_task(tmp_path):
    queue = _make_queue(tmp_path / "runner.sqlite3")
    handled = []

    async def handler(task):
        handled.append(_task_payload(task)["jobId"])

    # TODO(worker-queue): if the final runner constructor differs, update only this
    # adapter. The contract is a queue-backed worker with async task handlers.
    call_shapes = (
        lambda: WorkerService(queue, {"apply_job": handler}),
        lambda: WorkerService(queue=queue, handlers={"apply_job": handler}),
        lambda: WorkerService(queue_backend=queue, handlers={"apply_job": handler}),
    )
    last_error = None
    for call in call_shapes:
        try:
            worker = call()
            break
        except TypeError as exc:
            last_error = exc
    else:
        raise AssertionError(
            "TODO(worker-queue): WorkerService should accept a queue backend and handler mapping."
        ) from last_error

    async def scenario():
        await _enqueue(queue, "apply_job", {"jobId": "job-async"})
        await _run_once(worker)
        assert handled == ["job-async"]
        assert not await _has_active(queue, "apply_job")

    asyncio.run(scenario())

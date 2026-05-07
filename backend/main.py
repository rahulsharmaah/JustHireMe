import asyncio
import csv
import io
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import sys
import tempfile
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from knowledge.service import KnowledgeService
from pydantic import BaseModel, ConfigDict, Field, model_validator
from logger import get_logger
from workers import QueuedTask, SQLiteQueueBackend, WorkerService
from workers.queue import default_queue_path

_log = get_logger(__name__)


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


_UP   = time.monotonic()
_sched = AsyncIOScheduler()
_API_TOKEN: str = os.environ.get("JHM_TOKEN") or secrets.token_hex(32)
_LOCAL_ORIGIN_RE = r"^(tauri://localhost|https?://(localhost|127\.0\.0\.1|tauri\.localhost|\[::1\])(?::\d+)?)$"
_bearer = HTTPBearer(auto_error=False)


async def _require_ws_token(ws: WebSocket) -> bool:
    """Auth guard for WebSocket routes; token via query param or header."""
    token = ws.query_params.get("token", "")
    if token == _API_TOKEN:
        return True
    auth = ws.headers.get("authorization", "")
    if auth.startswith("Bearer ") and auth[7:] == _API_TOKEN:
        return True
    await ws.close(code=4401, reason="invalid token")
    return False


LeadStatus = Literal[
    "discovered", "evaluating", "tailoring", "approved", "applied",
    "interviewing", "rejected", "accepted", "discarded",
    "matched", "bidding", "proposal_sent", "awarded", "completed",
]


class StrictBody(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StatusBody(StrictBody):
    status: LeadStatus


class FeedbackBody(StrictBody):
    feedback: Literal[
        "good", "trash", "too_generic", "not_ai",
        "already_contacted", "relevant", "not_relevant", "duplicate",
        "low_quality", "incorrect_category",
    ]
    note: str = Field(default="", max_length=1000)


class FollowupBody(StrictBody):
    days: int = Field(default=5, ge=1, le=60)


class ManualLeadBody(StrictBody):
    text: str = Field(default="", max_length=20000)
    url: str = Field(default="", max_length=2000)
    kind: Literal["job"] = "job"


class TemplateBody(StrictBody):
    template: str = Field(default="", max_length=20000)


class CandidateBody(StrictBody):
    n: str = Field(default="", max_length=160)
    s: str = Field(default="", max_length=4000)


class SkillBody(StrictBody):
    id: str | None = Field(default=None, max_length=160)
    n: str = Field(default="", max_length=160)
    cat: str = Field(default="general", max_length=80)


class ExperienceBody(StrictBody):
    id: str | None = Field(default=None, max_length=160)
    role: str = Field(default="", max_length=180)
    co: str = Field(default="", max_length=180)
    period: str = Field(default="", max_length=120)
    d: str = Field(default="", max_length=8000)


class ProjectBody(StrictBody):
    id: str | None = Field(default=None, max_length=160)
    title: str = Field(default="", max_length=220)
    stack: str = Field(default="", max_length=2000)
    repo: str = Field(default="", max_length=1000)
    impact: str = Field(default="", max_length=8000)


class SettingsBody(BaseModel):
    model_config = ConfigDict(extra="allow")

    @model_validator(mode="after")
    def _validate_extra_settings(self):
        for key, value in (self.model_extra or {}).items():
            if len(key) > 120 or any(not (ch.isalnum() or ch in "_.-") for ch in key):
                raise ValueError(f"Invalid settings key: {key}")
            if value is not None and not isinstance(value, (str, bool, int, float)):
                raise ValueError(f"Invalid value for settings key: {key}")
        return self


class KnowledgeReviewBody(StrictBody):
    path: str = Field(default="", max_length=400)
    page_id: str = Field(default="", max_length=200)
    action: Literal["promote", "archive", "reset"]


class ApplicationAnswersBody(StrictBody):
    answers: list[dict] = Field(default_factory=list)


class WorkerTaskPayload(BaseModel):
    id: str
    queue: str
    kind: str
    payload: dict
    status: str
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


def _agent_event_action(msg: dict) -> str:
    event = str(msg.get("event") or "agent").strip() or "agent"
    detail = str(msg.get("msg") or "").strip()
    return f"{event}: {detail}" if detail else event


class _CM:
    def __init__(self):
        self._ws: list[WebSocket] = []

    async def add(self, ws: WebSocket):
        self._ws.append(ws)

    def remove(self, ws: WebSocket):
        self._ws = [w for w in self._ws if w != ws]

    async def broadcast(self, msg: dict):
        if msg.get("type") == "agent":
            try:
                from db.client import record_event
                await asyncio.to_thread(record_event, msg.get("job_id") or "__system__", _agent_event_action(msg))
            except Exception:
                pass
        dead = []
        for w in self._ws:
            try:
                await w.send_text(json.dumps(msg))
            except Exception:
                dead.append(w)
        for w in dead:
            self._ws.remove(w)


cm = _CM()


def _spawn_task(coro, label: str):
    task = asyncio.create_task(coro)

    def _done(t: asyncio.Task):
        try:
            t.result()
        except Exception as exc:
            _log.exception("background task failed (%s): %s", label, exc)

    task.add_done_callback(_done)
    return task


_REPO_ROOT = Path(__file__).resolve().parents[1]
_knowledge = KnowledgeService(_REPO_ROOT)

DEFAULT_JOB_TARGETS = [
    "hn-hiring",
    "https://remoteok.com/api",
    "https://remotive.com/api/remote-jobs?search=junior",
    "https://remotive.com/api/remote-jobs?search=python",
    "https://remotive.com/api/remote-jobs?search=react",
    "https://remotive.com/api/remote-jobs?search=ai",
    "https://jobicy.com/api/v2/remote-jobs?count=50&tag=python",
    "https://jobicy.com/api/v2/remote-jobs?count=50&tag=react",
    "https://jobicy.com/feed/newjobs",
    "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
    "site:boards.greenhouse.io",
    "site:jobs.lever.co",
    "site:jobs.ashbyhq.com",
    "site:apply.workable.com",
    "site:wellfound.com/jobs",
    "site:linkedin.com/jobs",
    "site:indeed.com/jobs",
    "site:naukri.com",
    "site:instahyre.com",
    "site:cutshort.io/jobs",
]

INDIA_JOB_TARGETS = [
    "site:wellfound.com/jobs India startup",
    "site:cutshort.io/jobs software engineer India startup",
    "site:instahyre.com software engineer India",
    "site:naukri.com software engineer startup India",
    "site:linkedin.com/jobs software engineer India startup",
    "site:indeed.com/jobs software engineer India startup",
    "site:boards.greenhouse.io India",
    "site:jobs.lever.co India",
    "site:jobs.ashbyhq.com India",
    "site:apply.workable.com India",
]

_BLOCKED_JOB_TARGET_MARKERS = (
    "freelance", "upwork", "freelancer.com", "fiverr", "contra.com",
    "peopleperhour", "guru.com", "truelancer", "codementor", "toptal",
)


def _split_configured_targets(raw: str) -> list[str]:
    targets: list[str] = []
    for line in str(raw or "").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        for part in line.split(","):
            target = part.strip()
            if target and not target.startswith("#"):
                targets.append(target)
    return targets


def _dedupe_targets(targets: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for target in targets:
        key = target.strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(target.strip())
    return out


def _job_market_focus(value) -> str:
    focus = str(value or "global").strip().lower()
    return "india" if focus in {"india", "in", "indian", "indian_startups"} else "global"


def _is_hn_target(target: str) -> bool:
    lower = target.lower()
    return lower.startswith("hn:") or "hn-hiring" in lower or "hackernews" in lower or "news.ycombinator.com" in lower


def _job_targets(raw: str, market_focus: str = "global") -> list[str]:
    """Return configured job discovery targets, excluding freelance marketplaces."""
    focus = _job_market_focus(market_focus)
    targets = _split_configured_targets(raw)
    if not targets:
        return list(INDIA_JOB_TARGETS if focus == "india" else DEFAULT_JOB_TARGETS)

    filtered: list[str] = []
    for target in targets:
        lower = target.lower()
        if any(marker in lower for marker in _BLOCKED_JOB_TARGET_MARKERS):
            continue
        filtered.append(target)

    if focus == "global" and filtered and all(_is_hn_target(target) for target in filtered):
        filtered.extend(target for target in DEFAULT_JOB_TARGETS if not _is_hn_target(target))

    if focus == "india":
        india_markers = (
            "india", "indian", "bangalore", "bengaluru", "mumbai", "delhi",
            "gurgaon", "gurugram", "hyderabad", "pune", "chennai", "noida",
            "cutshort", "instahyre", "naukri",
        )
        filtered = [target for target in filtered if any(marker in target.lower() for marker in india_markers)]

    fallback = INDIA_JOB_TARGETS if focus == "india" else DEFAULT_JOB_TARGETS
    return _dedupe_targets(filtered) or list(fallback)


def _has_x_token(cfg: dict) -> bool:
    return bool(cfg.get("x_bearer_token") or os.environ.get("X_BEARER_TOKEN") or os.environ.get("TWITTER_BEARER_TOKEN"))


def _int_cfg(cfg: dict, key: str, default: int, min_value: int, max_value: int) -> int:
    try:
        value = int(str(cfg.get(key, "") or "").strip())
    except Exception:
        value = default
    return max(min_value, min(value, max_value))


def _truthy(value) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _free_sources_enabled(cfg: dict) -> bool:
    return _truthy(cfg.get("free_sources_enabled", "false"))


async def _broadcast_x_source_errors(errors: list[str]):
    if not errors:
        return
    for msg in errors[:3]:
        await cm.broadcast({"type": "agent", "event": "x_source_error", "msg": f"X source skipped: {msg}"})
    if len(errors) > 3:
        await cm.broadcast({"type": "agent", "event": "x_source_error", "msg": f"{len(errors) - 3} more X queries were skipped"})


async def _run_x_signal_scan(cfg: dict, kind_filter: str) -> list[dict]:
    if not _has_x_token(cfg):
        return []

    from agents import x_scout

    kind_filter = "job"
    label = "job leads"
    await cm.broadcast({"type": "agent", "event": "x_scout_start", "msg": f"Scanning X for {label}..."})
    leads = await asyncio.to_thread(
        x_scout.run,
        bearer_token=cfg.get("x_bearer_token") or None,
        raw_queries=cfg.get("x_search_queries", ""),
        raw_watchlist=cfg.get("x_watchlist", ""),
        kind_filter=kind_filter,
        max_requests=_int_cfg(cfg, "x_max_requests_per_scan", 5, 1, 50),
        max_results=_int_cfg(cfg, "x_max_results_per_query", 50, 10, 100),
        min_signal_score=_int_cfg(cfg, "x_min_signal_score", 55, 0, 100),
    )
    await cm.broadcast({"type": "agent", "event": "x_scout_done", "msg": f"X scout - {len(leads)} {label} found"})
    usage = getattr(x_scout, "LAST_USAGE", {}) or {}
    if usage.get("executed_queries"):
        await cm.broadcast({
            "type": "agent",
            "event": "x_usage",
            "msg": f"X usage - {usage.get('executed_queries', 0)} requests, {usage.get('tweets_seen', 0)} posts checked, {usage.get('filtered', 0)} filtered",
        })
    if not leads:
        await _broadcast_x_source_errors(getattr(x_scout, "LAST_ERRORS", []))
    hot_threshold = _int_cfg(cfg, "x_hot_lead_threshold", 80, 1, 100)
    notify_hot = _truthy(cfg.get("x_enable_notifications"))
    for lead in leads:
        await cm.broadcast({"type": "LEAD_UPDATED", "data": lead})
        if (lead.get("signal_score") or 0) >= hot_threshold:
            await cm.broadcast({"type": "agent", "event": "x_hot_lead", "msg": f"Hot X lead: {lead.get('title', '')[:90]}"})
            if notify_hot:
                await cm.broadcast({"type": "HOT_X_LEAD", "data": lead})
    return leads

# ── Scan stop flag ─────────────────────────────────────────────────────────────
# Set by /api/v1/scan/stop; cleared when a new scan is accepted.
async def _run_free_source_scan(cfg: dict, kind_filter: str | None = None) -> list[dict]:
    if not _free_sources_enabled(cfg):
        return []

    from agents import free_scout

    kind_filter = "job"
    label = "job leads"
    await cm.broadcast({"type": "agent", "event": "free_scout_start", "msg": f"Scanning free sources for {label}..."})
    leads = await asyncio.to_thread(
        free_scout.run,
        raw_targets=cfg.get("free_source_targets", ""),
        raw_watchlist=cfg.get("company_watchlist", ""),
        kind_filter=kind_filter,
        max_requests=_int_cfg(cfg, "free_source_max_requests", 20, 1, 80),
        min_signal_score=_int_cfg(cfg, "free_source_min_signal_score", 60, 0, 100),
    )
    usage = getattr(free_scout, "LAST_USAGE", {}) or {}
    await cm.broadcast({
        "type": "agent",
        "event": "free_scout_done",
        "msg": f"Free scout - {len(leads)} {label} found ({usage.get('executed', 0)} sources checked)",
    })
    if not leads:
        for msg in (getattr(free_scout, "LAST_ERRORS", []) or [])[:4]:
            await cm.broadcast({"type": "agent", "event": "free_source_error", "msg": f"Free source skipped: {msg}"})
    for lead in leads:
        await cm.broadcast({"type": "LEAD_UPDATED", "data": lead})
    return leads


_scan_stop = asyncio.Event()
_scan_task: asyncio.Task | None = None
_reevaluate_stop = asyncio.Event()
_reevaluate_task: asyncio.Task | None = None
_worker_queue: SQLiteQueueBackend | None = None
_worker_service: WorkerService | None = None

_REEVALUATION_STATUS_LOCKS = {"approved", "applied", "interviewing", "rejected", "accepted", "discarded"}


def _should_preserve_job_status(status: str) -> bool:
    return status in _REEVALUATION_STATUS_LOCKS


def _workers_enabled() -> bool:
    return os.environ.get("JHM_WORKERS", "sqlite").strip().lower() not in {"0", "false", "off", "none"}


def _queue_task(
    kind: str,
    payload: dict | None = None,
    *,
    unique_key: str = "",
    priority: int = 100,
    max_attempts: int = 1,
):
    if _worker_queue is None:
        return None
    return _worker_queue.enqueue(
        kind,
        payload or {},
        unique_key=unique_key,
        priority=priority,
        max_attempts=max_attempts,
    )


def _has_active_worker_task(kind: str, unique_key: str | None = None) -> bool:
    return bool(_worker_queue and _worker_queue.active(kind=kind, unique_key=unique_key))


def _task_payload(task: QueuedTask) -> dict:
    return {
        "id": task.id,
        "queue": task.queue,
        "kind": task.kind,
        "payload": task.payload,
        "status": task.status,
        "attempts": task.attempts,
        "max_attempts": task.max_attempts,
        "priority": task.priority,
        "unique_key": task.unique_key,
        "available_at": task.available_at,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "started_at": task.started_at,
        "finished_at": task.finished_at,
        "leased_by": task.leased_by,
        "lease_expires_at": task.lease_expires_at,
        "last_error": task.last_error,
    }


async def _handle_worker_task(task: QueuedTask):
    job_id = str(task.payload.get("job_id") or "")
    await cm.broadcast({
        "type": "agent",
        "event": "worker_start",
        "job_id": job_id,
        "msg": f"Worker started {task.kind}",
    })
    if task.kind == "lead.generate":
        await _generate_one(job_id)
    elif task.kind == "lead.pipeline":
        await _run_pipeline_for_lead(job_id)
    elif task.kind == "lead.fire":
        await _actuate(job_id)
    elif task.kind == "scan.run":
        await _run_scan_task()
    elif task.kind == "leads.reevaluate":
        await _run_reevaluate_jobs_task()
    else:
        raise ValueError(f"Unknown worker task kind: {task.kind}")
    await cm.broadcast({
        "type": "agent",
        "event": "worker_done",
        "job_id": job_id,
        "msg": f"Worker finished {task.kind}",
    })


def _start_worker_service():
    global _worker_queue, _worker_service
    if not _workers_enabled():
        _log.info("worker service disabled")
        return
    try:
        _worker_queue = SQLiteQueueBackend(default_queue_path())
        _worker_service = WorkerService(
            _worker_queue,
            {
                "lead.generate": _handle_worker_task,
                "lead.pipeline": _handle_worker_task,
                "lead.fire": _handle_worker_task,
                "scan.run": _handle_worker_task,
                "leads.reevaluate": _handle_worker_task,
            },
            concurrency=_int_cfg(os.environ, "JHM_WORKER_CONCURRENCY", 1, 1, 8),
        )
        _worker_service.start()
        _log.info("SQLite worker service started.")
    except Exception as exc:
        _worker_queue = None
        _worker_service = None
        _log.warning("worker service unavailable; using in-process tasks: %s", exc)


def _job_eval_document(lead: dict) -> str:
    desc = (lead.get("description") or "").strip()
    return (
        f"Job Title: {lead.get('title','')}\n"
        f"Company: {lead.get('company','')}\n"
        f"URL: {lead.get('url','')}\n"
        + (f"Description: {desc}" if desc else "")
    )


async def _ghost_tick():
    from db.client import get_setting, get_settings, get_discovered_leads, update_lead_score, get_profile, save_asset_package
    from agents.scout import run as _scout
    from agents.evaluator import score as _score
    from agents.generator import run_package as _gen

    cfg = get_settings()
    if get_setting("ghost_mode") != "true":
        return

    boards = _job_targets(cfg.get("job_boards", ""), cfg.get("job_market_focus", "global"))
    has_x = _has_x_token(cfg)
    has_free = _free_sources_enabled(cfg)
    profile = None
    if has_x:
        profile = await asyncio.to_thread(get_profile)
        await _run_x_signal_scan(cfg, "job")
    if has_free:
        await _run_free_source_scan(cfg, "job")
    if not boards and not has_x and not has_free:
        await cm.broadcast({"type": "agent", "event": "ghost_warn", "msg": "Ghost Mode: no job boards configured — skipping"})
        return

    # ── Step 1: Scout ──────────────────────────────────────────────
    await cm.broadcast({"type": "agent", "event": "ghost_scout", "msg": "Ghost Mode: scout cycle starting"})
    try:
        leads = await asyncio.to_thread(
            _scout,
            urls=boards,
            apify_token=cfg.get("apify_token") or None,
            apify_actor=cfg.get("apify_actor") or None,
        )
        await cm.broadcast({"type": "agent", "event": "ghost_scout",
                            "msg": f"Ghost scout complete — {len(leads)} new leads found"})
    except Exception as exc:
        await cm.broadcast({"type": "agent", "event": "ghost_error", "msg": f"Scout failed: {exc}"})
        return

    # ── Step 2: Evaluate ───────────────────────────────────────────
    profile = await asyncio.to_thread(get_profile)
    discovered = await asyncio.to_thread(get_discovered_leads)
    await cm.broadcast({"type": "agent", "event": "ghost_eval",
                        "msg": f"Ghost Mode: evaluating {len(discovered)} leads"})

    approved = []
    for lead in discovered:
        try:
            jd = _job_eval_document(lead)
            result = await asyncio.to_thread(_score, jd, profile)
            await asyncio.to_thread(
                update_lead_score,
                lead["job_id"], result["score"], result["reason"],
                result.get("match_points", []), result.get("gaps", []),
            )
            await cm.broadcast({"type": "LEAD_UPDATED", "data": {**lead, **result}})
            if result["score"] >= 85:
                approved.append({**lead, **result})
                await cm.broadcast({"type": "agent", "event": "ghost_approved",
                                    "msg": f"Approved: {lead.get('title','')} @ {lead.get('company','')} [{result['score']}/100]"})
        except Exception as exc:
            await cm.broadcast({"type": "agent", "event": "ghost_error",
                                "msg": f"Eval failed for {lead.get('title','?')}: {exc}"})

    await cm.broadcast({"type": "agent", "event": "ghost_eval",
                        "msg": f"Evaluation done — {len(approved)}/{len(discovered)} approved"})

    if not approved:
        await cm.broadcast({"type": "agent", "event": "ghost_done", "msg": "Ghost Mode: no approved leads this cycle"})
        return

    # ── Step 3: Generate (always) ──────────────────────────────────
    await cm.broadcast({"type": "agent", "event": "ghost_gen",
                        "msg": f"Ghost Mode: generating assets for {len(approved)} leads"})
    generated = []
    for lead in approved:
        try:
            package = await asyncio.to_thread(_gen, lead)
            await asyncio.to_thread(
                save_asset_package,
                lead["job_id"],
                package["resume"],
                package["cover_letter"],
                package.get("selected_projects", []),
                package.get("keyword_coverage", {}),
            )
            generated.append({
                **lead,
                "asset": package["resume"],
                "resume_asset": package["resume"],
                "cover_letter_asset": package["cover_letter"],
                "selected_projects": package.get("selected_projects", []),
                "keyword_coverage": package.get("keyword_coverage", {}),
            })
            await cm.broadcast({"type": "agent", "event": "ghost_gen",
                                "msg": f"Generated resume and cover letter for {lead.get('title','?')}"})
        except Exception as exc:
            await cm.broadcast({"type": "agent", "event": "ghost_error",
                                "msg": f"Generation failed for {lead.get('title','?')}: {exc}"})

    # ── Step 4: Actuate only if auto_apply is enabled ──────────────
    if get_setting("auto_apply", "false") != "true":
        await cm.broadcast({"type": "agent", "event": "ghost_done",
                            "msg": f"Ghost cycle complete — {len(generated)} leads ready. Auto-apply is OFF — waiting for manual approval in Sniper view."})
        return

    from agents.actuator import run as _act
    from db.client import get_lead_for_fire, mark_applied
    await cm.broadcast({"type": "agent", "event": "ghost_apply",
                        "msg": f"Ghost Mode: auto-applying to {len(generated)} leads"})
    for item in generated:
        try:
            lead, asset = await asyncio.to_thread(get_lead_for_fire, item["job_id"])
            _status, detail = _fire_blocker(lead, asset)
            if detail:
                await cm.broadcast({"type": "agent", "event": "ghost_error",
                                    "msg": f"Submission blocked: {item.get('title','?')} - {detail}"})
                continue

            ok = await asyncio.to_thread(_act, lead, asset)
            if ok is True:
                await asyncio.to_thread(mark_applied, item["job_id"])
                await cm.broadcast({"type": "agent", "event": "ghost_applied",
                                    "msg": f"Applied: {item.get('title','?')} @ {item.get('company','?')}"})
            else:
                await cm.broadcast({"type": "agent", "event": "ghost_error",
                                    "msg": f"Submission failed: {item.get('title','?')}"})
        except Exception as exc:
            await cm.broadcast({"type": "agent", "event": "ghost_error",
                                "msg": f"Actuator error for {item.get('title','?')}: {exc}"})

    await cm.broadcast({"type": "agent", "event": "ghost_done", "msg": "Ghost cycle complete."})


@asynccontextmanager
async def lifespan(app: FastAPI):
    _sched.add_job(_ghost_tick, "interval", hours=6, id="ghost")
    _sched.start()
    _start_worker_service()
    _log.info("FastAPI live.")
    yield
    if _worker_service is not None:
        await _worker_service.stop()
    _sched.shutdown(wait=False)
    _log.info("FastAPI shutdown.")


app = FastAPI(
    title="JustHireMe",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=_LOCAL_ORIGIN_RE,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def require_http_token(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    if request.url.path != "/health":
        creds = await _bearer(request)
        if creds is None or creds.credentials != _API_TOKEN:
            return JSONResponse(
                {"detail": "invalid token"},
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
    return await call_next(request)


@app.get("/health", dependencies=[])
async def health():
    return {
        "status": "alive",
        "uptime_seconds": round(time.monotonic() - _UP, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "log_level": os.environ.get("JHM_LOG_LEVEL", "INFO"),
    }


def _annotate_job_lead(lead: dict) -> dict:
    from agents.scout import classify_job_seniority

    meta = dict(lead.get("source_meta") or {})
    level = str(meta.get("seniority_level") or lead.get("seniority_level") or "").strip().lower()
    if level not in {"fresher", "junior", "mid", "senior", "unknown"}:
        level = classify_job_seniority(lead)
    meta["seniority_level"] = level
    meta["is_beginner"] = level in {"fresher", "junior"}
    return {**lead, "source_meta": meta, "seniority_level": level}


@app.get("/api/v1/leads")
async def leads(beginner_only: bool = False, seniority: str | None = None):
    from db.client import get_all_leads

    jobs = [_annotate_job_lead(lead) for lead in get_all_leads() if (lead.get("kind") or "job") == "job"]
    requested = str(seniority or "").strip().lower()
    if beginner_only or requested == "beginner":
        return [lead for lead in jobs if lead.get("seniority_level") in {"fresher", "junior"}]
    if requested in {"fresher", "junior", "mid", "senior", "unknown"}:
        return [lead for lead in jobs if lead.get("seniority_level") == requested]
    return jobs


@app.get("/api/v1/leads/export.csv")
async def export_leads_csv():
    from db.client import get_all_leads

    rows = get_all_leads()
    fields = [
        "job_id", "title", "company", "url", "platform", "status",
        "score", "signal_score", "seniority_level", "location",
        "reason", "created_at",
    ]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jhm_pipeline.csv"},
    )


def _versioned_assets(job_id: str, base_dir: str) -> list[dict]:
    versions: dict[int, dict] = {}
    patterns = [
        ("resume", re.compile(rf"^{re.escape(job_id)}_v(\d+)\.pdf$")),
        ("cover_letter", re.compile(rf"^{re.escape(job_id)}_cl_v(\d+)\.pdf$")),
    ]
    try:
        names = os.listdir(base_dir)
    except Exception:
        return []
    for name in names:
        full = os.path.join(base_dir, name)
        if not os.path.isfile(full):
            continue
        for key, pattern in patterns:
            match = pattern.match(name)
            if match:
                version = int(match.group(1))
                versions.setdefault(version, {"version": version})[key] = full
    return [versions[v] for v in sorted(versions, reverse=True)]


@app.get("/api/v1/leads/{job_id}/versions")
async def get_lead_versions(job_id: str):
    from db.client import get_lead_by_id

    lead = get_lead_by_id(job_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    paths = [
        lead.get("resume_asset") or lead.get("asset") or "",
        lead.get("cover_letter_asset") or "",
    ]
    base_dir = next((os.path.dirname(path) for path in paths if path), None)
    if not base_dir:
        base_dir = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "JustHireMe", "assets")
    return _versioned_assets(job_id, base_dir)


@app.get("/api/v1/leads/{job_id}")
async def get_lead(job_id: str):
    from db.client import get_lead_by_id
    from fastapi import HTTPException
    lead = get_lead_by_id(job_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _annotate_job_lead(lead) if (lead.get("kind") or "job") == "job" else lead


@app.get("/api/v1/leads/{job_id}/answers")
async def get_lead_answers(job_id: str):
    from db.client import get_lead_by_id

    lead = get_lead_by_id(job_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {
        "job_id": job_id,
        "answers": _lead_application_answers(lead),
        "generation_artifacts": (lead.get("source_meta") or {}).get("generation_artifacts", {}),
    }


@app.put("/api/v1/leads/{job_id}/answers")
async def update_lead_answers(job_id: str, body: ApplicationAnswersBody):
    from db.client import get_lead_by_id, save_application_answers

    lead = get_lead_by_id(job_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    cleaned: list[dict] = []
    for item in body.answers:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or "").strip()
        label = str(item.get("label") or key.replace("_", " ").title()).strip()
        question = str(item.get("question") or label).strip()
        answer = str(item.get("answer") or "").strip()
        short_answer = str(item.get("short_answer") or answer).strip()
        long_answer = str(item.get("long_answer") or answer).strip()
        if not key or not answer:
            continue
        cleaned.append(
            {
                "key": key[:80],
                "label": label[:120],
                "question": question[:240],
                "answer": answer[:2400],
                "short_answer": short_answer[:1200],
                "long_answer": long_answer[:3200],
            }
        )
    await asyncio.to_thread(save_application_answers, job_id, cleaned)
    return {"job_id": job_id, "answers": cleaned}


@app.delete("/api/v1/leads/{job_id}")
async def delete_lead_endpoint(job_id: str):
    from db.client import delete_lead
    try:
        delete_lead(job_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="lead not found")
    return {"ok": True}


@app.put("/api/v1/leads/{job_id}/status")
async def update_status(job_id: str, body: StatusBody):
    from db.client import update_lead_status
    try:
        update_lead_status(job_id, body.status)
        await cm.broadcast({"type": "LEAD_UPDATED", "data": {"job_id": job_id, "status": body.status}})
        return {"ok": True}
    except LookupError:
        raise HTTPException(status_code=404, detail="lead not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/v1/leads/{job_id}/feedback")
async def update_feedback(job_id: str, body: FeedbackBody):
    from db.client import save_lead_feedback
    try:
        lead = save_lead_feedback(job_id, body.feedback, body.note)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await cm.broadcast({"type": "LEAD_UPDATED", "data": lead})
    return lead


@app.put("/api/v1/leads/{job_id}/followup")
async def update_followup(job_id: str, body: FollowupBody):
    from db.client import update_lead_followup
    lead = update_lead_followup(job_id, body.days)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await cm.broadcast({"type": "LEAD_UPDATED", "data": lead})
    return lead


@app.post("/api/v1/leads/manual")
async def create_manual_lead(body: ManualLeadBody):
    if not body.text.strip() and not body.url.strip():
        raise HTTPException(status_code=400, detail="Paste lead text or a URL")
    from agents.lead_intel import manual_lead_from_text
    from agents.quality_gate import attach_quality_metadata, evaluate_lead_quality
    from db.client import find_duplicate_lead, get_lead_by_id, rank_lead_by_feedback, save_lead, update_lead_status

    lead = rank_lead_by_feedback(manual_lead_from_text(body.text, body.url, "job"))
    if lead.get("kind") != "job":
        raise HTTPException(status_code=422, detail="Only job leads are accepted right now")
    lead = _annotate_job_lead(lead)
    duplicate = find_duplicate_lead(lead.get("url", ""), lead.get("title", ""), lead.get("company", ""))
    if duplicate:
        meta = duplicate.get("source_meta") if isinstance(duplicate.get("source_meta"), dict) else {}
        duplicate["source_meta"] = {
            **meta,
            "duplicate_detected": True,
            "duplicate_reason": "Same URL or company/title already exists in active leads",
        }
        await cm.broadcast({"type": "LEAD_UPDATED", "data": duplicate})
        return duplicate

    quality = evaluate_lead_quality(lead, min_quality=45, target_level="any", max_age_days=30)
    lead = attach_quality_metadata(lead, quality)
    save_lead(
        lead["job_id"],
        lead["title"],
        lead["company"],
        lead["url"],
        lead["platform"],
        lead["description"],
        kind=lead["kind"],
        budget=lead["budget"],
        signal_score=lead["signal_score"],
        signal_reason=lead["signal_reason"],
        signal_tags=lead["signal_tags"],
        outreach_reply=lead["outreach_reply"],
        outreach_dm=lead["outreach_dm"],
        outreach_email=lead.get("outreach_email", ""),
        proposal_draft=lead.get("proposal_draft", ""),
        fit_bullets=lead.get("fit_bullets", []),
        followup_sequence=lead.get("followup_sequence", []),
        proof_snippet=lead.get("proof_snippet", ""),
        tech_stack=lead.get("tech_stack", []),
        location=lead.get("location", ""),
        urgency=lead.get("urgency", ""),
        base_signal_score=lead.get("base_signal_score"),
        learning_delta=lead.get("learning_delta"),
        learning_reason=lead.get("learning_reason", ""),
        source_meta=lead["source_meta"],
    )
    if not quality.get("accepted"):
        try:
            update_lead_status(lead["job_id"], "discarded")
        except Exception:
            pass
    saved = get_lead_by_id(lead["job_id"]) or lead
    await cm.broadcast({"type": "LEAD_UPDATED", "data": saved})
    return saved


@app.get("/api/v1/followups/due")
async def due_followups(limit: int = 25):
    from db.client import get_due_followups
    return get_due_followups(limit)


@app.get("/api/v1/tasks")
async def worker_tasks(limit: int = 30, status: str = ""):
    if _worker_queue is None:
        return {
            "enabled": False,
            "concurrency": 0,
            "active": [],
            "recent": [],
            "counts": {"queued": 0, "running": 0, "succeeded": 0, "failed": 0, "cancelled": 0},
        }
    clean_limit = max(1, min(int(limit), 100))
    clean_status = status.strip().lower()
    allowed = {"", "queued", "running", "succeeded", "failed", "cancelled"}
    if clean_status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid task status filter")
    active = _worker_queue.active()
    recent = _worker_queue.list_recent(status=clean_status or None, limit=clean_limit)
    all_recent = _worker_queue.list_recent(limit=200)
    counts = {key: 0 for key in ["queued", "running", "succeeded", "failed", "cancelled"]}
    for task in all_recent:
        if task.status in counts:
            counts[task.status] += 1
    return {
        "enabled": True,
        "concurrency": _worker_service.concurrency if _worker_service else 0,
        "active": [_task_payload(task) for task in active],
        "recent": [_task_payload(task) for task in recent],
        "counts": counts,
    }


@app.get("/api/v1/tasks/{task_id}", response_model=WorkerTaskPayload)
async def worker_task_detail(task_id: str):
    if _worker_queue is None:
        raise HTTPException(status_code=404, detail="Worker queue not enabled")
    task = _worker_queue.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_payload(task)


@app.post("/api/v1/leads/{job_id}/generate")
async def generate_for_lead(job_id: str):
    task = _queue_task(
        "lead.generate",
        {"job_id": job_id},
        unique_key=f"lead.generate:{job_id}",
        priority=20,
    )
    if task is not None:
        await cm.broadcast({"type": "agent", "event": "gen_queued", "job_id": job_id, "msg": f"Generation queued for {job_id}"})
        return {"status": "queued", "job_id": job_id, "task_id": task.id}
    _spawn_task(_generate_one(job_id), f"generate:{job_id}")
    return {"status": "generating", "job_id": job_id}


async def _run_pipeline_for_lead(job_id: str):
    from db.client import get_lead_by_id, get_profile, get_settings
    from graph import PipelineState, eval_graph

    lead = await asyncio.to_thread(get_lead_by_id, job_id)
    if not lead:
        raise LookupError("lead not found")
    profile = await asyncio.to_thread(get_profile)
    cfg = await asyncio.to_thread(get_settings)
    state: PipelineState = {
        "job_id": job_id,
        "lead": lead,
        "profile": profile,
        "cfg": cfg,
        "score": 0,
        "reason": "",
        "match_points": [],
        "gaps": [],
        "asset_path": "",
        "cover_letter_path": "",
        "error": None,
    }
    result = await asyncio.to_thread(eval_graph.invoke, state)
    await cm.broadcast({
        "type": "agent",
        "kind": "agent",
        "src": "pipeline",
        "event": "pipeline_done",
        "msg": f"Pipeline done for {job_id}: score={result['score']}, error={result['error']}",
    })


@app.post("/api/v1/leads/{job_id}/pipeline/run")
async def run_pipeline(job_id: str):
    from db.client import get_lead_by_id

    lead = await asyncio.to_thread(get_lead_by_id, job_id)
    if not lead:
        raise HTTPException(status_code=404, detail="lead not found")
    task = _queue_task(
        "lead.pipeline",
        {"job_id": job_id},
        unique_key=f"lead.pipeline:{job_id}",
        priority=30,
    )
    if task is not None:
        return {"status": "queued", "job_id": job_id, "task_id": task.id}
    _spawn_task(_run_pipeline_for_lead(job_id), f"pipeline:{job_id}")
    return {"status": "started", "job_id": job_id}


@app.get("/api/v1/leads/{job_id}/pdf")
async def get_lead_pdf(job_id: str, kind: str = "resume", version: int | None = None):
    from fastapi import HTTPException
    from fastapi.responses import FileResponse
    from db.client import get_lead_by_id
    lead = get_lead_by_id(job_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    is_cover = kind in {"cover", "cover_letter", "cover-letter"}
    if version is not None:
        paths = [
            lead.get("resume_asset") or lead.get("asset") or "",
            lead.get("cover_letter_asset") or "",
        ]
        base_dir = next((os.path.dirname(path) for path in paths if path), None)
        if not base_dir:
            base_dir = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "JustHireMe", "assets")
        filename = f"{job_id}_cl_v{version}.pdf" if is_cover else f"{job_id}_v{version}.pdf"
        path = os.path.join(base_dir, filename)
        missing = "Cover letter not generated yet" if is_cover else "Resume not generated yet"
    elif is_cover:
        path = lead.get("cover_letter_asset") or ""
        filename = f"{job_id}_cover_letter.pdf"
        missing = "Cover letter not generated yet"
    else:
        path = lead.get("resume_asset") or lead.get("asset") or ""
        filename = f"{job_id}_resume.pdf"
        missing = "Resume not generated yet"
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail=missing)
    return FileResponse(path, media_type="application/pdf", filename=filename)


@app.get("/api/v1/template")
async def get_template():
    from db.client import get_setting
    return {"template": get_setting("resume_template", "")}


@app.post("/api/v1/template")
async def save_template(body: TemplateBody):
    from db.client import save_settings
    save_settings({"resume_template": body.template})
    return {"ok": True}


@app.get("/api/v1/events")
async def get_events_endpoint(limit: int = 100, job_id: str | None = None):
    from db.client import get_events
    return get_events(limit=limit, job_id=job_id)


@app.get("/api/v1/graph")
async def graph_stats():
    from db.client import conn
    out = {}
    for t in ["Candidate", "Skill", "Project", "Experience", "JobLead"]:
        r = conn.execute(f"MATCH (n:{t}) RETURN count(n)")
        out[t.lower()] = r.get_next()[0] if r.has_next() else 0
    return out


@app.get("/api/v1/knowledge")
async def knowledge_summary():
    return _knowledge.summary_payload()


@app.get("/api/v1/knowledge/graph")
async def knowledge_graph():
    return _knowledge.graph_payload()


@app.get("/api/v1/knowledge/status")
async def knowledge_status():
    return _knowledge.status_payload()


@app.post("/api/v1/knowledge/refresh")
async def knowledge_refresh():
    try:
        return await _knowledge.start_refresh()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Knowledge vault not available")


@app.get("/api/v1/knowledge/candidates")
async def knowledge_candidates(status: str = "pending"):
    if status not in {"pending", "promoted", "archived", "all"}:
        raise HTTPException(status_code=400, detail="Invalid candidate status filter")
    return _knowledge.candidates_payload(status_filter=status)


@app.post("/api/v1/knowledge/candidates/review")
async def knowledge_review(body: KnowledgeReviewBody):
    try:
        return _knowledge.review_candidate(path=body.path, page_id=body.page_id, action=body.action)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Knowledge page not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/v1/knowledge/page")
async def knowledge_page(page_id: str = "", path: str = ""):
    if not _knowledge.enabled():
        raise HTTPException(status_code=404, detail="Knowledge vault not available")
    detail = _knowledge.page_detail(page_id=page_id, path=path)
    if not detail:
        raise HTTPException(status_code=404, detail="Knowledge page not found")
    return detail


@app.get("/api/v1/profile")
async def get_profile_endpoint():
    from db.client import get_profile as _gp
    return _gp()


@app.put("/api/v1/profile/candidate")
async def update_candidate_endpoint(body: CandidateBody):
    from db.client import update_candidate
    if not body.n.strip() and not body.s.strip():
        raise HTTPException(status_code=422, detail="Name or summary is required")
    return update_candidate(body.n, body.s)


# ── Profile CRUD: Skills ──────────────────────────────────────────

@app.post("/api/v1/profile/skill")
async def add_skill_endpoint(body: SkillBody):
    from db.client import add_skill
    if not body.n.strip():
        raise HTTPException(status_code=422, detail="Skill name is required")
    return add_skill(body.n, body.cat)


@app.put("/api/v1/profile/skill/{sid}")
async def update_skill_endpoint(sid: str, body: SkillBody):
    from db.client import update_skill
    if not body.n.strip():
        raise HTTPException(status_code=422, detail="Skill name is required")
    return update_skill(sid, body.n, body.cat)


@app.delete("/api/v1/profile/skill/{sid}")
async def delete_skill_endpoint(sid: str):
    from db.client import delete_skill
    delete_skill(sid)
    return {"ok": True}


# ── Profile CRUD: Experience ──────────────────────────────────────

@app.post("/api/v1/profile/experience")
async def add_experience_endpoint(body: ExperienceBody):
    from db.client import add_experience
    if not body.role.strip() and not body.co.strip():
        raise HTTPException(status_code=422, detail="Role or company is required")
    return add_experience(body.role, body.co, body.period, body.d)


@app.put("/api/v1/profile/experience/{eid}")
async def update_experience_endpoint(eid: str, body: ExperienceBody):
    from db.client import update_experience
    if not body.role.strip() and not body.co.strip():
        raise HTTPException(status_code=422, detail="Role or company is required")
    return update_experience(eid, body.role, body.co, body.period, body.d)


@app.delete("/api/v1/profile/experience/{eid}")
async def delete_experience_endpoint(eid: str):
    from db.client import delete_experience
    delete_experience(eid)
    return {"ok": True}


# ── Profile CRUD: Projects ───────────────────────────────────────

@app.post("/api/v1/profile/project")
async def add_project_endpoint(body: ProjectBody):
    from db.client import add_project
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="Project title is required")
    return add_project(body.title, body.stack, body.repo, body.impact)


@app.put("/api/v1/profile/project/{pid}")
async def update_project_endpoint(pid: str, body: ProjectBody):
    from db.client import update_project
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="Project title is required")
    return update_project(pid, body.title, body.stack, body.repo, body.impact)


@app.delete("/api/v1/profile/project/{pid}")
async def delete_project_endpoint(pid: str):
    from db.client import delete_project
    delete_project(pid)
    return {"ok": True}


@app.post("/api/v1/scan")
async def scan():
    global _scan_task
    if _has_active_worker_task("scan.run"):
        raise HTTPException(status_code=409, detail="Scan already running")
    if _has_active_worker_task("leads.reevaluate"):
        raise HTTPException(status_code=409, detail="Re-evaluation already running")
    if _scan_task and not _scan_task.done():
        raise HTTPException(status_code=409, detail="Scan already running")
    if _reevaluate_task and not _reevaluate_task.done():
        raise HTTPException(status_code=409, detail="Re-evaluation already running")
    _scan_stop.clear()
    task = _queue_task("scan.run", {}, unique_key="scan.run", priority=50)
    if task is not None:
        return {"status": "queued", "task_id": task.id}
    _scan_task = asyncio.create_task(_run_scan_task())
    return {"status": "scanning"}


@app.post("/api/v1/scan/stop")
async def stop_scan():
    if _has_active_worker_task("scan.run"):
        _scan_stop.set()
        for task in _worker_queue.active(kind="scan.run") if _worker_queue else []:
            if task.status == "queued":
                _worker_queue.cancel(task.id, "Scan stopped by user")
        await cm.broadcast({"type": "agent", "event": "eval_done", "msg": "Scan stopped by user."})
        return {"status": "stopping"}
    if not _scan_task or _scan_task.done():
        return {"status": "idle"}
    _scan_stop.set()
    await cm.broadcast({"type": "agent", "event": "eval_done", "msg": "Scan stopped by user."})
    return {"status": "stopping"}


@app.post("/api/v1/leads/reevaluate")
async def reevaluate_jobs():
    global _reevaluate_task
    if _has_active_worker_task("leads.reevaluate"):
        raise HTTPException(status_code=409, detail="Re-evaluation already running")
    if _has_active_worker_task("scan.run"):
        raise HTTPException(status_code=409, detail="Scan already running")
    if _reevaluate_task and not _reevaluate_task.done():
        raise HTTPException(status_code=409, detail="Re-evaluation already running")
    if _scan_task and not _scan_task.done():
        raise HTTPException(status_code=409, detail="Scan already running")
    _reevaluate_stop.clear()
    task = _queue_task("leads.reevaluate", {}, unique_key="leads.reevaluate", priority=60)
    if task is not None:
        return {"status": "queued", "task_id": task.id}
    _reevaluate_task = asyncio.create_task(_run_reevaluate_jobs_task())
    return {"status": "reevaluating"}


@app.post("/api/v1/leads/reevaluate/stop")
async def stop_reevaluate_jobs():
    if _has_active_worker_task("leads.reevaluate"):
        _reevaluate_stop.set()
        for task in _worker_queue.active(kind="leads.reevaluate") if _worker_queue else []:
            if task.status == "queued":
                _worker_queue.cancel(task.id, "Re-evaluation stopped by user")
        await cm.broadcast({"type": "agent", "event": "reeval_done", "msg": "Re-evaluation stopped by user."})
        return {"status": "stopping"}
    if not _reevaluate_task or _reevaluate_task.done():
        return {"status": "idle"}
    _reevaluate_stop.set()
    await cm.broadcast({"type": "agent", "event": "reeval_done", "msg": "Re-evaluation stopped by user."})
    return {"status": "stopping"}


@app.post("/api/v1/leads/cleanup")
async def cleanup_leads(dry_run: bool = False, limit: int = 1000):
    from db.client import cleanup_bad_leads, get_lead_by_id

    await cm.broadcast({
        "type": "agent",
        "event": "cleanup_start",
        "msg": f"Scanning up to {limit} leads for bad data...",
    })
    result = await asyncio.to_thread(cleanup_bad_leads, limit, dry_run)

    if not dry_run:
        for item in result.get("items", [])[:100]:
            lead = await asyncio.to_thread(get_lead_by_id, item["job_id"])
            if lead:
                await cm.broadcast({"type": "LEAD_UPDATED", "data": lead})

    action = "would discard" if dry_run else "discarded"
    await cm.broadcast({
        "type": "agent",
        "event": "cleanup_done",
        "msg": f"Cleanup scanned {result['scanned']} leads and {action} {result['candidates']} bad rows.",
    })
    return result


@app.post("/api/v1/free-sources/scan")
async def free_sources_scan():
    from db.client import get_settings
    cfg = get_settings()
    leads = await _run_free_source_scan(cfg, "job")
    return {"status": "done", "leads": len(leads)}


async def _run_scan_task():
    global _scan_task
    try:
        await _run_scan()
    except Exception as exc:
        _log.error("scan failed: %s", exc)
        await cm.broadcast({"type": "agent", "event": "eval_done", "msg": f"Scan failed: {exc}"})
    finally:
        _scan_task = None


async def _run_reevaluate_jobs_task():
    global _reevaluate_task
    try:
        await _run_reevaluate_jobs()
    except Exception as exc:
        _log.error("reevaluate failed: %s", exc)
        await cm.broadcast({"type": "agent", "event": "reeval_done", "msg": f"Re-evaluation failed: {exc}"})
    finally:
        _reevaluate_task = None


async def _run_reevaluate_jobs():
    from db.client import get_settings, get_job_leads_for_evaluation, get_lead_by_id, update_lead_score, get_profile
    from agents.evaluator import score as _score

    cfg = await asyncio.to_thread(get_settings)
    profile = await asyncio.to_thread(get_profile)
    jobs = await asyncio.to_thread(get_job_leads_for_evaluation)
    total = len(jobs)
    scored = 0
    failed = 0

    await cm.broadcast({
        "type": "agent",
        "event": "reeval_start",
        "msg": f"Re-evaluating {total} job leads via {cfg.get('llm_provider', 'ollama')}",
    })

    for index, lead in enumerate(jobs, start=1):
        if _reevaluate_stop.is_set():
            await cm.broadcast({
                "type": "agent",
                "event": "reeval_done",
                "msg": f"Re-evaluation stopped after {scored}/{total} jobs.",
            })
            return

        try:
            result = await asyncio.to_thread(_score, _job_eval_document(lead), profile)
            preserve_status = _should_preserve_job_status(lead.get("status", ""))
            await asyncio.to_thread(
                update_lead_score,
                lead["job_id"], result["score"], result["reason"],
                result.get("match_points", []), result.get("gaps", []),
                preserve_status,
            )
            saved = await asyncio.to_thread(get_lead_by_id, lead["job_id"])
            await cm.broadcast({"type": "LEAD_UPDATED", "data": saved or {**lead, **result}})
            scored += 1
            await cm.broadcast({
                "type": "agent",
                "event": "reeval_scored",
                "msg": f"[{index}/{total}] Re-scored {lead.get('title','')} = {result['score']}/100",
            })
        except Exception as e:
            failed += 1
            await cm.broadcast({
                "type": "agent",
                "event": "reeval_error",
                "msg": f"Re-eval failed for {lead.get('title','')}: {e}",
            })

    summary = f"Re-evaluation complete - {scored}/{total} jobs scored"
    if failed:
        summary += f", {failed} failed"
    await cm.broadcast({"type": "agent", "event": "reeval_done", "msg": summary})


async def _run_scan():
    from db.client import get_settings, get_discovered_leads, update_lead_score, get_profile
    from agents.scout import run as _scout
    from agents.evaluator import score as _score
    from agents.query_gen import generate as _gen_queries

    cfg     = get_settings()
    profile = get_profile()
    market_focus = cfg.get("job_market_focus", "global")
    raw_urls = _job_targets(cfg.get("job_boards", ""), market_focus)
    await _run_x_signal_scan(cfg, "job")
    await _run_free_source_scan(cfg, "job")

    # ── Replace static site: keywords with profile-tailored queries ──────
    await cm.broadcast({"type": "agent", "event": "query_gen_start",
                        "msg": "Generating profile-tailored search queries…"})
    try:
        urls = await asyncio.to_thread(_gen_queries, profile, raw_urls, market_focus)
        await cm.broadcast({"type": "agent", "event": "query_gen_done",
                            "msg": f"Search plan ready — {len(urls)} targets"})
        for u in urls:
            await cm.broadcast({"type": "agent", "event": "query_gen_target", "msg": u})
    except Exception as exc:
        urls = raw_urls
        await cm.broadcast({"type": "agent", "event": "query_gen_error",
                            "msg": f"Query generation failed ({exc}), using raw URLs"})

    await cm.broadcast({"type": "agent", "event": "scout_start", "msg": f"Launching scan for {len(urls)} targets…"})

    leads = await asyncio.to_thread(
        _scout,
        urls=urls,
        apify_token=cfg.get("apify_token") or None,
        apify_actor=cfg.get("apify_actor") or None,
    )
    await cm.broadcast({"type": "agent", "event": "scout_done", "msg": f"Scout finished — {len(leads)} new leads found"})

    if _scan_stop.is_set():
        await cm.broadcast({"type": "agent", "event": "eval_done", "msg": "Scan stopped after scouting."})
        return

    discovered = await asyncio.to_thread(get_discovered_leads)
    await cm.broadcast({"type": "agent", "event": "eval_start", "msg": f"Evaluating {len(discovered)} leads via {cfg.get('llm_provider', 'ollama')}"})

    for lead in discovered:
        if _scan_stop.is_set():
            await cm.broadcast({"type": "agent", "event": "eval_done", "msg": "Scan stopped during evaluation."})
            return
        try:
            desc = (lead.get("description") or "").strip()
            jd = (
                f"Job Title: {lead.get('title','')}\n"
                f"Company: {lead.get('company','')}\n"
                f"URL: {lead.get('url','')}\n"
                + (f"Description: {desc}" if desc else "")
            )
            result = await asyncio.to_thread(_score, jd, profile)
            await asyncio.to_thread(
                update_lead_score,
                lead["job_id"], result["score"], result["reason"],
                result.get("match_points", []), result.get("gaps", []),
            )
            await cm.broadcast({"type": "LEAD_UPDATED", "data": {**lead, **result}})
            await cm.broadcast({"type": "agent", "event": "eval_scored", "msg": f"Scored {lead.get('title','')} = {result['score']}/100"})
        except Exception as e:
            await cm.broadcast({"type": "agent", "event": "eval_error", "msg": f"Eval failed for {lead.get('title','')}: {e}"})

    await cm.broadcast({"type": "agent", "event": "eval_done", "msg": "Evaluation cycle complete"})


def _sensitive(d: dict) -> set:
    """Keys that should be masked on reads and preserved on writes."""
    fixed = {"anthropic_key", "linkedin_cookie", "x_bearer_token"}
    dynamic = {k for k in d if k.endswith("_api_key") or k.endswith("_key") or k.endswith("_token")}
    return fixed | dynamic


@app.get("/api/v1/settings")
async def get_cfg():
    from db.client import get_settings
    s = get_settings()
    _m = "••••••••••••••••••••"
    for k in _sensitive(s):
        if s.get(k):
            s[k] = _m
    return s


async def _probe_provider_key(provider: str, key: str) -> dict:
    import httpx

    started = time.perf_counter()
    try:
        timeout = httpx.Timeout(5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            if provider == "anthropic":
                r = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-haiku-4-5-20251001",
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "ping"}],
                    },
                )
                status = "ok" if r.status_code in {200, 400} else "invalid_key" if r.status_code == 401 else "unreachable"
            elif provider == "openai":
                r = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
                status = "ok" if r.status_code == 200 else "invalid_key" if r.status_code == 401 else "unreachable"
            elif provider == "groq":
                r = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
                status = "ok" if r.status_code == 200 else "invalid_key" if r.status_code == 401 else "unreachable"
            else:
                status = "unchecked"
    except Exception:
        status = "unreachable"
    return {"status": status, "latency_ms": round((time.perf_counter() - started) * 1000)}


async def _probe_local_runtime(base_url: str) -> dict:
    import httpx

    started = time.perf_counter()
    raw = str(base_url or "").strip()
    if not raw:
        return {"status": "not_configured", "latency_ms": 0}

    timeout = httpx.Timeout(5.0)
    candidates: list[str] = []
    trimmed = raw.rstrip("/")
    if trimmed.endswith("/v1"):
        candidates.append(f"{trimmed}/models")
        candidates.append(f"{trimmed[:-3]}/api/tags")
    else:
        candidates.append(f"{trimmed}/api/tags")
        candidates.append(f"{trimmed}/v1/models")

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            for url in candidates:
                try:
                    r = await client.get(url)
                    if r.status_code == 200:
                        return {"status": "ok", "latency_ms": round((time.perf_counter() - started) * 1000)}
                except Exception:
                    continue
    except Exception:
        pass

    return {"status": "unreachable", "latency_ms": round((time.perf_counter() - started) * 1000)}


@app.get("/api/v1/settings/validate")
async def validate_settings():
    from db.client import get_settings
    from llm import _ENV_NAMES, _KEY_NAMES

    cfg = get_settings()
    providers = ["ollama", "anthropic", "openai", "groq", *[p for p in _KEY_NAMES if p not in {"anthropic", "openai", "groq"}]]

    async def one(provider: str):
        if provider == "ollama":
            return provider, await _probe_local_runtime(str(cfg.get("ollama_url", "") or ""))
        key_name = _KEY_NAMES.get(provider, "")
        key = str(cfg.get(key_name) or os.environ.get(_ENV_NAMES.get(provider, ""), "") or "").strip()
        if not key:
            return provider, {"status": "not_configured", "latency_ms": 0}
        if provider not in {"anthropic", "openai", "groq"}:
            return provider, {"status": "unchecked", "latency_ms": 0}
        return provider, await _probe_provider_key(provider, key)

    pairs = await asyncio.gather(*(one(provider) for provider in providers))
    return {provider: result for provider, result in pairs}


@app.post("/api/v1/settings")
async def save_cfg(body: SettingsBody):
    from db.client import get_settings, save_settings
    payload = {k: "" if v is None else str(v) for k, v in body.model_dump().items()}
    old = get_settings()
    _m = "••••••••••••••••••••"
    for k in _sensitive({**old, **payload}):
        if payload.get(k) == _m:
            payload[k] = old.get(k, "")
    save_settings(payload)
    ghost = payload.get("ghost_mode") == "true"
    if ghost and not _sched.get_job("ghost"):
        _sched.add_job(_ghost_tick, "interval", hours=6, id="ghost")
    return {"ok": True}


@app.post("/api/v1/ingest")
async def ingest(
    raw: str = Form(""),
    file: UploadFile | None = File(None),
):
    from agents.ingestor import ingest as _ingest
    pdf_path = None
    if file and file.filename:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        shutil.copyfileobj(file.file, tmp)
        tmp.close()
        pdf_path = tmp.name
    try:
        p = await asyncio.to_thread(_ingest, raw, pdf_path)
        try:
            from db.client import refresh_profile_snapshot
            await asyncio.to_thread(refresh_profile_snapshot)
        except Exception:
            pass
        await cm.broadcast({"type": "agent", "event": "ingested",
                            "msg": f"Profile ingested: {p.n} — {len(p.skills)} skills"})
        return p.model_dump()
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if pdf_path and os.path.exists(pdf_path):
            os.unlink(pdf_path)


class GithubIngestBody(StrictBody):
    username:  str = Field(max_length=100)
    token:     str = Field(default="", max_length=200)
    max_repos: int = Field(default=12, ge=1, le=30)


class PortfolioIngestBody(StrictBody):
    url: str = Field(max_length=2000)
    auto_import: bool = Field(
        default=False,
        description="if true, immediately write extracted data to the graph",
    )


class ProfileSkill(BaseModel):
    name: str = Field(max_length=160)
    category: str = Field(default="general", max_length=80)


class ProfileExperience(BaseModel):
    role: str = Field(default="", max_length=200)
    company: str = Field(default="", max_length=200)
    period: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=5000)


class ProfileProject(BaseModel):
    title: str = Field(default="", max_length=200)
    stack: str = Field(default="", max_length=500)
    repo: str = Field(default="", max_length=500)
    impact: str = Field(default="", max_length=1000)


class ProfileEntry(BaseModel):
    title: str = Field(max_length=500)


class ProfileIdentity(BaseModel):
    email: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=50)
    linkedin_url: str = Field(default="", max_length=500)
    github_url: str = Field(default="", max_length=500)
    website_url: str = Field(default="", max_length=500)
    city: str = Field(default="", max_length=200)


class ProfileCandidate(BaseModel):
    name: str = Field(default="", max_length=160)
    summary: str = Field(default="", max_length=4000)


class ProfileImportBody(BaseModel):
    """Accepts any subset of fields - all are optional."""

    candidate: ProfileCandidate = Field(default_factory=ProfileCandidate)
    identity: ProfileIdentity = Field(default_factory=ProfileIdentity)
    skills: list[ProfileSkill] = Field(default_factory=list)
    experience: list[ProfileExperience] = Field(default_factory=list)
    projects: list[ProfileProject] = Field(default_factory=list)
    education: list[ProfileEntry] = Field(default_factory=list)
    certifications: list[ProfileEntry] = Field(default_factory=list)
    achievements: list[ProfileEntry] = Field(default_factory=list)


@app.post("/api/v1/ingest/linkedin")
async def ingest_linkedin(file: UploadFile = File(...)):
    from agents.linkedin_parser import parse_linkedin_export
    from db.client import update_candidate, add_skill, add_experience, add_education, add_project, add_certification

    if not (file.filename or "").endswith(".zip"):
        raise HTTPException(400, "expected a .zip file from LinkedIn data export")
    raw = await file.read()
    if len(raw) > 50 * 1024 * 1024:
        raise HTTPException(413, "file too large")
    try:
        parsed = await asyncio.to_thread(parse_linkedin_export, raw)
    except Exception as exc:
        _log.error("linkedin parse failed: %s", exc)
        raise HTTPException(422, f"could not parse linkedin export: {exc}")

    errors = []
    try:
        c = parsed["candidate"]
        if c["n"]:
            await asyncio.to_thread(update_candidate, c["n"], c["s"])
    except Exception as e:
        errors.append(f"candidate: {e}")

    for skill in parsed["skills"]:
        try:
            await asyncio.to_thread(add_skill, skill["n"], skill["cat"])
        except Exception:
            pass

    for exp in parsed["experience"]:
        try:
            await asyncio.to_thread(add_experience, exp["role"], exp["co"], exp["period"], exp["d"])
        except Exception as e:
            errors.append(f"exp {exp.get('role')}: {e}")

    for edu in parsed["education"]:
        try:
            await asyncio.to_thread(add_education, edu["title"])
        except Exception as e:
            errors.append(f"edu: {e}")

    for proj in parsed["projects"]:
        try:
            await asyncio.to_thread(add_project, proj["title"], proj["stack"], proj["repo"], proj["impact"])
        except Exception as e:
            errors.append(f"proj {proj.get('title')}: {e}")

    for cert in parsed["certifications"]:
        try:
            await asyncio.to_thread(add_certification, cert["title"])
        except Exception as e:
            errors.append(f"cert: {e}")

    return {
        "status":   "ok" if not errors else "partial",
        "stats":    parsed["stats"],
        "location": parsed["location"],
        "errors":   errors,
    }


@app.post("/api/v1/ingest/github")
async def ingest_github_endpoint(body: GithubIngestBody):
    from agents.github_ingestor import ingest_github
    from db.client import add_skill, add_project, save_settings

    result = await ingest_github(
        body.username,
        token=body.token or None,
        max_repos=body.max_repos,
    )
    if "error" in result:
        raise HTTPException(404, result["error"])

    errors = list(result.get("errors", []))

    for skill in result["skills"]:
        try:
            await asyncio.to_thread(add_skill, skill["n"], skill["cat"])
        except Exception:
            pass

    for proj in result["projects"]:
        try:
            await asyncio.to_thread(add_project, proj["title"], proj["stack"], proj["repo"], proj["impact"])
        except Exception as e:
            errors.append(f"proj {proj.get('title')}: {e}")

    gu = result.get("github_user", {})
    settings_update: dict = {}
    if gu.get("login"):
        settings_update["github_username"] = gu["login"]
    if gu.get("blog"):
        settings_update["website_url"] = gu["blog"]
    if settings_update:
        await asyncio.to_thread(save_settings, settings_update)

    return {
        "status":      "ok" if not errors else "partial",
        "github_user": result["github_user"],
        "stats":       result["stats"],
        "errors":      errors,
    }


@app.post("/api/v1/ingest/profile")
async def import_profile_json(body: ProfileImportBody):
    errors = []
    from db.client import (
        update_candidate, add_skill, add_experience,
        add_education, add_certification, add_achievement,
        add_project, save_settings,
    )

    stats = {k: 0 for k in [
        "skills", "experience", "projects", "education",
        "certifications", "achievements",
    ]}

    c = body.candidate
    if c.name or c.summary:
        try:
            await asyncio.to_thread(update_candidate, c.name, c.summary)
        except Exception as e:
            errors.append(f"candidate: {e}")

    id_ = body.identity
    identity_map = {
        "email": id_.email,
        "phone": id_.phone,
        "linkedin_url": id_.linkedin_url,
        "github_url": id_.github_url,
        "website_url": id_.website_url,
        "city": id_.city,
    }
    for key, val in identity_map.items():
        if val:
            try:
                await asyncio.to_thread(save_settings, {key: val})
            except Exception as e:
                errors.append(f"identity.{key}: {e}")

    for s in body.skills:
        try:
            await asyncio.to_thread(add_skill, s.name, s.category)
            stats["skills"] += 1
        except Exception:
            pass

    for ex in body.experience:
        try:
            await asyncio.to_thread(
                add_experience, ex.role, ex.company, ex.period, ex.description,
            )
            stats["experience"] += 1
        except Exception as e:
            errors.append(f"exp {ex.role}: {e}")

    for p in body.projects:
        try:
            await asyncio.to_thread(add_project, p.title, p.stack, p.repo, p.impact)
            stats["projects"] += 1
        except Exception as e:
            errors.append(f"proj {p.title}: {e}")

    for e in body.education:
        try:
            await asyncio.to_thread(add_education, e.title)
            stats["education"] += 1
        except Exception as exc:
            errors.append(f"edu: {exc}")

    for cert in body.certifications:
        try:
            await asyncio.to_thread(add_certification, cert.title)
            stats["certifications"] += 1
        except Exception as exc:
            errors.append(f"cert: {exc}")

    for ach in body.achievements:
        try:
            await asyncio.to_thread(add_achievement, ach.title)
            stats["achievements"] += 1
        except Exception as exc:
            errors.append(f"achievement: {exc}")

    return {
        "status": "ok" if not errors else "partial",
        "stats": stats,
        "errors": errors,
    }


@app.get("/api/v1/ingest/profile/template")
async def get_profile_template():
    from pathlib import Path
    template_path = Path(__file__).parent / "data" / "profile_schema_example.json"
    with open(template_path, encoding="utf-8") as f:
        return json.load(f)


@app.post("/api/v1/ingest/portfolio")
async def ingest_portfolio_endpoint(body: PortfolioIngestBody):
    if not body.url.startswith(("http://", "https://")):
        raise HTTPException(400, "url must start with http:// or https://")
    from agents.portfolio_ingestor import ingest_portfolio_url
    result = await ingest_portfolio_url(body.url)
    if result.get("error") and not result.get("screenshot_b64"):
        raise HTTPException(422, result["error"])

    if body.auto_import and result.get("candidate") is not None:
        import_body = ProfileImportBody(
            candidate=ProfileCandidate(**(result["candidate"] or {})),
            skills=[
                ProfileSkill(name=s["name"], category=s.get("category", "general"))
                for s in result.get("skills", [])
            ],
            projects=[ProfileProject(**p) for p in result.get("projects", [])],
            achievements=[
                ProfileEntry(title=a["title"])
                for a in result.get("achievements", [])
            ],
        )
        import_result = await import_profile_json(import_body)
        result["import_stats"] = import_result["stats"]
        result["import_errors"] = import_result["errors"]

    return result


def _asset_ready(path: str) -> bool:
    return bool(path) and os.path.isfile(path)


def _fire_blocker(lead: dict, asset: str) -> tuple[int, str]:
    if not lead:
        return 404, "Lead not found"
    if lead.get("status") == "applied":
        return 409, "Lead is already marked applied"
    if not lead.get("url"):
        return 409, "Lead has no application URL"
    if not _asset_ready(asset):
        return 409, "Generate a resume before firing this application"
    cover = lead.get("cover_letter_asset") or lead.get("cover_letter_path") or ""
    if not _asset_ready(cover):
        return 409, "Generate a cover letter before firing this application"
    return 0, ""


@app.post("/api/v1/fire/{job_id}")
async def fire(job_id: str):
    from db.client import get_lead_for_fire
    lead, asset = await asyncio.to_thread(get_lead_for_fire, job_id)
    status, detail = _fire_blocker(lead, asset)
    if detail:
        raise HTTPException(status_code=status, detail=detail)
    task = _queue_task(
        "lead.fire",
        {"job_id": job_id},
        unique_key=f"lead.fire:{job_id}",
        priority=10,
    )
    if task is not None:
        return {"status": "queued", "job_id": job_id, "task_id": task.id}
    _spawn_task(_actuate(job_id), f"fire:{job_id}")
    return {"status": "firing", "job_id": job_id}


class FormReadBody(StrictBody):
    url: str = Field(default="", max_length=2000)


class ApplySubmitBody(StrictBody):
    confirm: bool = False


def _sensitive_apply_labels(labels: list[str]) -> list[str]:
    sensitive_markers = (
        "sponsor", "visa", "work authorization", "authorized", "disability",
        "gender", "race", "ethnicity", "veteran", "salary", "compensation",
        "criminal", "background check", "relocate",
    )
    out: list[str] = []
    for label in labels:
        lower = str(label or "").lower()
        if any(marker in lower for marker in sensitive_markers):
            out.append(str(label))
    return list(dict.fromkeys(out))


def _apply_readiness(result: dict) -> dict:
    fields = result.get("fields") if isinstance(result, dict) else []
    unmatched = result.get("unmatched_labels") if isinstance(result, dict) else []
    fields = fields if isinstance(fields, list) else []
    unmatched = unmatched if isinstance(unmatched, list) else []
    missing_answers = [
        f.get("label") or f.get("type") or f.get("selector")
        for f in fields
        if f.get("found_on_page") and not str(f.get("answer") or "").strip()
    ]
    sensitive = _sensitive_apply_labels([str(x) for x in unmatched + missing_answers])
    return {
        "missing_answers": [str(x) for x in missing_answers if x],
        "sensitive_labels": sensitive,
        "requires_user_review": bool(missing_answers or sensitive or result.get("error")),
    }


def _lead_application_answers(lead: dict) -> list[dict]:
    source_meta = lead.get("source_meta") if isinstance(lead, dict) else {}
    source_meta = source_meta if isinstance(source_meta, dict) else {}
    items = source_meta.get("application_answers") or []
    return [item for item in items if isinstance(item, dict)]


def _match_application_answers(lead: dict, labels: list[str]) -> list[dict]:
    from agents.actuator import application_answer_map, normalize_question_label

    answers = application_answer_map({"application_answers": _lead_application_answers(lead)})
    matches: list[dict] = []
    for label in labels:
        key = normalize_question_label(label)
        if not key:
            continue
        item = answers.get(key) or {}
        if not item:
            continue
        matches.append(
            {
                "label": str(label),
                "key": key,
                "answer": str(item.get("answer") or item.get("short_answer") or ""),
                "short_answer": str(item.get("short_answer") or item.get("answer") or ""),
                "long_answer": str(item.get("long_answer") or item.get("answer") or ""),
            }
        )
    return matches


async def _apply_context(job_id: str) -> tuple[dict, str, dict, str]:
    from db.client import get_lead_for_fire, get_profile, get_settings

    lead, asset = await asyncio.to_thread(get_lead_for_fire, job_id)
    status_code, detail = _fire_blocker(lead, asset)
    if detail:
        raise HTTPException(status_code=status_code, detail=detail)

    profile = await asyncio.to_thread(get_profile)
    cfg = await asyncio.to_thread(get_settings)
    candidate = (profile.get("candidate") or {}) if isinstance(profile, dict) else {}
    identity = {
        **lead,
        "name":            cfg.get("full_name", "") or candidate.get("n", "") or profile.get("n", ""),
        "email":           cfg.get("email", ""),
        "phone":           cfg.get("phone", ""),
        "linkedin_url":    cfg.get("linkedin_url", ""),
        "github":          cfg.get("github_url", ""),
        "website":         cfg.get("website_url", ""),
        "city":            cfg.get("city", ""),
        "current_company": cfg.get("current_company", ""),
        "application_answers": _lead_application_answers(lead),
    }

    cover_text = ""
    cover_path = lead.get("cover_letter_asset") or lead.get("cover_letter_path") or ""
    if cover_path and os.path.isfile(cover_path):
        md_path = cover_path.replace(".pdf", ".md")
        if os.path.isfile(md_path):
            try:
                with open(md_path, encoding="utf-8") as f:
                    cover_text = f.read()
            except Exception:
                cover_text = ""
    identity["cover_letter"] = cover_text
    return lead, asset, identity, cfg


@app.post("/api/v1/leads/{job_id}/form/read")
async def read_lead_form(job_id: str, body: FormReadBody):
    from db.client import get_lead_by_id, get_profile, get_settings
    from agents.actuator import read_form

    lead = get_lead_by_id(job_id)
    if not lead:
        raise HTTPException(404, "lead not found")

    url = (body.url or lead.get("url") or "").strip()
    if not url:
        raise HTTPException(400, "no url available for this lead")

    profile = get_profile()
    candidate = profile.get("candidate") or {}

    cfg = get_settings()
    identity = {
        "name":            cfg.get("full_name", "") or candidate.get("n", "") or profile.get("n", ""),
        "email":           cfg.get("email", ""),
        "phone":           cfg.get("phone", ""),
        "linkedin_url":    cfg.get("linkedin_url", ""),
        "github":          cfg.get("github_url", ""),
        "website":         cfg.get("website_url", ""),
        "city":            cfg.get("city", ""),
        "current_company": cfg.get("current_company", ""),
        "application_answers": _lead_application_answers(lead),
    }

    cover_letter = lead.get("cover_letter_asset", "")
    if cover_letter and os.path.isfile(cover_letter):
        try:
            md_path = cover_letter.replace(".pdf", ".md")
            if os.path.isfile(md_path):
                with open(md_path, encoding="utf-8") as f:
                    cover_letter = f.read()
            else:
                cover_letter = ""
        except Exception:
            cover_letter = ""

    result = await read_form(url, identity, cover_letter=cover_letter)
    return {
        **result,
        "suggested_answers": _match_application_answers(
            lead,
            [str(item) for item in result.get("unmatched_labels", []) or []],
        ),
    }


@app.get("/api/v1/identity")
async def get_identity():
    from db.client import get_settings
    cfg = get_settings()
    return {
        "full_name":       cfg.get("full_name", ""),
        "email":           cfg.get("email", ""),
        "phone":           cfg.get("phone", ""),
        "linkedin_url":    cfg.get("linkedin_url", ""),
        "github_url":      cfg.get("github_url", ""),
        "website_url":     cfg.get("website_url", ""),
        "city":            cfg.get("city", ""),
        "current_company": cfg.get("current_company", ""),
    }


@app.post("/api/v1/selectors/refresh")
async def refresh_selectors():
    from agents.selectors import get_selectors
    from db.client import save_settings

    save_settings({"selectors_fetched_at": "0"})
    data = await asyncio.to_thread(get_selectors)
    return {"version": data.get("version"), "platforms": list(data.get("platforms", {}).keys())}


@app.post("/api/v1/leads/{job_id}/apply/preview")
async def preview_apply(job_id: str):
    from agents.actuator import read_form
    from db.client import record_event

    lead, _asset, identity, _cfg = await _apply_context(job_id)
    result = await read_form(lead.get("url", ""), identity, identity.get("cover_letter", ""))
    readiness = _apply_readiness(result)
    suggested = _match_application_answers(
        lead,
        [str(x) for x in (result.get("unmatched_labels", []) or []) + readiness["missing_answers"]],
    )
    payload = {
        **result,
        **readiness,
        "suggested_answers": suggested,
        "stage": "preview",
        "job_id": job_id,
        "can_fill": not result.get("error"),
        "can_submit": not readiness["requires_user_review"],
    }
    await asyncio.to_thread(record_event, job_id, "apply_preview")
    return payload


@app.post("/api/v1/leads/{job_id}/apply/fill")
async def fill_apply(job_id: str):
    from agents.actuator import run as _act
    from db.client import record_event

    lead, asset, identity, _cfg = await _apply_context(job_id)
    result = await asyncio.to_thread(_act, identity or lead, asset, False, False)
    await asyncio.to_thread(record_event, job_id, "apply_fill")
    if isinstance(result, dict):
        return {**result, "stage": "fill", "job_id": job_id, "submitted": False}
    return {"stage": "fill", "job_id": job_id, "submitted": False, "ok": bool(result)}


@app.post("/api/v1/leads/{job_id}/apply/submit")
async def submit_apply(job_id: str, body: ApplySubmitBody):
    from agents.actuator import run as _act
    from db.client import get_setting, mark_applied, record_event

    if not body.confirm:
        raise HTTPException(400, "confirm must be true before submitting")
    if get_setting("auto_apply", "false") != "true":
        raise HTTPException(409, "Enable Experimental Auto Apply before final submission")

    lead, asset, identity, _cfg = await _apply_context(job_id)
    result = await asyncio.to_thread(_act, identity or lead, asset, False, True)
    if result is True:
        await asyncio.to_thread(mark_applied, job_id)
        return {"stage": "submit", "job_id": job_id, "submitted": True}

    await asyncio.to_thread(record_event, job_id, "apply_submit_failed")
    detail = "Application was not submitted"
    if isinstance(result, dict):
        detail = result.get("error") or result.get("status") or detail
    raise HTTPException(502, detail)


async def _generate_one(jid: str):
    from agents.generator import run_package as _gen
    from agents.contact_lookup import run as _contact_lookup
    from db.client import get_lead_by_id, save_asset_package, save_contact_lookup, get_setting
    lead = get_lead_by_id(jid)
    if not lead:
        await cm.broadcast({"type": "agent", "event": "gen_error", "msg": f"Lead {jid} not found"})
        return
    template = get_setting("resume_template", "")
    await cm.broadcast({"type": "agent", "event": "gen_start",
                        "msg": f"Generating for {lead.get('title','?')} @ {lead.get('company','?')}"})
    try:
        package = await asyncio.to_thread(_gen, lead, template)
        save_asset_package(
            jid,
            package["resume"],
            package["cover_letter"],
            package.get("selected_projects", []),
            package.get("keyword_coverage", {}),
            package.get("generation_artifacts", {}),
            package.get("application_answers", []),
        )
        # Save AI-generated outreach messages alongside the package
        _outreach_fields = {}
        if package.get("founder_message"):
            _outreach_fields["outreach_reply"] = package["founder_message"]
        if package.get("linkedin_note"):
            _outreach_fields["outreach_dm"] = package["linkedin_note"]
        if package.get("cold_email"):
            _outreach_fields["outreach_email"] = package["cold_email"]
        if _outreach_fields:
            from db.client import _sq, sql
            c = _sq.connect(sql)
            sets = ", ".join(f"{k}=?" for k in _outreach_fields)
            vals = list(_outreach_fields.values()) + [jid]
            c.execute(f"UPDATE leads SET {sets} WHERE job_id=?", vals)
            c.commit()
            c.close()
        enriched_lead = {
            **lead,
            "asset": package["resume"],
            "resume_asset": package["resume"],
            "cover_letter_asset": package["cover_letter"],
            "resume_version": package.get("version", lead.get("resume_version", 0)),
            "selected_projects": package.get("selected_projects", []),
            "keyword_coverage": package.get("keyword_coverage", {}),
            "outreach_reply": package.get("founder_message", lead.get("outreach_reply", "")),
            "outreach_dm": package.get("linkedin_note", lead.get("outreach_dm", "")),
            "outreach_email": package.get("cold_email", lead.get("outreach_email", "")),
            "source_meta": {
                **(lead.get("source_meta") or {}),
                "keyword_coverage": package.get("keyword_coverage", {}),
                "generation_artifacts": package.get("generation_artifacts", {}),
                "application_answers": package.get("application_answers", []),
            },
            "status": "approved",
        }
        contact_lookup = await asyncio.to_thread(_contact_lookup, enriched_lead)
        save_contact_lookup(jid, contact_lookup)
        enriched_lead["contact_lookup"] = contact_lookup
        enriched_meta = dict(enriched_lead.get("source_meta") or {})
        enriched_meta["contact_lookup"] = contact_lookup
        enriched_lead["source_meta"] = enriched_meta
        await cm.broadcast({"type": "LEAD_UPDATED", "data": {
            **enriched_lead,
        }})
        await cm.broadcast({"type": "agent", "event": "gen_done", "msg": f"Resume and cover letter ready: {lead.get('title','?')}"})
    except Exception as exc:
        await cm.broadcast({"type": "agent", "event": "gen_error",
                            "msg": f"Generation failed for {lead.get('title','?')}: {exc}"})


async def _actuate(jid: str):
    from agents.actuator import run as _act
    from db.client import get_lead_for_fire, mark_applied
    try:
        lead, asset = await asyncio.to_thread(get_lead_for_fire, jid)
        _status, detail = _fire_blocker(lead, asset)
        if detail:
            await cm.broadcast({"type": "agent", "event": "failed", "job_id": jid,
                                "msg": f"Submission blocked for {jid}: {detail}"})
            return

        await cm.broadcast({"type": "agent", "event": "actuating", "job_id": jid,
                            "msg": f"Opening browser for {lead.get('title','')} @ {lead.get('company','')}"})
        ok = await asyncio.to_thread(_act, lead, asset)
    except Exception as exc:
        await cm.broadcast({"type": "agent", "event": "failed", "job_id": jid,
                            "msg": f"Submission failed for {jid}: {exc}"})
        return

    if ok is True:
        await asyncio.to_thread(mark_applied, jid)
        await cm.broadcast({"type": "agent", "event": "applied", "job_id": jid,
                            "msg": f"Application submitted for {jid}"})
    else:
        await cm.broadcast({"type": "agent", "event": "failed", "job_id": jid,
                            "msg": f"Submission failed for {jid}"})


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    if not await _require_ws_token(ws):
        return
    await ws.accept()
    await cm.add(ws)
    beat = 0
    try:
        while True:
            beat += 1
            await ws.send_text(json.dumps({
                "type": "heartbeat", "status": "alive", "beat": beat,
                "uptime_seconds": round(time.monotonic() - _UP, 2),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }))
            try:
                msg = await asyncio.wait_for(ws.receive_text(), timeout=2.0)
                if msg == "ping":
                    await ws.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                pass
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        _log.warning("ws: %s", exc)
    finally:
        cm.remove(ws)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("JHM_PORT") or _free_port())
    sys.stdout.write(f"JHM_TOKEN={_API_TOKEN}\n")
    sys.stdout.write(f"PORT:{port}\n")
    sys.stdout.flush()
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from logger import get_logger

_log = get_logger(__name__)

ReviewAction = Literal["promote", "archive", "reset"]
ReviewStatus = Literal["pending", "promoted", "archived"]


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_path(value: str) -> str:
    return str(value or "").replace("\\", "/").lstrip("/")


@dataclass
class RefreshState:
    refreshing: bool = False
    last_refresh_at: str | None = None
    last_refresh_status: str = "idle"
    last_refresh_error: str = ""
    last_refresh_summary: dict[str, Any] | None = None


class KnowledgeService:
    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        self.manifest_path = repo_root / "knowledge.manifest.json"
        self.manifest = self._load_manifest()
        self.vault_root = (repo_root / self.manifest["vaultPath"]).resolve()
        self.wiki_root = self.vault_root / "wiki"
        self.state_root = self.vault_root / "state"
        self.graph_path = self.state_root / "graph.json"
        self.compile_state_path = self.state_root / "compile-state.json"
        self.home_path = self.vault_root / "Home.md"
        self.open_questions_path = self.wiki_root / "dashboards" / "open-questions.md"
        self.review_state_path = self.state_root / "app-review-state.json"
        self.refresh_state = RefreshState()
        self._refresh_task: asyncio.Task | None = None
        self._json_cache: dict[Path, tuple[float, dict[str, Any]]] = {}

    def _parse_iso(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None

    def _default_manifest(self) -> dict[str, Any]:
        return {
            "version": 1,
            "vaultPath": "knowledge/justhireme-obsidian-vault",
            "refreshCommand": ["npx", "@swarmvaultai/cli", "compile", "--json"],
            "sourceGroups": [
                {
                    "id": "foundation-docs",
                    "label": "Foundation docs",
                    "kind": "docs",
                    "paths": [
                        "README.md",
                        "SPEC.md",
                        "ROADMAP.md",
                        "docs/ARCHITECTURE.md",
                        "ARCHITECTURE.html",
                        "ARCHITECTURE_INTERACTIVE.html",
                    ],
                },
                {
                    "id": "supporting-docs",
                    "label": "Supporting docs",
                    "kind": "docs",
                    "paths": [
                        "docs/source-adapters.md",
                        "docs/MCP.md",
                        "docs/TASK_QUEUE.md",
                        "docs/MAINTAINER_RELEASE_CHECKLIST.md",
                        "docs/windows-release.md",
                    ],
                },
                {
                    "id": "next-code-slices",
                    "label": "Next code areas",
                    "kind": "code",
                    "paths": [
                        "src/views",
                        "src/components",
                        "src/hooks",
                        "src/settings",
                        "backend",
                        "src-tauri/src",
                    ],
                },
            ],
            "excludePaths": [
                "node_modules",
                "dist",
                ".git",
                "knowledge/justhireme-obsidian-vault/state",
                "knowledge/justhireme-obsidian-vault/wiki/outputs",
                "backend/.venv",
            ],
        }

    def _load_manifest(self) -> dict[str, Any]:
        manifest = self._default_manifest()
        if not self.manifest_path.exists():
            return manifest
        try:
            with self.manifest_path.open("r", encoding="utf-8") as handle:
                loaded = json.load(handle)
            if isinstance(loaded, dict):
                manifest.update(loaded)
        except Exception as exc:
            _log.warning("knowledge manifest load failed: %s", exc)
        return manifest

    def enabled(self) -> bool:
        return self.vault_root.exists() and self.graph_path.exists()

    def _json_data(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            return {}
        mtime = path.stat().st_mtime
        cached = self._json_cache.get(path)
        if cached and cached[0] == mtime:
            return cached[1]
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        self._json_cache[path] = (mtime, data)
        return data

    def _split_frontmatter(self, markdown: str) -> tuple[dict[str, str], str]:
        text = str(markdown or "")
        if not text.startswith("---\n"):
            return {}, text
        marker = "\n---\n"
        end = text.find(marker, 4)
        if end == -1:
            return {}, text
        raw_meta = text[4:end].splitlines()
        meta: dict[str, str] = {}
        current_key: str | None = None
        for raw_line in raw_meta:
            line = raw_line.rstrip()
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith("- ") and current_key:
                existing = meta.get(current_key, "")
                meta[current_key] = existing + ("\n" if existing else "") + stripped[2:].strip().strip("'\"")
                continue
            if ":" in line:
                key, value = line.split(":", 1)
                current_key = key.strip()
                if value.strip():
                    meta[current_key] = value.strip().strip("'\"")
                else:
                    meta.setdefault(current_key, "")
        body = text[end + len(marker):]
        return meta, body

    def _read_markdown(self, path: Path) -> tuple[dict[str, str], str]:
        with path.open("r", encoding="utf-8") as handle:
            raw = handle.read()
        return self._split_frontmatter(raw)

    def _markdown_excerpt(self, markdown: str, limit: int = 12) -> str:
        _, body = self._split_frontmatter(markdown)
        lines: list[str] = []
        for raw_line in body.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            line = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", line)
            line = re.sub(r"\[\[([^\]]+)\]\]", r"\1", line)
            if line:
                lines.append(line)
            if len(lines) >= limit:
                break
        return "\n".join(lines)

    def _review_state(self) -> dict[str, Any]:
        if not self.review_state_path.exists():
            return {"updatedAt": None, "pages": {}}
        try:
            return self._json_data(self.review_state_path)
        except Exception as exc:
            _log.warning("knowledge review state load failed: %s", exc)
            return {"updatedAt": None, "pages": {}}

    def _write_review_state(self, data: dict[str, Any]) -> None:
        self.review_state_path.parent.mkdir(parents=True, exist_ok=True)
        with self.review_state_path.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
            handle.write("\n")
        self._json_cache.pop(self.review_state_path, None)

    def _effective_review_status(self, key: str) -> ReviewStatus:
        review_state = self._review_state()
        pages = review_state.get("pages", {})
        review_entry = pages.get(key, {}) or pages.get(_normalize_path(key), {})
        raw = review_entry.get("status") or "pending"
        if raw not in {"pending", "promoted", "archived"}:
            return "pending"
        return raw

    def _page_record_by_path(self) -> dict[str, dict[str, Any]]:
        graph = self._json_data(self.graph_path)
        return {
            _normalize_path(str(page.get("path", ""))): page
            for page in graph.get("pages", [])
            if page.get("path")
        }

    def _slug_label(self, slug: str) -> str:
        return " ".join(part.capitalize() for part in slug.replace("_", "-").split("-") if part)

    def _candidate_paths_for_page_id(self, page_id: str) -> tuple[str, str]:
        kind, _, slug = page_id.partition(":")
        folder = "concepts" if kind == "concept" else "entities" if kind == "entity" else f"{kind}s"
        return f"candidates/{folder}/{slug}.md", f"{folder}/{slug}.md"

    def _candidate_catalog(self) -> list[dict[str, Any]]:
        compile_state = self._json_data(self.compile_state_path)
        candidate_history = compile_state.get("candidateHistory", {})
        if not candidate_history:
            records: list[dict[str, Any]] = []
            for page_file in sorted(self.wiki_root.glob("candidates/**/*.md")):
                if page_file.name == "index.md":
                    continue
                meta, body = self._read_markdown(page_file)
                page_path = _normalize_path(str(page_file.relative_to(self.wiki_root)))
                page_id = meta.get("page_id", "") or page_path
                records.append(
                    {
                        "id": page_id,
                        "path": page_path,
                        "candidatePath": page_path,
                        "title": meta.get("title") or page_file.stem,
                        "kind": meta.get("kind") or "",
                        "status": meta.get("status") or "",
                        "sourceIds": [s for s in str(meta.get("source_ids", "")).split("\n") if s],
                        "confidence": meta.get("confidence") or "",
                        "updatedAt": meta.get("updated_at") or "",
                        "excerpt": self._markdown_excerpt(body, limit=4),
                        "category": page_path.split("/")[1] if "/" in page_path else "candidate",
                    }
                )
            return records
        records: list[dict[str, Any]] = []
        for page_id, history in sorted(candidate_history.items()):
            candidate_path, canonical_path = self._candidate_paths_for_page_id(page_id)
            target_path = canonical_path
            file_meta: dict[str, str] = {}
            file_body = ""
            for candidate in (self.wiki_root / canonical_path, self.wiki_root / candidate_path):
                if candidate.exists():
                    file_meta, file_body = self._read_markdown(candidate)
                    target_path = _normalize_path(str(candidate.relative_to(self.wiki_root)))
                    break
            slug = page_id.partition(":")[2]
            records.append(
                {
                    "id": page_id,
                    "path": target_path,
                    "candidatePath": candidate_path,
                    "title": file_meta.get("title") or self._slug_label(slug),
                    "kind": file_meta.get("kind") or page_id.partition(":")[0],
                    "status": file_meta.get("status") or history.get("status") or "",
                    "sourceIds": history.get("sourceIds", []),
                    "confidence": file_meta.get("confidence") or "",
                    "updatedAt": file_meta.get("updated_at") or "",
                    "excerpt": self._markdown_excerpt(file_body, limit=4) if file_body else "",
                    "category": page_id.partition(":")[0],
                }
            )
        return records

    def _candidate_counts(self) -> dict[str, int]:
        counts = {"pending": 0, "promoted": 0, "archived": 0}
        for candidate in self._candidate_catalog():
            counts[self._effective_review_status(candidate["id"])] += 1
        return counts

    def _resolve_manifest_source_paths(self) -> list[dict[str, Any]]:
        resolved: list[dict[str, Any]] = []
        excludes = {str(item).replace("\\", "/").rstrip("/") for item in self.manifest.get("excludePaths", [])}
        skip_suffixes = {".pyc", ".pyo"}
        skip_parts = {"__pycache__", ".pytest_cache", ".mypy_cache"}
        for group in self.manifest.get("sourceGroups", []):
            for raw_path in group.get("paths", []):
                repo_path = (self.repo_root / str(raw_path)).resolve()
                rel_path = _normalize_path(str(repo_path.relative_to(self.repo_root))) if repo_path.exists() else _normalize_path(str(raw_path))
                if any(rel_path == item or rel_path.startswith(f"{item}/") for item in excludes):
                    continue
                if repo_path.is_file():
                    if repo_path.suffix.lower() in skip_suffixes or any(part in skip_parts for part in repo_path.parts):
                        continue
                    resolved.append({"groupId": group.get("id", ""), "groupLabel": group.get("label", ""), "path": rel_path, "mtime": repo_path.stat().st_mtime})
                elif repo_path.is_dir():
                    for child in repo_path.rglob("*"):
                        if not child.is_file():
                            continue
                        if child.suffix.lower() in skip_suffixes or any(part in skip_parts for part in child.parts):
                            continue
                        child_rel = _normalize_path(str(child.relative_to(self.repo_root)))
                        if any(child_rel == item or child_rel.startswith(f"{item}/") for item in excludes):
                            continue
                        resolved.append({"groupId": group.get("id", ""), "groupLabel": group.get("label", ""), "path": child_rel, "mtime": child.stat().st_mtime})
        deduped: dict[str, dict[str, Any]] = {}
        for item in resolved:
            deduped[item["path"]] = item
        return sorted(deduped.values(), key=lambda item: item["path"])

    def _source_change_summary(self, compiled_at: str | None) -> dict[str, Any]:
        compiled_dt = self._parse_iso(compiled_at)
        latest_source = None
        changed: list[dict[str, Any]] = []
        for item in self._resolve_manifest_source_paths():
            latest_source = max(latest_source or item["mtime"], item["mtime"])
            if compiled_dt and datetime.fromtimestamp(item["mtime"], tz=timezone.utc) > compiled_dt:
                changed.append(item)
        return {
            "latestSourceAt": datetime.fromtimestamp(latest_source, tz=timezone.utc).isoformat() if latest_source else None,
            "stale": bool(changed),
            "changedSourceCount": len(changed),
            "changedSources": changed[:24],
        }

    def graph_payload(self) -> dict[str, Any]:
        if not self.enabled():
            return {"enabled": False, "nodes": [], "edges": [], "pages": [], "communities": [], "generatedAt": None}
        data = self._json_data(self.graph_path)
        return {
            "enabled": True,
            "generatedAt": data.get("generatedAt"),
            "nodes": data.get("nodes", []),
            "edges": data.get("edges", []),
            "pages": data.get("pages", []),
            "communities": data.get("communities", []),
        }

    def _extract_open_questions(self) -> list[str]:
        if not self.open_questions_path.exists():
            return []
        _, body = self._read_markdown(self.open_questions_path)
        out: list[str] = []
        for raw_line in body.splitlines():
            line = raw_line.strip()
            if line.startswith("- "):
                out.append(line[2:].strip())
        return out[:10]

    def summary_payload(self) -> dict[str, Any]:
        if not self.enabled():
            return {
                "enabled": False,
                "vaultPath": str(self.vault_root),
                "compiledAt": None,
                "sourceCount": 0,
                "pageCount": 0,
                "nodeCount": 0,
                "edgeCount": 0,
                "openQuestions": [],
                "featuredPages": [],
                "home": "",
            }
        graph = self._json_data(self.graph_path)
        pages = graph.get("pages", [])
        featured_paths = {
            "index.md",
            "graph/report.md",
            "dashboards/open-questions.md",
            "dashboards/recent-sources.md",
            "dashboards/contradictions.md",
            "sources/spec-1447dd6d.md",
            "sources/roadmap-0a538d29.md",
        }
        featured = [page for page in pages if page.get("path") in featured_paths][:8]
        home_text = ""
        if self.home_path.exists():
            _, home_body = self._read_markdown(self.home_path)
            home_text = self._markdown_excerpt(home_body, limit=10)
        return {
            "enabled": True,
            "vaultPath": str(self.vault_root),
            "compiledAt": graph.get("generatedAt"),
            "sourceCount": len(graph.get("sources", [])),
            "pageCount": len(pages),
            "nodeCount": len(graph.get("nodes", [])),
            "edgeCount": len(graph.get("edges", [])),
            "openQuestions": self._extract_open_questions(),
            "featuredPages": featured,
            "home": home_text,
        }

    def status_payload(self) -> dict[str, Any]:
        summary = self.summary_payload()
        source_changes = self._source_change_summary(summary["compiledAt"])
        return {
            "enabled": summary["enabled"],
            "refreshing": self.refresh_state.refreshing,
            "lastRefreshAt": self.refresh_state.last_refresh_at,
            "lastRefreshStatus": self.refresh_state.last_refresh_status,
            "lastRefreshError": self.refresh_state.last_refresh_error,
            "lastRefreshSummary": self.refresh_state.last_refresh_summary,
            "manifest": self.manifest,
            "candidateCounts": self._candidate_counts() if summary["enabled"] else {"pending": 0, "promoted": 0, "archived": 0},
            "compiledAt": summary["compiledAt"],
            "sourceCount": summary["sourceCount"],
            "pageCount": summary["pageCount"],
            "nodeCount": summary["nodeCount"],
            "edgeCount": summary["edgeCount"],
            "stale": source_changes["stale"],
            "latestSourceAt": source_changes["latestSourceAt"],
            "changedSourceCount": source_changes["changedSourceCount"],
            "changedSources": source_changes["changedSources"],
        }

    def resolve_page(self, page_id: str = "", path: str = "") -> Path | None:
        if path:
            candidate = (self.wiki_root / _normalize_path(path)).resolve()
            if self.wiki_root.resolve() not in candidate.parents and candidate != self.wiki_root.resolve():
                return None
            return candidate if candidate.exists() and candidate.is_file() else None
        if not page_id or not self.enabled():
            return None
        graph = self._json_data(self.graph_path)
        for page in graph.get("pages", []):
            if page.get("id") == page_id:
                candidate = (self.wiki_root / str(page.get("path", ""))).resolve()
                return candidate if candidate.exists() and candidate.is_file() else None
        return None

    def page_detail(self, page_id: str = "", path: str = "") -> dict[str, Any] | None:
        resolved = self.resolve_page(page_id=page_id, path=path)
        if not resolved:
            return None
        meta, body = self._read_markdown(resolved)
        page_path = _normalize_path(str(resolved.relative_to(self.wiki_root)))
        page_record = self._page_record_by_path().get(page_path, {})
        review_key = page_record.get("id") or meta.get("page_id") or page_path
        return {
            "enabled": True,
            "id": page_record.get("id") or page_id or meta.get("page_id", ""),
            "path": page_path,
            "title": page_record.get("title") or meta.get("title") or resolved.stem,
            "kind": page_record.get("kind") or meta.get("kind") or "",
            "status": page_record.get("status") or meta.get("status") or "",
            "reviewStatus": self._effective_review_status(str(review_key)),
            "updatedAt": page_record.get("updatedAt") or meta.get("updated_at") or "",
            "sourceIds": page_record.get("sourceIds") or [s for s in str(meta.get("source_ids", "")).split("\n") if s],
            "content": body.strip(),
            "excerpt": self._markdown_excerpt(body, limit=18),
        }

    def candidates_payload(self, status_filter: str = "pending") -> dict[str, Any]:
        if not self.enabled():
            return {"enabled": False, "items": [], "counts": {"pending": 0, "promoted": 0, "archived": 0}}
        items: list[dict[str, Any]] = []
        for candidate in self._candidate_catalog():
            review_status = self._effective_review_status(candidate["id"])
            if status_filter != "all" and review_status != status_filter:
                continue
            candidate = dict(candidate)
            candidate["reviewStatus"] = review_status
            items.append(candidate)
        items.sort(key=lambda item: (item["reviewStatus"] != "pending", item["category"], item["title"].lower()))
        return {"enabled": True, "items": items[:80], "counts": self._candidate_counts()}

    def review_candidate(self, path: str = "", action: ReviewAction = "reset", page_id: str = "") -> dict[str, Any]:
        key = page_id
        if not key:
            page_path = _normalize_path(path)
            match = next((item for item in self._candidate_catalog() if item["path"] == page_path or item["candidatePath"] == page_path), None)
            if not match:
                raise FileNotFoundError(page_path)
            key = match["id"]
        review_state = self._review_state()
        pages = review_state.setdefault("pages", {})
        if action == "reset":
            pages.pop(key, None)
        else:
            pages[key] = {"status": "promoted" if action == "promote" else "archived", "reviewedAt": _iso_now()}
        review_state["updatedAt"] = _iso_now()
        self._write_review_state(review_state)
        match = next((item for item in self._candidate_catalog() if item["id"] == key), None)
        detail = self.page_detail(path=match["path"]) if match else None
        return {"ok": True, "page": detail, "counts": self._candidate_counts()}

    async def start_refresh(self) -> dict[str, Any]:
        if not self.vault_root.exists():
            raise FileNotFoundError(str(self.vault_root))
        if self._refresh_task and not self._refresh_task.done():
            return self.status_payload()
        self.refresh_state.refreshing = True
        self.refresh_state.last_refresh_status = "running"
        self.refresh_state.last_refresh_error = ""
        self.refresh_state.last_refresh_summary = None
        self._refresh_task = asyncio.create_task(self._run_refresh())
        return self.status_payload()

    async def _run_refresh(self) -> None:
        command = self.manifest.get("refreshCommand") or ["npx", "@swarmvaultai/cli", "compile", "--json"]
        try:
            if isinstance(command, str):
                proc = await asyncio.create_subprocess_shell(
                    command,
                    cwd=str(self.vault_root),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
            else:
                proc = await asyncio.create_subprocess_exec(
                    *[str(part) for part in command],
                    cwd=str(self.vault_root),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
            stdout, stderr = await proc.communicate()
            out_text = stdout.decode("utf-8", errors="replace").strip()
            err_text = stderr.decode("utf-8", errors="replace").strip()
            if proc.returncode != 0:
                raise RuntimeError(err_text or out_text or f"refresh exited with {proc.returncode}")
            parsed: dict[str, Any] | None = None
            if out_text:
                try:
                    parsed = json.loads(out_text)
                except json.JSONDecodeError:
                    parsed = {"output": out_text}
            self._json_cache.clear()
            self.manifest = self._load_manifest()
            self.refresh_state.last_refresh_status = "ok"
            self.refresh_state.last_refresh_error = ""
            self.refresh_state.last_refresh_summary = parsed
        except Exception as exc:
            self.refresh_state.last_refresh_status = "error"
            self.refresh_state.last_refresh_error = str(exc)
            _log.exception("knowledge refresh failed: %s", exc)
        finally:
            self.refresh_state.refreshing = False
            self.refresh_state.last_refresh_at = _iso_now()

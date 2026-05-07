---
page_id: 'concept:tauri'
kind: concept
cssclasses:
  - swarmvault
  - sv-concept
title: tauri
source_class: first_party
tags:
  - concept
  - candidate
source_ids:
  - maintainer-release-checklist-e92a78c9
  - spec-1447dd6d
project_ids: []
node_ids:
  - 'concept:tauri'
freshness: fresh
status: candidate
confidence: 0.8
created_at: '2026-05-07T06:20:18.190Z'
updated_at: '2026-05-07T06:20:18.190Z'
compiled_from:
  - maintainer-release-checklist-e92a78c9
  - spec-1447dd6d
managed_by: system
backlinks:
  - 'source:maintainer-release-checklist-e92a78c9'
  - 'source:spec-1447dd6d'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  maintainer-release-checklist-e92a78c9: e92a78c96aa2aca59e4fe1f818d76f6b436ab9dd1da94931d3d852c6718ad951
  spec-1447dd6d: 1447dd6db313185f96a4dde51f5bc57dfe980e304b0ebaaea45bf218532b3156
source_semantic_hashes:
  maintainer-release-checklist-e92a78c9: 7e3e1cf6afdea1ce76dc3b8bd50e32bc351e7b4c7e1bcde6c8d648acefc86cb4
  spec-1447dd6d: f06ea38e13bf243d750a9bbb740cafea87e7a19382ce8ac5ca92be218024b8d0
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# tauri

## Summary

Frequently referenced concept in Maintainer Release Checklist.

## Seen In

- [[sources/maintainer-release-checklist-e92a78c9|Maintainer Release Checklist]]
- [[sources/spec-1447dd6d|SPEC]]

## Source Claims

- ## Required Checks - [ ] npm ci - [ ] npm run typecheck - [ ] npm test - [ ] npm run build - [ ] cd backend && uv sync --dev - [ ] cd backend && uv run python -m pytest tests/test_regressions.py tests/test_api.py::TestAuthGate - [ ] cd src-tauri && cargo check ## Privacy And Safety - [ ] No .env , API keys, cookies, bearer tokens, private resumes, generated PDFs, local databases, graph stores, vector stores, or packaged sidecar binaries are committed. [source:maintainer-release-checklist-e92a78c9]
- Technical Stack Shell/OS Bridge: Tauri 2.0 (Rust) Frontend: React (Vite), TypeScript, Tailwind CSS, Framer Motion Orchestrator: Python 3.12+ (managed by uv) State Machine: LangGraph Backend API: FastAPI (Localhost, dynamic port) Databases: Graph: Kùzu (Embedded Property Graph) Vector: LanceDB (Embedded Vector Store) Relational/State: SQLite Execution: Playwright (Python) + Vision-Language Model (VLM) fallbacks 3. [source:spec-1447dd6d]


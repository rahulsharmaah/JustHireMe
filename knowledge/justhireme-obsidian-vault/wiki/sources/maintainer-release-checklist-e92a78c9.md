---
page_id: 'source:maintainer-release-checklist-e92a78c9'
kind: source
cssclasses:
  - swarmvault
  - sv-source
title: Maintainer Release Checklist
source_class: first_party
tags:
  - source
source_ids:
  - maintainer-release-checklist-e92a78c9
project_ids: []
node_ids:
  - 'source:maintainer-release-checklist-e92a78c9'
  - 'concept:release'
  - 'concept:tauri'
  - 'concept:backend'
  - 'concept:test'
  - 'concept:build'
  - 'concept:before'
  - 'entity:release-checklist-use'
  - 'entity:required-checks'
  - 'entity:privacy-and-safety'
  - 'entity:justhireme'
  - 'entity:websocket'
  - 'entity:run'
freshness: fresh
status: active
confidence: 1
created_at: '2026-05-07T06:20:18.177Z'
updated_at: '2026-05-07T06:20:18.177Z'
compiled_from:
  - maintainer-release-checklist-e92a78c9
managed_by: system
backlinks:
  - 'concept:release'
  - 'concept:tauri'
  - 'concept:backend'
  - 'concept:test'
  - 'concept:build'
  - 'concept:before'
  - 'entity:release-checklist-use'
  - 'entity:required-checks'
  - 'entity:privacy-and-safety'
  - 'entity:justhireme'
  - 'entity:websocket'
  - 'entity:run'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  maintainer-release-checklist-e92a78c9: e92a78c96aa2aca59e4fe1f818d76f6b436ab9dd1da94931d3d852c6718ad951
source_semantic_hashes:
  maintainer-release-checklist-e92a78c9: 7e3e1cf6afdea1ce76dc3b8bd50e32bc351e7b4c7e1bcde6c8d648acefc86cb4
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# Maintainer Release Checklist

Source ID: `maintainer-release-checklist-e92a78c9`
Source Kind: `markdown`
Source Path: `D:/projects/JustHireMe/docs/MAINTAINER_RELEASE_CHECKLIST.md`

Source Class: `first_party`


## Summary

Maintainer Release Checklist Use this before cutting a public release or sharing a build link. ## Required Checks - [ ] npm ci - [ ] npm run typecheck - [ ] npm test - [ ] npm run build - [ ] cd backend && uv sync --dev - [ ] cd backend && uv run python -m pytest tests/test_regressions.py tests/test_api.py::TestAuthGate - [ ] cd src-tauri && cargo check ## Privacy And Safety - [ ] No .env , API keys, cookies, bearer tokens, private resumes, generated PDFs, local databases, graph stores, vector stores, or packaged sidecar binaries are committed. - [ ] Browser automation and auto-apply behavior is documented as experimental and opt-in.

## Concepts

- [[concepts/release|release]]: Frequently referenced concept in Maintainer Release Checklist.
- [[concepts/tauri|tauri]]: Frequently referenced concept in Maintainer Release Checklist.
- [[concepts/backend|backend]]: Frequently referenced concept in Maintainer Release Checklist.
- [[concepts/test|test]]: Frequently referenced concept in Maintainer Release Checklist.
- [[concepts/build|build]]: Frequently referenced concept in Maintainer Release Checklist.
- [[concepts/before|before]]: Frequently referenced concept in Maintainer Release Checklist.

## Entities

- [[entities/release-checklist-use|Release Checklist Use]]: Named entity mentioned in Maintainer Release Checklist.
- [[entities/required-checks|Required Checks - [ ]]]: Named entity mentioned in Maintainer Release Checklist.
- [[entities/privacy-and-safety|Privacy And Safety - [ ]]]: Named entity mentioned in Maintainer Release Checklist.
- [[entities/justhireme|JustHireMe]]: Named entity mentioned in Maintainer Release Checklist.
- [[entities/websocket|WebSocket]]: Named entity mentioned in Maintainer Release Checklist.
- [[entities/run|Run]]: Named entity mentioned in Maintainer Release Checklist.

## Claims

- Maintainer Release Checklist Use this before cutting a public release or sharing a build link. [source:maintainer-release-checklist-e92a78c9]
- ## Required Checks - [ ] npm ci - [ ] npm run typecheck - [ ] npm test - [ ] npm run build - [ ] cd backend && uv sync --dev - [ ] cd backend && uv run python -m pytest tests/test_regressions.py tests/test_api.py::TestAuthGate - [ ] cd src-tauri && cargo check ## Privacy And Safety - [ ] No .env , API keys, cookies, bearer tokens, private resumes, generated PDFs, local databases, graph stores, vector stores, or packaged sidecar binaries are committed. [source:maintainer-release-checklist-e92a78c9]
- - [ ] Browser automation and auto-apply behavior is documented as experimental and opt-in. [source:maintainer-release-checklist-e92a78c9]
- - [ ] Release notes describe JustHireMe as local-first and do not imply a hosted backend. [source:maintainer-release-checklist-e92a78c9]

## Questions

- How does release relate to Maintainer Release Checklist?
- How does tauri relate to Maintainer Release Checklist?
- How does backend relate to Maintainer Release Checklist?


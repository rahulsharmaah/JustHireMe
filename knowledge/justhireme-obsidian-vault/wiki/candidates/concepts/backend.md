---
page_id: 'concept:backend'
kind: concept
cssclasses:
  - swarmvault
  - sv-concept
title: backend
source_class: first_party
tags:
  - concept
  - candidate
source_ids:
  - architecture-1e26a0b9
  - justhireme-mcp-73dcb246
  - maintainer-release-checklist-e92a78c9
  - the-short-version-46ce9e60
project_ids: []
node_ids:
  - 'concept:backend'
freshness: fresh
status: candidate
confidence: 0.95
created_at: '2026-05-07T06:20:18.181Z'
updated_at: '2026-05-07T06:20:18.181Z'
compiled_from:
  - architecture-1e26a0b9
  - justhireme-mcp-73dcb246
  - maintainer-release-checklist-e92a78c9
  - the-short-version-46ce9e60
managed_by: system
backlinks:
  - 'source:architecture-1e26a0b9'
  - 'source:justhireme-mcp-73dcb246'
  - 'source:maintainer-release-checklist-e92a78c9'
  - 'source:the-short-version-46ce9e60'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  architecture-1e26a0b9: 1e26a0b9d50c432780dec5c416f013d2739ec676702729bf4f6dc99e1dcc6715
  justhireme-mcp-73dcb246: 73dcb246bec78614ebbba393d8e765ba168f2df6ded24cf086a4071ea9cc41d0
  maintainer-release-checklist-e92a78c9: e92a78c96aa2aca59e4fe1f818d76f6b436ab9dd1da94931d3d852c6718ad951
  the-short-version-46ce9e60: 46ce9e60485c95b15c28f3490d5393e17c5446eddd11a8b91547e3803bf7c717
source_semantic_hashes:
  architecture-1e26a0b9: 4a549090498fb2e578244582ec7834d43f11898380c92cd2041e7520499333d5
  justhireme-mcp-73dcb246: ec179a767ee67326d679b2e686ee8ad32fb9e43c8eb3ceffce078e41266fce0d
  maintainer-release-checklist-e92a78c9: 7e3e1cf6afdea1ce76dc3b8bd50e32bc351e7b4c7e1bcde6c8d648acefc86cb4
  the-short-version-46ce9e60: 779d827101f6a15f9b09fa4468140c2f7bace5194f23dd2dff9b98ea4d873284
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# backend

## Summary

Frequently referenced concept in Architecture.

## Seen In

- [[sources/architecture-1e26a0b9|Architecture]]
- [[sources/justhireme-mcp-73dcb246|JustHireMe MCP]]
- [[sources/maintainer-release-checklist-e92a78c9|Maintainer Release Checklist]]
- [[sources/the-short-version-46ce9e60|The Short Version]]

## Source Claims

- Architecture JustHireMe is a local-first desktop app with a Tauri shell, React frontend, and Python backend sidecar. [source:architecture-1e26a0b9]
- ## High-Level Flow text Profile ingestion -> Kuzu graph + LanceDB vectors -> Source scrapers -> Lead quality gate -> Fit ranking / semantic matching -> Customization package generation -> Local CRM and review UI ## Frontend The React app in src/ is responsible for: - navigation and workspace UI - lead cards and filters - settings - profile and ingestion screens - customization package review - WebSocket event display The frontend talks to the backend through authenticated local HTTP requests. [source:architecture-1e26a0b9]
- Tauri provides the backend port and API token at runtime. [source:architecture-1e26a0b9]
- ## Backend The Python backend in backend/ is responsible for: - FastAPI routes - source scraping - quality gating - ranking and evaluation - profile ingestion - vector search fallback behavior - PDF and outreach generation - local persistence Important modules: - backend/agents/free_scout.py : direct/free source scraping - backend/agents/scout.py : broader source scraping - backend/agents/quality_gate.py : pre-save quality checks - backend/agents/scoring_engine.py : deterministic fit scoring - backend/agents/semantic.py : LanceDB semantic matching - backend/agents/generator.py : resume, cover letter, and outreach package generation - backend/db/client.py : SQLite, Kuzu, LanceDB access helpers ## Storage Local storage includes: - SQLite for leads, settings, events, generated asset metadata - Kuzu for profile graph data - LanceDB for profile vectors - local files for generated PDFs These files should not be committed or uploaded in public issues. [source:architecture-1e26a0b9]
- ## Start From the repository root: powershell backend\.venv\Scripts\python.exe backend\mcp_server.py The server implements initialize , tools/list , and tools/call over newline-delimited JSON-RPC on stdio. [source:justhireme-mcp-73dcb246]
- ## Required Checks - [ ] npm ci - [ ] npm run typecheck - [ ] npm test - [ ] npm run build - [ ] cd backend && uv sync --dev - [ ] cd backend && uv run python -m pytest tests/test_regressions.py tests/test_api.py::TestAuthGate - [ ] cd src-tauri && cargo check ## Privacy And Safety - [ ] No .env , API keys, cookies, bearer tokens, private resumes, generated PDFs, local databases, graph stores, vector stores, or packaged sidecar binaries are committed. [source:maintainer-release-checklist-e92a78c9]
- - [ ] Release notes describe JustHireMe as local-first and do not imply a hosted backend. [source:maintainer-release-checklist-e92a78c9]
- <p align="center"> <img src="docs/assets/justhireme-hero.png" alt="JustHireMe local-first job intelligence workbench hero" width="100%" /> </p> <h1 align="center">JustHireMe</h1> <p align="center"> <strong>Local-first AI job intelligence for scraping better roles, ranking fit, and generating tailored application materials.</strong> </p> <p align="center"> <a href="LICENSE"><img alt="License: Personal Open Source" src="https://img.shields.io/badge/license-personal%20open%20source-2ea44f?style=for-the-badge"></a> <img alt="Status: Alpha" src="https://img.shields.io/badge/status-alpha-f59e0b?style=for-the-badge"> <img alt="Local First" src="https://img.shields.io/badge/local--first-yes-0ea5e9?style=for-the-badge"> <img alt="Desktop: Tauri" src="https://img.shields.io/badge/desktop-Tauri-24c8db?style=for-the-badge"> <img alt="Backend: Python" src="https://img.shields.io/badge/backend-Python_3.13-3776ab?style=for-the-badge"> </p> <p align="center"> <a href="#what-it-does">What It Does</a> &middot; <a href="#visual-workflow">Workflow</a> &middot; <a href="#architecture">Architecture</a> &middot; <a href="#quick-start">Quick Start</a> &middot; <a href="#agent-skill-and-mcp">Agent Skill + MCP</a> &middot; <a href="#contributing">Contributing</a> &middot; <a href="#roadmap">Roadmap</a> </p> --- ## The Short Version JustHireMe is an open-source desktop workbench for people who are tired of noisy job boards and black-box AI apply tools. [source:the-short-version-46ce9e60]


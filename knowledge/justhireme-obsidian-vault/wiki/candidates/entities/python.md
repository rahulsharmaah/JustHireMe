---
page_id: 'entity:python'
kind: entity
cssclasses:
  - swarmvault
  - sv-entity
title: Python
source_class: first_party
tags:
  - entity
  - candidate
source_ids:
  - architecture-1e26a0b9
  - the-short-version-46ce9e60
project_ids: []
node_ids:
  - 'entity:python'
freshness: fresh
status: candidate
confidence: 0.8
created_at: '2026-05-07T06:20:18.199Z'
updated_at: '2026-05-07T06:20:18.199Z'
compiled_from:
  - architecture-1e26a0b9
  - the-short-version-46ce9e60
managed_by: system
backlinks:
  - 'source:architecture-1e26a0b9'
  - 'source:the-short-version-46ce9e60'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  architecture-1e26a0b9: 1e26a0b9d50c432780dec5c416f013d2739ec676702729bf4f6dc99e1dcc6715
  the-short-version-46ce9e60: 46ce9e60485c95b15c28f3490d5393e17c5446eddd11a8b91547e3803bf7c717
source_semantic_hashes:
  architecture-1e26a0b9: 4a549090498fb2e578244582ec7834d43f11898380c92cd2041e7520499333d5
  the-short-version-46ce9e60: 779d827101f6a15f9b09fa4468140c2f7bace5194f23dd2dff9b98ea4d873284
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# Python

## Summary

Named entity mentioned in Architecture.

## Seen In

- [[sources/architecture-1e26a0b9|Architecture]]
- [[sources/the-short-version-46ce9e60|The Short Version]]

## Source Claims

- Architecture JustHireMe is a local-first desktop app with a Tauri shell, React frontend, and Python backend sidecar. [source:architecture-1e26a0b9]
- ## Backend The Python backend in backend/ is responsible for: - FastAPI routes - source scraping - quality gating - ranking and evaluation - profile ingestion - vector search fallback behavior - PDF and outreach generation - local persistence Important modules: - backend/agents/free_scout.py : direct/free source scraping - backend/agents/scout.py : broader source scraping - backend/agents/quality_gate.py : pre-save quality checks - backend/agents/scoring_engine.py : deterministic fit scoring - backend/agents/semantic.py : LanceDB semantic matching - backend/agents/generator.py : resume, cover letter, and outreach package generation - backend/db/client.py : SQLite, Kuzu, LanceDB access helpers ## Storage Local storage includes: - SQLite for leads, settings, events, generated asset metadata - Kuzu for profile graph data - LanceDB for profile vectors - local files for generated PDFs These files should not be committed or uploaded in public issues. [source:architecture-1e26a0b9]
- <p align="center"> <img src="docs/assets/justhireme-hero.png" alt="JustHireMe local-first job intelligence workbench hero" width="100%" /> </p> <h1 align="center">JustHireMe</h1> <p align="center"> <strong>Local-first AI job intelligence for scraping better roles, ranking fit, and generating tailored application materials.</strong> </p> <p align="center"> <a href="LICENSE"><img alt="License: Personal Open Source" src="https://img.shields.io/badge/license-personal%20open%20source-2ea44f?style=for-the-badge"></a> <img alt="Status: Alpha" src="https://img.shields.io/badge/status-alpha-f59e0b?style=for-the-badge"> <img alt="Local First" src="https://img.shields.io/badge/local--first-yes-0ea5e9?style=for-the-badge"> <img alt="Desktop: Tauri" src="https://img.shields.io/badge/desktop-Tauri-24c8db?style=for-the-badge"> <img alt="Backend: Python" src="https://img.shields.io/badge/backend-Python_3.13-3776ab?style=for-the-badge"> </p> <p align="center"> <a href="#what-it-does">What It Does</a> &middot; <a href="#visual-workflow">Workflow</a> &middot; <a href="#architecture">Architecture</a> &middot; <a href="#quick-start">Quick Start</a> &middot; <a href="#agent-skill-and-mcp">Agent Skill + MCP</a> &middot; <a href="#contributing">Contributing</a> &middot; <a href="#roadmap">Roadmap</a> </p> --- ## The Short Version JustHireMe is an open-source desktop workbench for people who are tired of noisy job boards and black-box AI apply tools. [source:the-short-version-46ce9e60]
- | Area | Status | | --- | --- | | Frontend workbench | Active | | Python sidecar API | Active | | Scraper, ranking, vector matching, and customizer core | Supported OSS scope | | Windows desktop packaging | First release target | | Browser automation / auto-apply | Experimental lab, disabled by default | | API key storage | Local app settings for now; OS keychain planned | If you are new here, start with the frontend preview first. [source:the-short-version-46ce9e60]


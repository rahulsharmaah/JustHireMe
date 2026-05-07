---
page_id: 'source:architecture-1e26a0b9'
kind: source
cssclasses:
  - swarmvault
  - sv-source
title: Architecture
source_class: first_party
tags:
  - source
source_ids:
  - architecture-1e26a0b9
project_ids: []
node_ids:
  - 'source:architecture-1e26a0b9'
  - 'concept:backend'
  - 'concept:agents'
  - 'concept:local'
  - 'concept:profile'
  - 'concept:lancedb'
  - 'concept:quality'
  - 'entity:justhireme'
  - 'entity:tauri'
  - 'entity:react'
  - 'entity:python'
  - 'entity:high-level-flow'
  - 'entity:profile'
freshness: fresh
status: active
confidence: 1
created_at: '2026-05-07T06:20:18.169Z'
updated_at: '2026-05-07T06:20:18.169Z'
compiled_from:
  - architecture-1e26a0b9
managed_by: system
backlinks:
  - 'concept:backend'
  - 'concept:agents'
  - 'concept:local'
  - 'concept:profile'
  - 'concept:lancedb'
  - 'concept:quality'
  - 'entity:justhireme'
  - 'entity:tauri'
  - 'entity:react'
  - 'entity:python'
  - 'entity:high-level-flow'
  - 'entity:profile'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  architecture-1e26a0b9: 1e26a0b9d50c432780dec5c416f013d2739ec676702729bf4f6dc99e1dcc6715
source_semantic_hashes:
  architecture-1e26a0b9: 4a549090498fb2e578244582ec7834d43f11898380c92cd2041e7520499333d5
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# Architecture

Source ID: `architecture-1e26a0b9`
Source Kind: `markdown`
Source Path: `D:/projects/JustHireMe/docs/ARCHITECTURE.md`

Source Class: `first_party`


## Summary

Architecture JustHireMe is a local-first desktop app with a Tauri shell, React frontend, and Python backend sidecar. ## High-Level Flow text Profile ingestion -> Kuzu graph + LanceDB vectors -> Source scrapers -> Lead quality gate -> Fit ranking / semantic matching -> Customization package generation -> Local CRM and review UI ## Frontend The React app in src/ is responsible for: - navigation and workspace UI - lead cards and filters - settings - profile and ingestion screens - customization package review - WebSocket event display The frontend talks to the backend through authenticated local HTTP requests. Tauri provides the backend port and API token at runtime.

## Concepts

- [[concepts/backend|backend]]: Frequently referenced concept in Architecture.
- [[concepts/agents|agents]]: Frequently referenced concept in Architecture.
- [[concepts/local|local]]: Frequently referenced concept in Architecture.
- [[concepts/profile|profile]]: Frequently referenced concept in Architecture.
- [[concepts/lancedb|lancedb]]: Frequently referenced concept in Architecture.
- [[concepts/quality|quality]]: Frequently referenced concept in Architecture.

## Entities

- [[entities/justhireme|JustHireMe]]: Named entity mentioned in Architecture.
- [[entities/tauri|Tauri]]: Named entity mentioned in Architecture.
- [[entities/react|React]]: Named entity mentioned in Architecture.
- [[entities/python|Python]]: Named entity mentioned in Architecture.
- [[entities/high-level-flow|High-Level Flow]]: Named entity mentioned in Architecture.
- [[entities/profile|Profile]]: Named entity mentioned in Architecture.

## Claims

- Architecture JustHireMe is a local-first desktop app with a Tauri shell, React frontend, and Python backend sidecar. [source:architecture-1e26a0b9]
- ## High-Level Flow text Profile ingestion -> Kuzu graph + LanceDB vectors -> Source scrapers -> Lead quality gate -> Fit ranking / semantic matching -> Customization package generation -> Local CRM and review UI ## Frontend The React app in src/ is responsible for: - navigation and workspace UI - lead cards and filters - settings - profile and ingestion screens - customization package review - WebSocket event display The frontend talks to the backend through authenticated local HTTP requests. [source:architecture-1e26a0b9]
- Tauri provides the backend port and API token at runtime. [source:architecture-1e26a0b9]
- ## Backend The Python backend in backend/ is responsible for: - FastAPI routes - source scraping - quality gating - ranking and evaluation - profile ingestion - vector search fallback behavior - PDF and outreach generation - local persistence Important modules: - backend/agents/free_scout.py : direct/free source scraping - backend/agents/scout.py : broader source scraping - backend/agents/quality_gate.py : pre-save quality checks - backend/agents/scoring_engine.py : deterministic fit scoring - backend/agents/semantic.py : LanceDB semantic matching - backend/agents/generator.py : resume, cover letter, and outreach package generation - backend/db/client.py : SQLite, Kuzu, LanceDB access helpers ## Storage Local storage includes: - SQLite for leads, settings, events, generated asset metadata - Kuzu for profile graph data - LanceDB for profile vectors - local files for generated PDFs These files should not be committed or uploaded in public issues. [source:architecture-1e26a0b9]

## Questions

- How does backend relate to Architecture?
- How does agents relate to Architecture?
- How does local relate to Architecture?


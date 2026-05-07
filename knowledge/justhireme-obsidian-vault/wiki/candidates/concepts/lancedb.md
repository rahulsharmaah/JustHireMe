---
page_id: 'concept:lancedb'
kind: concept
cssclasses:
  - swarmvault
  - sv-concept
title: lancedb
source_class: first_party
tags:
  - concept
  - candidate
source_ids:
  - architecture-1e26a0b9
project_ids: []
node_ids:
  - 'concept:lancedb'
freshness: fresh
status: candidate
confidence: 0.65
created_at: '2026-05-07T06:20:18.184Z'
updated_at: '2026-05-07T06:20:18.184Z'
compiled_from:
  - architecture-1e26a0b9
managed_by: system
backlinks:
  - 'source:architecture-1e26a0b9'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  architecture-1e26a0b9: 1e26a0b9d50c432780dec5c416f013d2739ec676702729bf4f6dc99e1dcc6715
source_semantic_hashes:
  architecture-1e26a0b9: 4a549090498fb2e578244582ec7834d43f11898380c92cd2041e7520499333d5
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# lancedb

## Summary

Frequently referenced concept in Architecture.

## Seen In

- [[sources/architecture-1e26a0b9|Architecture]]

## Source Claims

- ## High-Level Flow text Profile ingestion -> Kuzu graph + LanceDB vectors -> Source scrapers -> Lead quality gate -> Fit ranking / semantic matching -> Customization package generation -> Local CRM and review UI ## Frontend The React app in src/ is responsible for: - navigation and workspace UI - lead cards and filters - settings - profile and ingestion screens - customization package review - WebSocket event display The frontend talks to the backend through authenticated local HTTP requests. [source:architecture-1e26a0b9]
- ## Backend The Python backend in backend/ is responsible for: - FastAPI routes - source scraping - quality gating - ranking and evaluation - profile ingestion - vector search fallback behavior - PDF and outreach generation - local persistence Important modules: - backend/agents/free_scout.py : direct/free source scraping - backend/agents/scout.py : broader source scraping - backend/agents/quality_gate.py : pre-save quality checks - backend/agents/scoring_engine.py : deterministic fit scoring - backend/agents/semantic.py : LanceDB semantic matching - backend/agents/generator.py : resume, cover letter, and outreach package generation - backend/db/client.py : SQLite, Kuzu, LanceDB access helpers ## Storage Local storage includes: - SQLite for leads, settings, events, generated asset metadata - Kuzu for profile graph data - LanceDB for profile vectors - local files for generated PDFs These files should not be committed or uploaded in public issues. [source:architecture-1e26a0b9]


---
page_id: 'concept:quality'
kind: concept
cssclasses:
  - swarmvault
  - sv-concept
title: quality
source_class: first_party
tags:
  - concept
  - candidate
source_ids:
  - architecture-1e26a0b9
  - roadmap-0a538d29
  - source-adapter-contract-7d8012af
  - the-short-version-46ce9e60
project_ids: []
node_ids:
  - 'concept:quality'
freshness: fresh
status: candidate
confidence: 0.95
created_at: '2026-05-07T06:20:18.185Z'
updated_at: '2026-05-07T06:20:18.185Z'
compiled_from:
  - architecture-1e26a0b9
  - roadmap-0a538d29
  - source-adapter-contract-7d8012af
  - the-short-version-46ce9e60
managed_by: system
backlinks:
  - 'source:architecture-1e26a0b9'
  - 'source:roadmap-0a538d29'
  - 'source:source-adapter-contract-7d8012af'
  - 'source:the-short-version-46ce9e60'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  architecture-1e26a0b9: 1e26a0b9d50c432780dec5c416f013d2739ec676702729bf4f6dc99e1dcc6715
  roadmap-0a538d29: 0a538d29d01aaad5729495e19133bef7c428f976b9889e84defe98fbbbec4f91
  source-adapter-contract-7d8012af: 7d8012afa0e2971312e18c8b5cee3d7c79f248a0d10620846e3c6de5b73f6f82
  the-short-version-46ce9e60: 46ce9e60485c95b15c28f3490d5393e17c5446eddd11a8b91547e3803bf7c717
source_semantic_hashes:
  architecture-1e26a0b9: 4a549090498fb2e578244582ec7834d43f11898380c92cd2041e7520499333d5
  roadmap-0a538d29: dbb5502f5d095420ca216cb207b0e0854b412b1d2f5c976fc507b13731990600
  source-adapter-contract-7d8012af: a93d9d0d15be1a0b3405fcb3c3f5633597668d33d4ea2365fd3a3c0470f7a81a
  the-short-version-46ce9e60: 779d827101f6a15f9b09fa4468140c2f7bace5194f23dd2dff9b98ea4d873284
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# quality

## Summary

Frequently referenced concept in Architecture.

## Seen In

- [[sources/architecture-1e26a0b9|Architecture]]
- [[sources/roadmap-0a538d29|Roadmap]]
- [[sources/source-adapter-contract-7d8012af|Source Adapter Contract]]
- [[sources/the-short-version-46ce9e60|The Short Version]]

## Source Claims

- ## High-Level Flow text Profile ingestion -> Kuzu graph + LanceDB vectors -> Source scrapers -> Lead quality gate -> Fit ranking / semantic matching -> Customization package generation -> Local CRM and review UI ## Frontend The React app in src/ is responsible for: - navigation and workspace UI - lead cards and filters - settings - profile and ingestion screens - customization package review - WebSocket event display The frontend talks to the backend through authenticated local HTTP requests. [source:architecture-1e26a0b9]
- ## Backend The Python backend in backend/ is responsible for: - FastAPI routes - source scraping - quality gating - ranking and evaluation - profile ingestion - vector search fallback behavior - PDF and outreach generation - local persistence Important modules: - backend/agents/free_scout.py : direct/free source scraping - backend/agents/scout.py : broader source scraping - backend/agents/quality_gate.py : pre-save quality checks - backend/agents/scoring_engine.py : deterministic fit scoring - backend/agents/semantic.py : LanceDB semantic matching - backend/agents/generator.py : resume, cover letter, and outreach package generation - backend/db/client.py : SQLite, Kuzu, LanceDB access helpers ## Storage Local storage includes: - SQLite for leads, settings, events, generated asset metadata - Kuzu for profile graph data - LanceDB for profile vectors - local files for generated PDFs These files should not be committed or uploaded in public issues. [source:architecture-1e26a0b9]
- - Add lead quality gate before saving low-value leads. [source:roadmap-0a538d29]
- ## Normalized Lead Fields Required: - title : role title - company : company or source owner - url : canonical apply/source URL - platform : stable source id, such as greenhouse , lever , hn_hiring - description : useful job text for ranking/customization Recommended: - posted_date : visible source date when available - location : remote/location text - tech_stack : list of detected technologies - signal_score : source-level quality score - signal_reason : short explanation of source signal - signal_tags : source tags - source_meta : source-specific metadata ## Quality Gate Before saving, leads should pass agents.quality_gate.evaluate_lead_quality . [source:source-adapter-contract-7d8012af]
- The gate rejects or down-ranks: - missing URLs - thin scraped rows - stale jobs - senior-only jobs in beginner-focused feeds - spam, unpaid, or low-trust postings - missing company/context signals Saved leads should keep source_meta.lead_quality_score and source_meta.lead_quality_reason so users and contributors can understand why the lead was shown. [source:source-adapter-contract-7d8012af]


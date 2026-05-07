---
page_id: 'entity:high-level-flow'
kind: entity
cssclasses:
  - swarmvault
  - sv-entity
title: High-Level Flow
source_class: first_party
tags:
  - entity
  - candidate
source_ids:
  - architecture-1e26a0b9
project_ids: []
node_ids:
  - 'entity:high-level-flow'
freshness: fresh
status: candidate
confidence: 0.65
created_at: '2026-05-07T06:20:18.199Z'
updated_at: '2026-05-07T06:20:18.199Z'
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
# High-Level Flow

## Summary

Named entity mentioned in Architecture.

## Seen In

- [[sources/architecture-1e26a0b9|Architecture]]

## Source Claims

- ## High-Level Flow text Profile ingestion -> Kuzu graph + LanceDB vectors -> Source scrapers -> Lead quality gate -> Fit ranking / semantic matching -> Customization package generation -> Local CRM and review UI ## Frontend The React app in src/ is responsible for: - navigation and workspace UI - lead cards and filters - settings - profile and ingestion screens - customization package review - WebSocket event display The frontend talks to the backend through authenticated local HTTP requests. [source:architecture-1e26a0b9]


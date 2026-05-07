---
page_id: 'concept:lead'
kind: concept
cssclasses:
  - swarmvault
  - sv-concept
title: lead
source_class: first_party
tags:
  - concept
  - candidate
source_ids:
  - justhireme-mcp-73dcb246
  - justhireme-task-queue-ab463a5f
  - roadmap-0a538d29
  - source-adapter-contract-7d8012af
project_ids: []
node_ids:
  - 'concept:lead'
freshness: fresh
status: candidate
confidence: 0.95
created_at: '2026-05-07T06:20:18.186Z'
updated_at: '2026-05-07T06:20:18.186Z'
compiled_from:
  - justhireme-mcp-73dcb246
  - justhireme-task-queue-ab463a5f
  - roadmap-0a538d29
  - source-adapter-contract-7d8012af
managed_by: system
backlinks:
  - 'source:justhireme-mcp-73dcb246'
  - 'source:justhireme-task-queue-ab463a5f'
  - 'source:roadmap-0a538d29'
  - 'source:source-adapter-contract-7d8012af'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  justhireme-mcp-73dcb246: 73dcb246bec78614ebbba393d8e765ba168f2df6ded24cf086a4071ea9cc41d0
  justhireme-task-queue-ab463a5f: ab463a5f5e805e9dea08f6bfb8d37d0473febc7d98c20fd2ca9e73a5f6fdaf0e
  roadmap-0a538d29: 0a538d29d01aaad5729495e19133bef7c428f976b9889e84defe98fbbbec4f91
  source-adapter-contract-7d8012af: 7d8012afa0e2971312e18c8b5cee3d7c79f248a0d10620846e3c6de5b73f6f82
source_semantic_hashes:
  justhireme-mcp-73dcb246: ec179a767ee67326d679b2e686ee8ad32fb9e43c8eb3ceffce078e41266fce0d
  justhireme-task-queue-ab463a5f: 6f7aa735fb5769c0a0fe9614c7d803edf90ce414d58dd6651a10ccfdb9e669e3
  roadmap-0a538d29: dbb5502f5d095420ca216cb207b0e0854b412b1d2f5c976fc507b13731990600
  source-adapter-contract-7d8012af: a93d9d0d15be1a0b3405fcb3c3f5633597668d33d4ea2365fd3a3c0470f7a81a
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# lead

## Summary

Frequently referenced concept in JustHireMe MCP.

## Seen In

- [[sources/justhireme-mcp-73dcb246|JustHireMe MCP]]
- [[sources/justhireme-task-queue-ab463a5f|JustHireMe Task Queue]]
- [[sources/roadmap-0a538d29|Roadmap]]
- [[sources/source-adapter-contract-7d8012af|Source Adapter Contract]]

## Source Claims

- JustHireMe MCP JustHireMe exposes a lightweight stdio MCP server for agent workflows that need job lead intelligence without running the full desktop app. [source:justhireme-mcp-73dcb246]
- - evaluate_lead_quality : runs the deterministic lead quality gate for a normalized lead. [source:justhireme-mcp-73dcb246]
- - Add lead quality gate before saving low-value leads. [source:roadmap-0a538d29]
- Source Adapter Contract Source adapters turn external job sources into normalized lead dictionaries. [source:source-adapter-contract-7d8012af]
- ## Normalized Lead Fields Required: - title : role title - company : company or source owner - url : canonical apply/source URL - platform : stable source id, such as greenhouse , lever , hn_hiring - description : useful job text for ranking/customization Recommended: - posted_date : visible source date when available - location : remote/location text - tech_stack : list of detected technologies - signal_score : source-level quality score - signal_reason : short explanation of source signal - signal_tags : source tags - source_meta : source-specific metadata ## Quality Gate Before saving, leads should pass agents.quality_gate.evaluate_lead_quality . [source:source-adapter-contract-7d8012af]
- The gate rejects or down-ranks: - missing URLs - thin scraped rows - stale jobs - senior-only jobs in beginner-focused feeds - spam, unpaid, or low-trust postings - missing company/context signals Saved leads should keep source_meta.lead_quality_score and source_meta.lead_quality_reason so users and contributors can understand why the lead was shown. [source:source-adapter-contract-7d8012af]


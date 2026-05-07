---
page_id: 'concept:company'
kind: concept
cssclasses:
  - swarmvault
  - sv-concept
title: company
source_class: first_party
tags:
  - concept
  - candidate
source_ids:
  - source-adapter-contract-7d8012af
project_ids: []
node_ids:
  - 'concept:company'
freshness: fresh
status: candidate
confidence: 0.65
created_at: '2026-05-07T06:20:18.192Z'
updated_at: '2026-05-07T06:20:18.192Z'
compiled_from:
  - source-adapter-contract-7d8012af
managed_by: system
backlinks:
  - 'source:source-adapter-contract-7d8012af'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  source-adapter-contract-7d8012af: 7d8012afa0e2971312e18c8b5cee3d7c79f248a0d10620846e3c6de5b73f6f82
source_semantic_hashes:
  source-adapter-contract-7d8012af: a93d9d0d15be1a0b3405fcb3c3f5633597668d33d4ea2365fd3a3c0470f7a81a
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# company

## Summary

Frequently referenced concept in Source Adapter Contract.

## Seen In

- [[sources/source-adapter-contract-7d8012af|Source Adapter Contract]]

## Source Claims

- ## Normalized Lead Fields Required: - title : role title - company : company or source owner - url : canonical apply/source URL - platform : stable source id, such as greenhouse , lever , hn_hiring - description : useful job text for ranking/customization Recommended: - posted_date : visible source date when available - location : remote/location text - tech_stack : list of detected technologies - signal_score : source-level quality score - signal_reason : short explanation of source signal - signal_tags : source tags - source_meta : source-specific metadata ## Quality Gate Before saving, leads should pass agents.quality_gate.evaluate_lead_quality . [source:source-adapter-contract-7d8012af]
- The gate rejects or down-ranks: - missing URLs - thin scraped rows - stale jobs - senior-only jobs in beginner-focused feeds - spam, unpaid, or low-trust postings - missing company/context signals Saved leads should keep source_meta.lead_quality_score and source_meta.lead_quality_reason so users and contributors can understand why the lead was shown. [source:source-adapter-contract-7d8012af]


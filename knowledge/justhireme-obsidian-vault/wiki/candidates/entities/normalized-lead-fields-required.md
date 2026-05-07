---
page_id: 'entity:normalized-lead-fields-required'
kind: entity
cssclasses:
  - swarmvault
  - sv-entity
title: 'Normalized Lead Fields Required: -'
source_class: first_party
tags:
  - entity
  - candidate
source_ids:
  - source-adapter-contract-7d8012af
project_ids: []
node_ids:
  - 'entity:normalized-lead-fields-required'
freshness: fresh
status: candidate
confidence: 0.65
created_at: '2026-05-07T06:20:18.206Z'
updated_at: '2026-05-07T06:20:18.206Z'
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
# Normalized Lead Fields Required: -

## Summary

Named entity mentioned in Source Adapter Contract.

## Seen In

- [[sources/source-adapter-contract-7d8012af|Source Adapter Contract]]

## Source Claims

- ## Normalized Lead Fields Required: - title : role title - company : company or source owner - url : canonical apply/source URL - platform : stable source id, such as greenhouse , lever , hn_hiring - description : useful job text for ranking/customization Recommended: - posted_date : visible source date when available - location : remote/location text - tech_stack : list of detected technologies - signal_score : source-level quality score - signal_reason : short explanation of source signal - signal_tags : source tags - source_meta : source-specific metadata ## Quality Gate Before saving, leads should pass agents.quality_gate.evaluate_lead_quality . [source:source-adapter-contract-7d8012af]


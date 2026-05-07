---
page_id: 'source:source-adapter-contract-7d8012af'
kind: source
cssclasses:
  - swarmvault
  - sv-source
title: Source Adapter Contract
source_class: first_party
tags:
  - source
source_ids:
  - source-adapter-contract-7d8012af
project_ids: []
node_ids:
  - 'source:source-adapter-contract-7d8012af'
  - 'concept:source'
  - 'concept:lead'
  - 'concept:quality'
  - 'concept:company'
  - 'concept:signal'
  - 'concept:adapter'
  - 'entity:adapter-contract-source'
  - 'entity:normalized-lead-fields-required'
  - 'entity:recommended'
  - 'entity:quality-gate-before'
  - 'entity:saved'
  - 'entity:new-source-checklist-adapter'
freshness: fresh
status: active
confidence: 1
created_at: '2026-05-07T06:20:18.179Z'
updated_at: '2026-05-07T06:20:18.179Z'
compiled_from:
  - source-adapter-contract-7d8012af
managed_by: system
backlinks:
  - 'concept:source'
  - 'concept:lead'
  - 'concept:quality'
  - 'concept:company'
  - 'concept:signal'
  - 'concept:adapter'
  - 'entity:adapter-contract-source'
  - 'entity:normalized-lead-fields-required'
  - 'entity:recommended'
  - 'entity:quality-gate-before'
  - 'entity:saved'
  - 'entity:new-source-checklist-adapter'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  source-adapter-contract-7d8012af: 7d8012afa0e2971312e18c8b5cee3d7c79f248a0d10620846e3c6de5b73f6f82
source_semantic_hashes:
  source-adapter-contract-7d8012af: a93d9d0d15be1a0b3405fcb3c3f5633597668d33d4ea2365fd3a3c0470f7a81a
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# Source Adapter Contract

Source ID: `source-adapter-contract-7d8012af`
Source Kind: `markdown`
Source Path: `D:/projects/JustHireMe/docs/source-adapters.md`

Source Class: `first_party`


## Summary

Source Adapter Contract Source adapters turn external job sources into normalized lead dictionaries. A good adapter is boring, deterministic, and easy to test. ## Normalized Lead Fields Required: - title : role title - company : company or source owner - url : canonical apply/source URL - platform : stable source id, such as greenhouse , lever , hn_hiring - description : useful job text for ranking/customization Recommended: - posted_date : visible source date when available - location : remote/location text - tech_stack : list of detected technologies - signal_score : source-level quality score - signal_reason : short explanation of source signal - signal_tags : source tags - source_meta : source-specific metadata ## Quality Gate Before saving, leads should pass agents.quality_gate.evaluate_lead_quality .

## Concepts

- [[concepts/source|source]]: Frequently referenced concept in Source Adapter Contract.
- [[concepts/lead|lead]]: Frequently referenced concept in Source Adapter Contract.
- [[concepts/quality|quality]]: Frequently referenced concept in Source Adapter Contract.
- [[concepts/company|company]]: Frequently referenced concept in Source Adapter Contract.
- [[concepts/signal|signal]]: Frequently referenced concept in Source Adapter Contract.
- [[concepts/adapter|adapter]]: Frequently referenced concept in Source Adapter Contract.

## Entities

- [[entities/adapter-contract-source|Adapter Contract Source]]: Named entity mentioned in Source Adapter Contract.
- [[entities/normalized-lead-fields-required|Normalized Lead Fields Required: -]]: Named entity mentioned in Source Adapter Contract.
- [[entities/recommended|Recommended: -]]: Named entity mentioned in Source Adapter Contract.
- [[entities/quality-gate-before|Quality Gate Before]]: Named entity mentioned in Source Adapter Contract.
- [[entities/saved|Saved]]: Named entity mentioned in Source Adapter Contract.
- [[entities/new-source-checklist-adapter|New Source Checklist - [ ] Adapter]]: Named entity mentioned in Source Adapter Contract.

## Claims

- Source Adapter Contract Source adapters turn external job sources into normalized lead dictionaries. [source:source-adapter-contract-7d8012af]
- A good adapter is boring, deterministic, and easy to test. [source:source-adapter-contract-7d8012af]
- ## Normalized Lead Fields Required: - title : role title - company : company or source owner - url : canonical apply/source URL - platform : stable source id, such as greenhouse , lever , hn_hiring - description : useful job text for ranking/customization Recommended: - posted_date : visible source date when available - location : remote/location text - tech_stack : list of detected technologies - signal_score : source-level quality score - signal_reason : short explanation of source signal - signal_tags : source tags - source_meta : source-specific metadata ## Quality Gate Before saving, leads should pass agents.quality_gate.evaluate_lead_quality . [source:source-adapter-contract-7d8012af]
- The gate rejects or down-ranks: - missing URLs - thin scraped rows - stale jobs - senior-only jobs in beginner-focused feeds - spam, unpaid, or low-trust postings - missing company/context signals Saved leads should keep source_meta.lead_quality_score and source_meta.lead_quality_reason so users and contributors can understand why the lead was shown. [source:source-adapter-contract-7d8012af]

## Questions

- How does source relate to Source Adapter Contract?
- How does lead relate to Source Adapter Contract?
- How does quality relate to Source Adapter Contract?


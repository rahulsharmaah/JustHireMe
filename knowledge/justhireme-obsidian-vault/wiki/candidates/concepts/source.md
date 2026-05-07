---
page_id: 'concept:source'
kind: concept
cssclasses:
  - swarmvault
  - sv-concept
title: source
source_class: first_party
tags:
  - concept
  - candidate
source_ids:
  - roadmap-0a538d29
  - source-adapter-contract-7d8012af
  - the-short-version-46ce9e60
project_ids: []
node_ids:
  - 'concept:source'
freshness: fresh
status: candidate
confidence: 0.95
created_at: '2026-05-07T06:20:18.191Z'
updated_at: '2026-05-07T06:20:18.191Z'
compiled_from:
  - roadmap-0a538d29
  - source-adapter-contract-7d8012af
  - the-short-version-46ce9e60
managed_by: system
backlinks:
  - 'source:roadmap-0a538d29'
  - 'source:source-adapter-contract-7d8012af'
  - 'source:the-short-version-46ce9e60'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  roadmap-0a538d29: 0a538d29d01aaad5729495e19133bef7c428f976b9889e84defe98fbbbec4f91
  source-adapter-contract-7d8012af: 7d8012afa0e2971312e18c8b5cee3d7c79f248a0d10620846e3c6de5b73f6f82
  the-short-version-46ce9e60: 46ce9e60485c95b15c28f3490d5393e17c5446eddd11a8b91547e3803bf7c717
source_semantic_hashes:
  roadmap-0a538d29: dbb5502f5d095420ca216cb207b0e0854b412b1d2f5c976fc507b13731990600
  source-adapter-contract-7d8012af: a93d9d0d15be1a0b3405fcb3c3f5633597668d33d4ea2365fd3a3c0470f7a81a
  the-short-version-46ce9e60: 779d827101f6a15f9b09fa4468140c2f7bace5194f23dd2dff9b98ea4d873284
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# source

## Summary

Frequently referenced concept in Roadmap.

## Seen In

- [[sources/roadmap-0a538d29|Roadmap]]
- [[sources/source-adapter-contract-7d8012af|Source Adapter Contract]]
- [[sources/the-short-version-46ce9e60|The Short Version]]

## Source Claims

- - Add source adapter contract and scraper contribution issues. [source:roadmap-0a538d29]
- Source Adapter Contract Source adapters turn external job sources into normalized lead dictionaries. [source:source-adapter-contract-7d8012af]
- ## Normalized Lead Fields Required: - title : role title - company : company or source owner - url : canonical apply/source URL - platform : stable source id, such as greenhouse , lever , hn_hiring - description : useful job text for ranking/customization Recommended: - posted_date : visible source date when available - location : remote/location text - tech_stack : list of detected technologies - signal_score : source-level quality score - signal_reason : short explanation of source signal - signal_tags : source tags - source_meta : source-specific metadata ## Quality Gate Before saving, leads should pass agents.quality_gate.evaluate_lead_quality . [source:source-adapter-contract-7d8012af]
- The gate rejects or down-ranks: - missing URLs - thin scraped rows - stale jobs - senior-only jobs in beginner-focused feeds - spam, unpaid, or low-trust postings - missing company/context signals Saved leads should keep source_meta.lead_quality_score and source_meta.lead_quality_reason so users and contributors can understand why the lead was shown. [source:source-adapter-contract-7d8012af]
- <p align="center"> <img src="docs/assets/justhireme-hero.png" alt="JustHireMe local-first job intelligence workbench hero" width="100%" /> </p> <h1 align="center">JustHireMe</h1> <p align="center"> <strong>Local-first AI job intelligence for scraping better roles, ranking fit, and generating tailored application materials.</strong> </p> <p align="center"> <a href="LICENSE"><img alt="License: Personal Open Source" src="https://img.shields.io/badge/license-personal%20open%20source-2ea44f?style=for-the-badge"></a> <img alt="Status: Alpha" src="https://img.shields.io/badge/status-alpha-f59e0b?style=for-the-badge"> <img alt="Local First" src="https://img.shields.io/badge/local--first-yes-0ea5e9?style=for-the-badge"> <img alt="Desktop: Tauri" src="https://img.shields.io/badge/desktop-Tauri-24c8db?style=for-the-badge"> <img alt="Backend: Python" src="https://img.shields.io/badge/backend-Python_3.13-3776ab?style=for-the-badge"> </p> <p align="center"> <a href="#what-it-does">What It Does</a> &middot; <a href="#visual-workflow">Workflow</a> &middot; <a href="#architecture">Architecture</a> &middot; <a href="#quick-start">Quick Start</a> &middot; <a href="#agent-skill-and-mcp">Agent Skill + MCP</a> &middot; <a href="#contributing">Contributing</a> &middot; <a href="#roadmap">Roadmap</a> </p> --- ## The Short Version JustHireMe is an open-source desktop workbench for people who are tired of noisy job boards and black-box AI apply tools. [source:the-short-version-46ce9e60]
- The repository is public, hackable, and ready for source-adapter, ranking, docs, and Windows packaging contributions, but it is not a polished one-click consumer product yet. [source:the-short-version-46ce9e60]


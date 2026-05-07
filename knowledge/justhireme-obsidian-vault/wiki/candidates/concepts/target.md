---
page_id: 'concept:target'
kind: concept
cssclasses:
  - swarmvault
  - sv-concept
title: target
source_class: first_party
tags:
  - concept
  - candidate
source_ids:
  - windows-release-checklist-1411fa7a
project_ids: []
node_ids:
  - 'concept:target'
freshness: fresh
status: candidate
confidence: 0.65
created_at: '2026-05-07T06:20:18.197Z'
updated_at: '2026-05-07T06:20:18.197Z'
compiled_from:
  - windows-release-checklist-1411fa7a
managed_by: system
backlinks:
  - 'source:windows-release-checklist-1411fa7a'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  windows-release-checklist-1411fa7a: 1411fa7a5206ca98debbb604a811eb689c88d849596324513f633425febcd450
source_semantic_hashes:
  windows-release-checklist-1411fa7a: 7ef4c170924a776602713567423e29bd46c2242b57a17b4cb632684ae7448564
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# target

## Summary

Frequently referenced concept in Windows Release Checklist.

## Seen In

- [[sources/windows-release-checklist-1411fa7a|Windows Release Checklist]]

## Source Claims

- Windows Release Checklist The first public release target is a Windows desktop installer. [source:windows-release-checklist-1411fa7a]
- .\scripts\build-sidecar.ps1 npm run tauri build The Windows build produces: | Artifact | Use | | --- | --- | | src-tauri/target/release/bundle/nsis/JustHireMe_0.1.0_x64-setup.exe | Recommended public download for testers | | src-tauri/target/release/bundle/msi/JustHireMe_0.1.0_x64_en-US.msi | Alternate installer for managed Windows environments | | src-tauri/target/release/justhireme.exe | Unbundled release executable for local smoke tests | For the alpha installer, the bundled Python sidecar intentionally excludes the experimental browser automation stack and heavyweight local embedding model packages. [source:windows-release-checklist-1411fa7a]


---
page_id: 'concept:release'
kind: concept
cssclasses:
  - swarmvault
  - sv-concept
title: release
source_class: first_party
tags:
  - concept
  - candidate
source_ids:
  - maintainer-release-checklist-e92a78c9
  - windows-release-checklist-1411fa7a
project_ids: []
node_ids:
  - 'concept:release'
freshness: fresh
status: candidate
confidence: 0.8
created_at: '2026-05-07T06:20:18.189Z'
updated_at: '2026-05-07T06:20:18.189Z'
compiled_from:
  - maintainer-release-checklist-e92a78c9
  - windows-release-checklist-1411fa7a
managed_by: system
backlinks:
  - 'source:maintainer-release-checklist-e92a78c9'
  - 'source:windows-release-checklist-1411fa7a'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  maintainer-release-checklist-e92a78c9: e92a78c96aa2aca59e4fe1f818d76f6b436ab9dd1da94931d3d852c6718ad951
  windows-release-checklist-1411fa7a: 1411fa7a5206ca98debbb604a811eb689c88d849596324513f633425febcd450
source_semantic_hashes:
  maintainer-release-checklist-e92a78c9: 7e3e1cf6afdea1ce76dc3b8bd50e32bc351e7b4c7e1bcde6c8d648acefc86cb4
  windows-release-checklist-1411fa7a: 7ef4c170924a776602713567423e29bd46c2242b57a17b4cb632684ae7448564
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# release

## Summary

Frequently referenced concept in Maintainer Release Checklist.

## Seen In

- [[sources/maintainer-release-checklist-e92a78c9|Maintainer Release Checklist]]
- [[sources/windows-release-checklist-1411fa7a|Windows Release Checklist]]

## Source Claims

- Maintainer Release Checklist Use this before cutting a public release or sharing a build link. [source:maintainer-release-checklist-e92a78c9]
- - [ ] Release notes describe JustHireMe as local-first and do not imply a hosted backend. [source:maintainer-release-checklist-e92a78c9]
- Windows Release Checklist The first public release target is a Windows desktop installer. [source:windows-release-checklist-1411fa7a]
- .\scripts\build-sidecar.ps1 npm run tauri build The Windows build produces: | Artifact | Use | | --- | --- | | src-tauri/target/release/bundle/nsis/JustHireMe_0.1.0_x64-setup.exe | Recommended public download for testers | | src-tauri/target/release/bundle/msi/JustHireMe_0.1.0_x64_en-US.msi | Alternate installer for managed Windows environments | | src-tauri/target/release/justhireme.exe | Unbundled release executable for local smoke tests | For the alpha installer, the bundled Python sidecar intentionally excludes the experimental browser automation stack and heavyweight local embedding model packages. [source:windows-release-checklist-1411fa7a]
- The supported release smoke path is app launch, settings, profile/lead workflows, deterministic ranking, and document/outreach generation. [source:windows-release-checklist-1411fa7a]


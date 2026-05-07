---
page_id: 'source:windows-release-checklist-1411fa7a'
kind: source
cssclasses:
  - swarmvault
  - sv-source
title: Windows Release Checklist
source_class: first_party
tags:
  - source
source_ids:
  - windows-release-checklist-1411fa7a
project_ids: []
node_ids:
  - 'source:windows-release-checklist-1411fa7a'
  - 'concept:release'
  - 'concept:installer'
  - 'concept:windows'
  - 'concept:build'
  - 'concept:local'
  - 'concept:target'
  - 'entity:release-checklist'
  - 'entity:windows'
  - 'entity:build'
  - 'entity:artifact'
  - 'entity:use'
  - 'entity:recommended'
freshness: fresh
status: active
confidence: 1
created_at: '2026-05-07T06:20:18.181Z'
updated_at: '2026-05-07T06:20:18.181Z'
compiled_from:
  - windows-release-checklist-1411fa7a
managed_by: system
backlinks:
  - 'concept:release'
  - 'concept:installer'
  - 'concept:windows'
  - 'concept:build'
  - 'concept:local'
  - 'concept:target'
  - 'entity:release-checklist'
  - 'entity:windows'
  - 'entity:build'
  - 'entity:artifact'
  - 'entity:use'
  - 'entity:recommended'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  windows-release-checklist-1411fa7a: 1411fa7a5206ca98debbb604a811eb689c88d849596324513f633425febcd450
source_semantic_hashes:
  windows-release-checklist-1411fa7a: 7ef4c170924a776602713567423e29bd46c2242b57a17b4cb632684ae7448564
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# Windows Release Checklist

Source ID: `windows-release-checklist-1411fa7a`
Source Kind: `markdown`
Source Path: `D:/projects/JustHireMe/docs/windows-release.md`

Source Class: `first_party`


## Summary

Windows Release Checklist The first public release target is a Windows desktop installer. ## Build powershell npm install cd backend uv sync --dev cd .. .\scripts\build-sidecar.ps1 npm run tauri build The Windows build produces: | Artifact | Use | | --- | --- | | src-tauri/target/release/bundle/nsis/JustHireMe_0.1.0_x64-setup.exe | Recommended public download for testers | | src-tauri/target/release/bundle/msi/JustHireMe_0.1.0_x64_en-US.msi | Alternate installer for managed Windows environments | | src-tauri/target/release/justhireme.exe | Unbundled release executable for local smoke tests | For the alpha installer, the bundled Python sidecar intentionally excludes the experimental browser automation stack and heavyweight local embedding model packages.

## Concepts

- [[concepts/release|release]]: Frequently referenced concept in Windows Release Checklist.
- [[concepts/installer|installer]]: Frequently referenced concept in Windows Release Checklist.
- [[concepts/windows|windows]]: Frequently referenced concept in Windows Release Checklist.
- [[concepts/build|build]]: Frequently referenced concept in Windows Release Checklist.
- [[concepts/local|local]]: Frequently referenced concept in Windows Release Checklist.
- [[concepts/target|target]]: Frequently referenced concept in Windows Release Checklist.

## Entities

- [[entities/release-checklist|Release Checklist]]: Named entity mentioned in Windows Release Checklist.
- [[entities/windows|Windows]]: Named entity mentioned in Windows Release Checklist.
- [[entities/build|Build]]: Named entity mentioned in Windows Release Checklist.
- [[entities/artifact|Artifact]]: Named entity mentioned in Windows Release Checklist.
- [[entities/use|Use]]: Named entity mentioned in Windows Release Checklist.
- [[entities/recommended|Recommended]]: Named entity mentioned in Windows Release Checklist.

## Claims

- Windows Release Checklist The first public release target is a Windows desktop installer. [source:windows-release-checklist-1411fa7a]
- ## Build powershell npm install cd backend uv sync --dev cd .. [source:windows-release-checklist-1411fa7a]
- .\scripts\build-sidecar.ps1 npm run tauri build The Windows build produces: | Artifact | Use | | --- | --- | | src-tauri/target/release/bundle/nsis/JustHireMe_0.1.0_x64-setup.exe | Recommended public download for testers | | src-tauri/target/release/bundle/msi/JustHireMe_0.1.0_x64_en-US.msi | Alternate installer for managed Windows environments | | src-tauri/target/release/justhireme.exe | Unbundled release executable for local smoke tests | For the alpha installer, the bundled Python sidecar intentionally excludes the experimental browser automation stack and heavyweight local embedding model packages. [source:windows-release-checklist-1411fa7a]
- The supported release smoke path is app launch, settings, profile/lead workflows, deterministic ranking, and document/outreach generation. [source:windows-release-checklist-1411fa7a]

## Questions

- How does release relate to Windows Release Checklist?
- How does installer relate to Windows Release Checklist?
- How does windows relate to Windows Release Checklist?


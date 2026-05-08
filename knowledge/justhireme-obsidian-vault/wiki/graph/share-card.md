---
page_id: 'graph:share-card'
kind: graph_report
cssclasses:
  - swarmvault
  - sv-graph-report
title: Share Card
tags:
  - graph
  - share
source_ids: &ref_1
  - architecture-1e26a0b9
  - architecture-7bacf36d
  - architecture-interactive-6e908276
  - justhireme-hero-99dc8ea1
  - justhireme-mcp-73dcb246
  - justhireme-task-queue-ab463a5f
  - maintainer-release-checklist-e92a78c9
  - roadmap-0a538d29
  - source-adapter-contract-7d8012af
  - spec-1447dd6d
  - the-short-version-46ce9e60
  - windows-release-checklist-1411fa7a
project_ids: []
node_ids: &ref_0
  - 'concept:lead'
  - 'concept:backend'
  - 'concept:quality'
  - 'entity:justhireme'
  - 'concept:source'
freshness: fresh
status: active
confidence: 1
created_at: '2026-05-07T06:20:18.244Z'
updated_at: '2026-05-07T18:43:22.289Z'
compiled_from:
  - architecture-7bacf36d
  - architecture-interactive-6e908276
  - justhireme-task-queue-ab463a5f
  - source-adapter-contract-7d8012af
  - spec-1447dd6d
  - architecture-1e26a0b9
  - justhireme-mcp-73dcb246
  - maintainer-release-checklist-e92a78c9
  - the-short-version-46ce9e60
  - windows-release-checklist-1411fa7a
  - roadmap-0a538d29
  - justhireme-hero-99dc8ea1
managed_by: system
backlinks: []
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes: {}
source_semantic_hashes: {}
related_page_ids:
  - 'concept:lead'
  - 'concept:backend'
  - 'concept:quality'
  - 'entity:justhireme'
  - 'concept:source'
related_node_ids: *ref_0
related_source_ids: *ref_1
---
# SwarmVault Share Card

> A local-first map of justhireme-obsidian-vault: 12 sources compiled into 99 graph nodes and 108 wiki pages.

## Snapshot

- Sources: 12
- Wiki pages: 108
- Graph nodes: 99
- Graph edges: 129
- Communities: 10
- First-party focus: 68 nodes, 81 edges, 68 pages

## Highlights

- Top hubs: lead (45), backend (42), quality (42), JustHireMe (34), and source (33)
- Bridge nodes: backend, quality, and source
- Surprising link: Architecture semantically_similar_to JustHireMe MCP. it crosses communities community:agents-6 and community:backend-1; it spans different canonical pages; a bridge node is involved; This link is inferred from shared concepts, sha...
- Surprising link: Architecture semantically_similar_to Windows Release Checklist. it crosses communities community:agents-6 and community:local-3; it spans different canonical pages; a bridge node is involved; This link is inferred from shared concepts.
- Surprising link: JustHireMe MCP semantically_similar_to Source Adapter Contract. it crosses communities community:backend-1 and community:company-7; it spans different canonical pages; a bridge node is involved; This link is inferred from shared concepts.

## Gaps To Strengthen

- Non-first-party material accounts for 31.3% of graph nodes.

## Ask Next

- What sources would strengthen community tauri?
- What sources would strengthen community quality?
- Why does backend connect multiple communities in the vault?
- Why does quality connect multiple communities in the vault?
- Why does source connect multiple communities in the vault?

## Share Post

```text
I scanned justhireme-obsidian-vault with SwarmVault: 12 sources -> 108 wiki pages, 99 graph nodes, 129 edges.
Top hubs: lead, backend, and quality.
Most surprising link: Architecture semantically_similar_to JustHireMe MCP.
Everything stays local. Try: npm install -g @swarmvaultai/cli && swarmvault scan ./your-repo
```

## Reproduce

```bash
npm install -g @swarmvaultai/cli
swarmvault scan ./your-repo
swarmvault graph share --post
```

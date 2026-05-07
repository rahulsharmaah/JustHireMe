---
page_id: 'source:justhireme-mcp-73dcb246'
kind: source
cssclasses:
  - swarmvault
  - sv-source
title: JustHireMe MCP
source_class: first_party
tags:
  - source
source_ids:
  - justhireme-mcp-73dcb246
project_ids: []
node_ids:
  - 'source:justhireme-mcp-73dcb246'
  - 'concept:justhireme'
  - 'concept:lead'
  - 'concept:backend'
  - 'concept:server'
  - 'concept:json'
  - 'concept:projects'
  - 'entity:justhireme'
  - 'entity:start-from'
  - 'entity:tools'
  - 'entity:example-client-config'
  - 'entity:keep'
  - 'entity:mcp'
freshness: fresh
status: active
confidence: 1
created_at: '2026-05-07T06:20:18.176Z'
updated_at: '2026-05-07T06:20:18.176Z'
compiled_from:
  - justhireme-mcp-73dcb246
managed_by: system
backlinks:
  - 'concept:justhireme'
  - 'concept:lead'
  - 'concept:backend'
  - 'concept:server'
  - 'concept:json'
  - 'concept:projects'
  - 'entity:justhireme'
  - 'entity:start-from'
  - 'entity:tools'
  - 'entity:example-client-config'
  - 'entity:keep'
  - 'entity:mcp'
schema_hash: bf22a9fff8b2f405ddb27953c30dc356517518aebbb9af55cc669cbd465330cd
source_hashes:
  justhireme-mcp-73dcb246: 73dcb246bec78614ebbba393d8e765ba168f2df6ded24cf086a4071ea9cc41d0
source_semantic_hashes:
  justhireme-mcp-73dcb246: ec179a767ee67326d679b2e686ee8ad32fb9e43c8eb3ceffce078e41266fce0d
decay_score: 1
last_confirmed_at: '2026-05-07T06:20:18.872Z'
---
# JustHireMe MCP

Source ID: `justhireme-mcp-73dcb246`
Source Kind: `markdown`
Source Path: `D:/projects/JustHireMe/docs/MCP.md`

Source Class: `first_party`


## Summary

JustHireMe MCP JustHireMe exposes a lightweight stdio MCP server for agent workflows that need job lead intelligence without running the full desktop app. ## Start From the repository root: powershell backend\.venv\Scripts\python.exe backend\mcp_server.py The server implements initialize , tools/list , and tools/call over newline-delimited JSON-RPC on stdio. ## Tools - score_job_fit : scores a raw posting against a JustHireMe candidate profile JSON.

## Concepts

- [[concepts/justhireme|justhireme]]: Frequently referenced concept in JustHireMe MCP.
- [[concepts/lead|lead]]: Frequently referenced concept in JustHireMe MCP.
- [[concepts/backend|backend]]: Frequently referenced concept in JustHireMe MCP.
- [[concepts/server|server]]: Frequently referenced concept in JustHireMe MCP.
- [[concepts/json|json]]: Frequently referenced concept in JustHireMe MCP.
- [[concepts/projects|projects]]: Frequently referenced concept in JustHireMe MCP.

## Entities

- [[entities/justhireme|JustHireMe]]: Named entity mentioned in JustHireMe MCP.
- [[entities/start-from|Start From]]: Named entity mentioned in JustHireMe MCP.
- [[entities/tools|Tools -]]: Named entity mentioned in JustHireMe MCP.
- [[entities/example-client-config|Example Client Config]]: Named entity mentioned in JustHireMe MCP.
- [[entities/keep|Keep]]: Named entity mentioned in JustHireMe MCP.
- [[entities/mcp|MCP]]: Named entity mentioned in JustHireMe MCP.

## Claims

- JustHireMe MCP JustHireMe exposes a lightweight stdio MCP server for agent workflows that need job lead intelligence without running the full desktop app. [source:justhireme-mcp-73dcb246]
- ## Start From the repository root: powershell backend\.venv\Scripts\python.exe backend\mcp_server.py The server implements initialize , tools/list , and tools/call over newline-delimited JSON-RPC on stdio. [source:justhireme-mcp-73dcb246]
- ## Tools - score_job_fit : scores a raw posting against a JustHireMe candidate profile JSON. [source:justhireme-mcp-73dcb246]
- - evaluate_lead_quality : runs the deterministic lead quality gate for a normalized lead. [source:justhireme-mcp-73dcb246]

## Questions

- How does justhireme relate to JustHireMe MCP?
- How does lead relate to JustHireMe MCP?
- How does backend relate to JustHireMe MCP?


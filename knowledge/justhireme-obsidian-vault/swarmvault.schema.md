# JustHireMe Knowledge Vault Schema

This vault is the Obsidian-facing project memory for JustHireMe, a local-first AI job intelligence workbench. Codex and SwarmVault maintain the generated wiki; humans use Obsidian to inspect, browse, and lightly curate the result.

## Vault Purpose

- Explain the product, architecture, roadmap, and maintainer workflow of JustHireMe.
- Help future agent sessions answer questions about product intent, subsystem boundaries, supported scope, release planning, and open work.
- Preserve decisions, risks, contradictions, and unanswered questions instead of flattening them into a polished narrative.

## Naming Conventions

- Prefer stable page names such as `Frontend Workbench`, `Python Sidecar API`, `Lead Quality Gate`, `Profile Graph`, `Application Customizer`, `Windows Packaging`, and `MCP Integration`.
- Source pages should keep recognizable source names from the repository, for example `README`, `SPEC`, `ROADMAP`, and `docs/ARCHITECTURE`.
- Use singular names for concepts and subsystems unless the source material clearly uses a plural product term.

## Page Structure Rules

- Source pages should summarize only what the source actually says.
- Concept, subsystem, and decision pages should aggregate source-backed claims across README, docs, SPEC, ROADMAP, and architecture files.
- When a source describes a feature as experimental, alpha, planned, unsupported, or future work, keep that lifecycle status visible.
- Prefer short, linked sections over long essays. This vault is meant for navigation and agent handoff.
- Add Obsidian wiki links between related subsystems, features, risks, and source pages whenever a meaningful relationship exists.

## Categories

- Product Concepts: local-first job intelligence, lead pipeline, ranking, matching, customization, profile context.
- Subsystems: frontend workbench, Python sidecar API, Tauri shell, scraper/source adapters, local storage, graph/vector matching, PDF generation, MCP/agent integration.
- Workflows: onboarding, lead ingestion, quality gate, fit evaluation, application drafting, Windows release, contributor setup.
- Project Management: roadmap items, task queue items, release checklist, open questions, risks.
- Interfaces: REST API, WebSocket events, MCP tools, source adapter contracts, local app settings.

## Entity Types

- Source document
- Product feature
- Subsystem
- User workflow
- API/interface
- Release task
- Risk/open question
- External tool or dependency

## Relationship Types

- Mentions
- Supports
- Contradicts
- Depends on
- Implements
- Configures
- Planned by
- Blocks
- Supersedes

## Grounding Rules

- Prefer raw repository sources over generated wiki pages.
- Cite source ids or source page links whenever making a project claim.
- Do not infer production readiness from planned features. Mark alpha, experimental, planned, or unsupported status exactly when sources indicate it.
- Do not treat browser automation or auto-apply behavior as supported unless a source explicitly says it is supported.
- Keep contradictions and stale claims visible with dates or source links when possible.

## Exclusions

- Do not ingest `node_modules`, `dist`, build output, generated dependency files, or full source code until a human asks for the next code-area phase.
- Do not store secrets, API keys, local credentials, or private user profile data in this vault.
- Do not create speculative implementation instructions that are not grounded in the listed sources.

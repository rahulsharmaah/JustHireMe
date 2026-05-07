# JustHireMe Task Queue

This queue is ordered for fast functionality work. Start at P0 and only pull lower-priority work when the current priority is blocked or already batched.

## Priority Rules

- **P0:** Blocks reliable daily use or core workflow completion.
- **P1:** Improves the main workflow once the core path is stable.
- **P2:** Adds polish, insight, and maintainability.
- **P3:** Future expansion or experimental work.

## Current North Star

Make the supported OSS workflow feel dependable end to end:

```text
Add profile context -> discover or paste leads -> score/rank -> generate package -> review/contact/follow up
```

Experimental browser automation stays separate from the core queue unless explicitly selected.

## P0 - Core Functionality Stabilization

**Batch status:** P0.1-P0.3 implementation pass completed on 2026-05-07. Frontend build and backend API regression suite passed; a full manual browser smoke remains useful before release packaging.

### P0.1 - End-to-End Smoke Path

**Goal:** Ensure a user can complete one full workflow without manual recovery.

**Status:** Backend/API coverage verified and frontend production build passed. Keep one manual local-browser pass as the release gate for generated document rendering and follow-up persistence.

**Tasks:**
- Verify backend startup, port/token discovery, and frontend API auth.
- Verify Add Context resume/raw/manual import.
- Verify manual lead paste creates a lead and refreshes the pipeline.
- Verify package generation produces resume and cover letter assets.
- Verify drawer review opens and document/contact/outreach sections render.
- Verify follow-up scheduling and status changes persist.

**Acceptance criteria:**
- One user can go from empty profile/lead state to generated package.
- Failures surface through toast + inline error.
- No silent loading state remains indefinitely.

### P0.2 - Action Reliability And Error Handling

**Goal:** Make every primary action report loading, success, and failure consistently.

**Status:** Implemented for approval drawer actions, onboarding import/preferences, settings key validation, package retry, PDF retry, and copy actions.

**Tasks:**
- Finish toast coverage in `ApprovalDrawer`.
- Add toast/error coverage to onboarding import/preferences.
- Add toast coverage to API key validation in settings.
- Add timeout/failure copy for document preview loading.
- Add retry affordances for failed package generation and failed PDF load.

**Acceptance criteria:**
- Every user-triggered network action has a visible loading state.
- Errors include enough detail to know what failed.
- User can retry common failures without leaving the page.

### P0.3 - Lead Data Integrity

**Goal:** Stop low-quality or duplicate leads from cluttering the pipeline.

**Status:** Implemented duplicate detection for manual leads, attached quality metadata before save, discards rejected manual leads, and added backend coverage for duplicate/quality-gate cases.

**Tasks:**
- Audit lead creation paths: manual, free scout, scan, package generation.
- Enforce duplicate detection before saving.
- Expose quality gate reason in lead metadata.
- Add UI labels for filtered/discarded reason.
- Add backend tests for duplicate and quality-gate cases.

**Acceptance criteria:**
- Same job URL/company/title does not create repeated active leads.
- Bad rows are discarded with an inspectable reason.
- Pipeline counts remain stable after refresh.

### P0.4 - Settings Save And Validation Hardening

**Goal:** Prevent broken configuration from silently damaging workflows.

**Tasks:**
- Validate required provider fields before saving.
- Show per-provider validation status in the cleaner settings page.
- Add clear warnings when a step override has provider but no usable key/model.
- Preserve settings section after save/reopen.
- Add a reset-to-global action for per-step overrides.

**Acceptance criteria:**
- User understands whether the selected provider is usable.
- Invalid settings are either blocked or clearly marked.
- Step overrides are easy to undo.

## P1 - Workflow Improvements

### P1.1 - Per-Lead Timeline

**Goal:** Make each lead's history understandable.

**Tasks:**
- Store or expose events for lead lifecycle changes.
- Add timeline section to `ApprovalDrawer`.
- Show discovered, scored, generated, copied/contacted, follow-up scheduled, and status changes.
- Include timestamps and source labels.

**Acceptance criteria:**
- A user can see what happened to a lead without reading Activity logs.
- Timeline updates after key actions.

### P1.2 - Pipeline Filtering And Saved Views

**Goal:** Make the pipeline useful when lead count grows.

**Tasks:**
- Add filters for source, seniority, score range, location/remote, status, and reviewed/unreviewed.
- Add saved filter presets.
- Add "hide discarded" and "hide already contacted" toggles.
- Persist selected view locally.

**Acceptance criteria:**
- User can quickly narrow to high-fit, uncontacted leads.
- Filters survive navigation.

### P1.3 - Profile Quality Assistant

**Goal:** Help users improve generation quality by filling profile gaps.

**Tasks:**
- Add profile completeness scoring.
- Detect missing project impact, missing metrics, thin skills, missing GitHub/portfolio, and weak summary.
- Show prioritized recommendations in Profile and Add Context.
- Link recommendations to the correct Add Context tab.

**Acceptance criteria:**
- User sees exactly what context would improve matching/generation.
- Recommendations disappear or update after data import.

### P1.4 - Generation Retry And Versioning

**Goal:** Make generated assets recoverable and comparable.

**Tasks:**
- Add retry generation action per lead.
- Track generation attempts and failure reason.
- Store asset versions or timestamps.
- Let user reopen the latest generated package after refresh.

**Acceptance criteria:**
- Failed generation can be retried.
- User can tell which package version is current.

## P2 - Product Polish And Maintainability

### P2.1 - Extract UI Primitives

**Goal:** Reduce inline styles and make future UI work faster.

**Tasks:**
- Create reusable `Button`, `Toast`, `Panel`, `Field`, `SectionHeader`, `EmptyState`, and `StatusPill` components.
- Move repeated page styles out of inline objects.
- Normalize icon/button spacing.

**Acceptance criteria:**
- New functionality does not require copy-pasting large inline style blocks.
- Existing pages keep their current visual language.

### P2.2 - Loading Skeletons

**Goal:** Replace plain loading text with polished state surfaces.

**Tasks:**
- Add skeleton rows for Pipeline.
- Add skeleton blocks for Profile.
- Add document preview skeleton/error states.
- Add backend unavailable empty state variants.

**Acceptance criteria:**
- Slow backend/API states feel intentional and understandable.

### P2.3 - Test Harness

**Goal:** Protect the core workflow while functionality expands.

**Tasks:**
- Add frontend smoke tests for view rendering.
- Add API contract tests for leads, profile, settings, and generation routes.
- Add fixture-based tests for source adapters and quality gate.
- Add one Playwright or browser smoke test for the happy path.

**Acceptance criteria:**
- Build/check catches obvious regressions before manual review.

## P3 - Expansion

### P3.1 - Source Adapter Ecosystem

**Goal:** Make sources easier to add and verify.

**Tasks:**
- Formalize adapter interface.
- Add parser fixtures.
- Add adapter health dashboard.
- Add "why shown / why filtered" explanations.

### P3.2 - Optional Automation Plugin Separation

**Goal:** Keep experimental browser automation out of the core OSS path.

**Tasks:**
- Move Ghost/Auto Apply settings behind a plugin/lab boundary.
- Make automation dependencies optional.
- Add explicit warnings and docs.

### P3.3 - Release Readiness

**Goal:** Prepare for dependable Windows-first distribution.

**Tasks:**
- Validate local data paths.
- Add keychain/secret storage plan.
- Improve installer/startup diagnostics.
- Document backup/export/import of local data.

## Recommended Next Batch

Start with this batch before adding new features:

1. **P0.1 End-to-End Smoke Path**
2. **P0.2 Action Reliability And Error Handling**
3. **P0.3 Lead Data Integrity**

This gives us a stable spine. After that, build **P1.1 Per-Lead Timeline** and **P1.2 Pipeline Filtering**, because those make the app dramatically more useful once real lead volume grows.

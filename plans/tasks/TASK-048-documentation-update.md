# TASK-048 — Documentation Update (Post-MVP)

## Objective

Bring all `plans/` documentation up to date after TASK-032 through TASK-047 are implemented. Create the task status and implementation summary files. This is a documentation-only task executed after all post-MVP implementation tasks are complete.

## Scope

- Update `plans/database/ERD.md` with all new models and fields
- Update `plans/api/API.md` with all new endpoint groups
- Update `plans/ROADMAP.md` to show the completed MVP phase and the implemented post-MVP phase
- Update `plans/DECISIONS.md` with D-015, D-016, D-017
- Update `plans/domain/DOMAIN.md` with new entities (StoreSettings, Material, MaterialMovement, Notification)
- Update `plans/DEPLOYMENT.md` with new env vars and readiness endpoint changes
- Create `plans/summary/TASK-STATUS.md` — full task list with statuses
- Create `plans/summary/IMPLEMENTATION-SUMMARY.md` — one or two sentence summary per task

## Out of Scope

- Any code changes
- Any schema migrations
- Any API changes

## Dependencies

TASK-032, TASK-033, TASK-034, TASK-035, TASK-036, TASK-037, TASK-038, TASK-039, TASK-040, TASK-041, TASK-042, TASK-043, TASK-044, TASK-045, TASK-046, TASK-047

## Architecture Context

`CONSISTENCY-REVIEW.md` — used as the model for cross-document consistency checks; apply the same process to post-MVP additions.

## Requirements

**`plans/database/ERD.md` changes:**
- Add `password_hash` field to User entity
- Add `email` field to User entity (if added in TASK-032)
- Add `assigned_to_id` to Order entity
- Add StoreSettings entity (all fields)
- Add Material entity (all fields)
- Add MaterialMovement entity (all fields)
- Add Notification entity (all fields)

**`plans/api/API.md` changes:**
- Add Auth endpoint group (TASK-032)
- Add Users endpoint group (TASK-035)
- Add Settings endpoint group (TASK-036)
- Add customer payments sub-endpoint (TASK-037)
- Add Reports endpoint group (TASK-038)
- Add Materials endpoint group (TASK-042)
- Add Notifications endpoint group (TASK-044)
- Add export endpoints to Customers and Orders groups (TASK-045)
- Add authorization notes to all endpoint groups (TASK-034)

**`plans/DECISIONS.md` additions:**
- D-015: Authentication strategy (JWT in HttpOnly cookie; cookie-based session vs localStorage; rationale)
- D-016: RBAC approach (plain permission map object, two roles, no dynamic permission table)
- D-017: Notification generation strategy (lazy on-request upsert vs. background job; rationale for choosing lazy)

**`plans/summary/TASK-STATUS.md` format:**

```md
# JahitFlow — Task Status

| Task | Title | Status |
|---|---|---|
| TASK-001 | Backend Foundation | DONE |
...
| TASK-031 | Hardening | DONE |
| TASK-032 | Authentication Schema and API | DONE |
...
| TASK-048 | Documentation Update | DONE |
```

Statuses: `PLANNED` | `IN_PROGRESS` | `BLOCKED` | `DONE` | `CANCELLED`

**`plans/summary/IMPLEMENTATION-SUMMARY.md` format:**

```md
# JahitFlow — Implementation Summary

- **Backend Foundation (TASK-001):** Express + TypeScript backend scaffolded with module structure, shared error handling, validation, and money helpers.
- **Authentication API (TASK-032):** Secure login, logout, and session management via HttpOnly JWT cookie; authenticate middleware applied globally; bcrypt password hashing.
...
```

One to two sentences per task. Focus on what was built and what capability it enables. Do not duplicate the full task specification.

## Files / Modules

`plans/database/ERD.md` — update with post-MVP models
`plans/api/API.md` — add post-MVP endpoint groups and authorization notes
`plans/ROADMAP.md` — extend with post-MVP phase summary
`plans/DECISIONS.md` — add D-015, D-016, D-017
`plans/domain/DOMAIN.md` — add new entity summaries
`plans/DEPLOYMENT.md` — add new env vars, readiness endpoint, monitoring baseline reference
`plans/summary/TASK-STATUS.md` — create (or update if exists)
`plans/summary/IMPLEMENTATION-SUMMARY.md` — create (or update if exists)

## Validation

- All 48 tasks appear in `TASK-STATUS.md` with accurate statuses
- Every new API endpoint group documented in TASK-032–047 has an entry in `API.md`
- Every new Prisma model from TASK-032–044 has an entry in `ERD.md`
- No stale reference calls TASK-032+ "Post-MVP" in the plans docs (they are now implemented)
- `IMPLEMENTATION-SUMMARY.md` has exactly one entry per task (TASK-001 through TASK-048)

## Acceptance Criteria

- `TASK-STATUS.md` lists all 48 tasks with correct final statuses
- `ERD.md` and `API.md` are consistent with the implemented schema and endpoints
- `DECISIONS.md` documents the three new architecture decisions
- `IMPLEMENTATION-SUMMARY.md` provides a navigation aid for future agents/developers

## Definition of Done

- All documentation files updated and self-consistent
- Cross-document consistency check performed (entities in ERD match API, match domain model, match schema)
- No dead links or references to non-existent files in any updated document

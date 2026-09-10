# TASK-026 — Audit Log Infrastructure and Retrofit

## Objective
Formalize the `audit` module and confirm every action listed in `BUSINESS-RULES.md#audit` is actually being logged by the modules built so far.

## Scope
- Add `AuditLog` model per `database/ERD.md`; migrate (note: this may already exist as a stub if earlier tasks assumed `recordAudit` existed — this task is where it becomes real and where earlier tasks' calls are verified against a real table for the first time; **prerequisite ordering note:** because Tasks 006 onward call `recordAudit(...)`, the `audit` module's function signature and a working stub (writing to console or a no-op) must exist from TASK-004, with this task swapping the stub for the real database-backed implementation and adding the read endpoint. Update TASK-004 retroactively if it did not already include this stub — flag as a planning gap if found.**
- Implement `GET /api/audit-logs` per `API.md#audit`.
- Audit each prior module's mutation endpoints against the required-actions list in `BUSINESS-RULES.md#audit`; fill any gaps found.

## Out of Scope
Logging anything not on the required-actions list.

## Dependencies
TASK-004 through TASK-025 (retrofit/verification nature of this task).

## Architecture Context
`DECISIONS.md#D-009`; `BUSINESS-RULES.md#audit`.

## Requirements
- `recordAudit(actorId, entityType, entityId, action, before?, after?)` writes one row; called from within the same transaction as the triggering write wherever that module used a transaction.
- Gap-check checklist (from `BUSINESS-RULES.md#audit`) run against the actual codebase; any missing call added.

## Implementation Notes
- This task is intentionally placed after the modules it verifies, matching the roadmap's Phase 7 positioning, but the underlying stub must exist from the start (see the prerequisite note above) — this is a planning nuance worth double-checking during TASK-004's implementation, not purely deferred to here.

## Files / Modules
`backend/src/modules/audit/*`, `backend/prisma/schema.prisma` (AuditLog model, migrate), plus small patches to any module found missing a required call.

## Validation
Integration test hitting the required-actions list, confirming an audit row exists for each after performing the corresponding action.

## Acceptance Criteria
Every action in `BUSINESS-RULES.md#audit`'s required list produces exactly one audit row with appropriate before/after data.

## Definition of Done
Audit module complete; gap-check performed and any gaps closed; read endpoint functional (UI for it is optional for MVP and may be a simple table if built at all — not separately tasked here since it's a low-priority internal tool).

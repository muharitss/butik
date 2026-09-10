# TASK-022 — Revision Schema and API

## Objective
Add the `revisions` table and implement revision creation/resolution, including the order-status side effect on full resolution.

## Scope
- Add `Revision` model per `database/ERD.md`; migrate.
- `GET/POST /api/orders/:orderId/revisions`, `PATCH /api/orders/:orderId/revisions/:id` per `API.md#revisions`.
- When a revision is resolved/cancelled, check whether the order has any remaining `OPEN`/`IN_PROGRESS` revisions; this does **not** by itself transition the order (per `STATE-MACHINES.md`, `REVISION → FITTING` requires *both* all revisions resolved *and* a new fitting recorded) — so this task's side effect is limited to making that "all revisions resolved" state queryable/visible, not triggering a transition on its own.

## Out of Scope
- The `REVISION → FITTING` transition itself (already covered by TASK-020's fitting-creation logic, which should additionally check "no open revisions" before allowing a new fitting to move status back to `FITTING` from `REVISION` — note: reconcile this guard into TASK-020's implementation if not already covered there, since `STATE-MACHINES.md` ties this transition to fitting creation, not revision resolution).

## Dependencies
TASK-004, TASK-013, TASK-020.

## Architecture Context
`STATE-MACHINES.md#revision`, `#order`; `BUSINESS-RULES.md#revision`.

## Requirements
- `status` transitions per `STATE-MACHINES.md#revision`; `RESOLVED` requires `resolvedAt` (default now if omitted).
- `fittingId` optional but recommended; validate it belongs to the same order if provided.

## Implementation Notes
Simple CRUD-with-status-transition module; no separate service layer required beyond the handlers, given the transition logic here is small (2–3 states).

## Files / Modules
`backend/prisma/schema.prisma` (Revision model, migrate), `backend/src/modules/revisions/*`.

## Validation
Integration tests: create, transition through lifecycle states, verify illegal transitions (`RESOLVED→OPEN`) rejected.

## Acceptance Criteria
Revision lifecycle matches `STATE-MACHINES.md#revision` exactly.

## Definition of Done
Schema, API implemented and tested; audit entries verified; the cross-check noted in Out of Scope confirmed present in TASK-020's fitting-creation guard (revisit and patch TASK-020's implementation if the guard is missing).

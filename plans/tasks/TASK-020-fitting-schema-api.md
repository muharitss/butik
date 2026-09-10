# TASK-020 — Fitting Schema and API

## Objective
Add the `fittings` table and implement fitting scheduling/result recording, including the order-status side effects.

## Scope
- Add `Fitting` model per `database/ERD.md`; migrate.
- `GET/POST /api/orders/:orderId/fittings`, `PATCH /api/orders/:orderId/fittings/:id` per `API.md#fittings`.
- On creating the *first* fitting for an order in `IN_PROGRESS` status, call `orders.transitionOrder(orderId, 'FITTING', ...)`.
- On recording a result (`PATCH ... status=DONE`): if `result=NEEDS_REVISION`, transition order to `REVISION` (if not already there); if `result=APPROVED` and no open revisions exist, transition order to `READY`.

## Out of Scope
- Revision creation itself (Task 022) — this task only performs the order-status side effect, and soft-nudges the UI (Task 021) to prompt for a revision, per the "soft rule" in `BUSINESS-RULES.md#fitting`.

## Dependencies
TASK-004, TASK-013, TASK-015 (needs `transitionOrder` export).

## Architecture Context
`STATE-MACHINES.md#order`, `#fitting`; `BUSINESS-RULES.md#fitting`.

## Requirements
- `fitting_number` computed as `max(existing for order)+1`.
- Result recording requires `occurredAt` and `result`.
- Cross-module call to `transitionOrder` happens from the `fittings` module (the module owning the triggering action), per `ARCHITECTURE.md` §3.3.

## Implementation Notes
- Wrap the fitting write + order transition in one transaction.

## Files / Modules
`backend/prisma/schema.prisma` (Fitting model, migrate), `backend/src/modules/fittings/*`.

## Validation
Integration tests: first fitting on an `IN_PROGRESS` order moves it to `FITTING`; a `DONE`/`NEEDS_REVISION` result moves order to `REVISION`; a `DONE`/`APPROVED` result with no open revisions moves order to `READY`.

## Acceptance Criteria
Fitting lifecycle and its order-status side effects match `STATE-MACHINES.md` exactly.

## Definition of Done
Schema, API implemented and tested; audit entries verified.

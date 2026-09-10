# TASK-021 — Fitting UI

## Objective
Build fitting scheduling and result-recording UI on the order detail page.

## Scope
- Fitting list on order detail (number, status, date, result).
- "Schedule fitting" and "Record result" forms.
- When a result of `NEEDS_REVISION` is recorded, prompt (non-blocking) the operator to immediately create a revision, linking to the Revision creation form (Task 023) pre-filled with `fittingId`.

## Out of Scope
Revision UI itself (Task 023).

## Dependencies
TASK-003, TASK-017, TASK-020.

## Architecture Context
`BUSINESS-RULES.md#fitting` (soft prompt, not a hard block).

## Requirements
- Fitting section reflects order-status changes triggered by fitting actions (refetch order detail after mutation).

## Implementation Notes
None.

## Files / Modules
`frontend/src/features/fittings/*`, updates to `frontend/src/features/orders/*`.

## Validation
Manual walkthrough: schedule, record approved result (order → READY), schedule another order, record needs-revision result (order → REVISION), confirm the revision prompt appears.

## Acceptance Criteria
Fitting section fully functional and correctly reflects resulting order status.

## Definition of Done
UI implemented and manually verified.

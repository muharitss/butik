# TASK-023 — Revision UI

## Objective
Build revision creation and resolution UI on the order detail page.

## Scope
- Revision list on order detail (issue, status, related fitting, resolved date).
- Creation form (optionally pre-filled `fittingId` from the fitting-result prompt in TASK-021).
- Status update actions (start, resolve, cancel).

## Out of Scope
None beyond standard scope.

## Dependencies
TASK-003, TASK-017, TASK-022.

## Architecture Context
`BUSINESS-RULES.md#revision`.

## Requirements
- UI clearly shows which revisions are still open, since this blocks the order returning to `FITTING`/reaching `READY`.

## Implementation Notes
None.

## Files / Modules
`frontend/src/features/revisions/*`, updates to `frontend/src/features/orders/*`.

## Validation
Manual walkthrough: create a revision from a needs-revision fitting, resolve it, record a new fitting with approved result, confirm order reaches `READY`.

## Acceptance Criteria
Revision section fully functional.

## Definition of Done
UI implemented and manually verified.

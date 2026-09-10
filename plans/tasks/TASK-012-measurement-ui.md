# TASK-012 — Measurement UI

## Objective
Build the measurement entry and history views, integrated into the Customer detail page.

## Scope
- A measurement entry form (mobile-first): date, label/notes, dynamic field list (using the shared field vocabulary — for MVP, a reasonably complete static list of common body-measurement field keys with labels/units, since a full "manage the vocabulary" admin screen is not required — see Implementation Notes).
- A history view: list of past versions, each expandable to show its values, on the Customer detail page.
- "Current measurement" summary shown prominently on Customer detail.

## Out of Scope
- Garment-specific required-field enforcement in this form (that happens at order creation, Task 017).

## Dependencies
TASK-003, TASK-007, TASK-011.

## Architecture Context
`DOMAIN.md#MeasurementValue` (shared field vocabulary); `BUSINESS-RULES.md#measurement`.

## Requirements
- Field vocabulary: a fixed, documented list of field keys/labels/units shipped as a frontend constant for MVP (e.g., `chest`, `waist`, `hip`, `shoulder`, `sleeve_length`, `inseam`, `neck`, etc.) — extending this list is a code change, not a database change, which is an acceptable MVP simplification (recorded here as an assumption per the assumption policy: full dynamic vocabulary management is Post-MVP if the operator needs custom fields beyond this set).
- Form submits all filled fields as `values[]` to `POST /api/customers/:customerId/measurements`.
- History view clearly labels which version is "current."

## Implementation Notes
None beyond the vocabulary assumption above.

## Files / Modules
`frontend/src/features/measurements/*`, integrated into `frontend/src/features/customers/*` detail view.

## Validation
Manual walkthrough: record a measurement, see it reflected as "current," record a correction, confirm both appear in history with the older one still intact.

## Acceptance Criteria
- Entry and history views functional and integrated into customer detail.

## Definition of Done
UI implemented and manually verified.

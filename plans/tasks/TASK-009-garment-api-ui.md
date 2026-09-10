# TASK-009 — Garment Type API and UI

## Objective
Implement garment type management end-to-end (simple CRUD; combined API+UI in one task given its low complexity).

## Scope
- Backend: endpoints in `API.md#garment-types`, including nested `measurementFields[]` create/replace.
- Frontend: a simple management screen (list with active/inactive toggle visibility, create/edit form with a dynamic list of measurement fields).
- Audit logging for create/update/deactivate.

## Out of Scope
- Referencing garment types from orders (Task 013+).

## Dependencies
TASK-004, TASK-008, TASK-003.

## Architecture Context
`API.md#garment-types`; `DOMAIN.md#GarmentType`, `#GarmentMeasurementField`.

## Requirements
- `POST /api/garment-types` accepts nested fields in one call.
- `PATCH /api/garment-types/:id` can replace the full `measurementFields[]` array (delete-and-reinsert within a transaction, since these are configuration, not historical records).
- `PATCH /api/garment-types/:id/deactivate` sets `is_active=false`; deactivated types remain selectable in historical data views but excluded from new-order item pickers.
- UI: field list editor supports add/remove rows with `fieldKey`, `label`, `unit`, `isRequired`, `sortOrder`.

## Implementation Notes
- This module stays simple (handlers + Prisma directly), no service layer needed.

## Files / Modules
`backend/src/modules/garments/*`, `frontend/src/features/garments/*`.

## Validation
Integration test: create with fields, update fields (replace), deactivate, confirm excluded from "active" list.

## Acceptance Criteria
- Garment types with measurement field definitions can be fully managed via the UI.

## Definition of Done
- API + UI implemented, tested, audit entries verified.

# TASK-008 — Database Schema: Garment Types & Measurement Fields

## Objective
Add `garment_types` and `garment_measurement_fields` tables.

## Scope
- Add both models per `database/ERD.md`.
- Migrate.

## Out of Scope
- API/UI (Task 009).

## Dependencies
TASK-002.

## Architecture Context
`database/ERD.md#garment_types`, `#garment_measurement_fields`; `DOMAIN.md#GarmentType`.

## Requirements
- `garment_types.name` UNIQUE.
- `garment_measurement_fields` UNIQUE(`garment_type_id`, `field_key`).
- `is_active` default true; `deleted_at` nullable.

## Implementation Notes
None.

## Files / Modules
`backend/prisma/schema.prisma`, new migration.

## Validation
Migration applies cleanly.

## Acceptance Criteria
Schema matches ERD exactly.

## Definition of Done
Migration committed and applied.

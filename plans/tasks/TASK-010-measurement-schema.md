# TASK-010 — Database Schema: Measurement Versions & Values

## Objective
Add `measurement_versions` and `measurement_values` tables.

## Scope
- Add both models per `database/ERD.md`.
- Migrate.

## Out of Scope
- API/UI (Task 011–012).

## Dependencies
TASK-002, TASK-005 (FK to customers).

## Architecture Context
`database/ERD.md#measurement_versions`, `#measurement_values`; `DECISIONS.md#D-003`, `#D-008` (immutability).

## Requirements
- No `updated_at`/`deleted_at` on either table (immutable/append-only).
- UNIQUE(`customer_id`, `version_number`) on versions; UNIQUE(`measurement_version_id`, `field_key`) on values.

## Implementation Notes
`version_number` is computed application-side at insert time (max existing + 1 for that customer), not a database sequence, since it's scoped per-customer.

## Files / Modules
`backend/prisma/schema.prisma`, new migration.

## Validation
Migration applies cleanly.

## Acceptance Criteria
Schema matches ERD exactly; immutability enforced only at the application layer (no DB trigger required for MVP, but no `updated_at` column exists to accidentally invite editing).

## Definition of Done
Migration committed and applied.

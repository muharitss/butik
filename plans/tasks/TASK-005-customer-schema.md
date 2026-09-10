# TASK-005 — Database Schema: Customers

## Objective
Add the `customers` table to the Prisma schema and migrate.

## Scope
- Add `Customer` model per `database/ERD.md` (`id`, `name`, `phone`, `email`, `address`, `notes`, `created_at`, `updated_at`, `deleted_at`).
- Add indexes on `name` and `phone`.
- Migrate.

## Out of Scope
- API/UI (Tasks 006–007).

## Dependencies
TASK-002.

## Architecture Context
`database/ERD.md` §customers; `BUSINESS-RULES.md#customer` (soft delete, no hard uniqueness on phone).

## Requirements
- `deleted_at` nullable, defaults to null.
- No unique constraint on `phone` (soft-duplicate check is application-level, per business rules).

## Implementation Notes
None beyond the ERD definition.

## Files / Modules
`backend/prisma/schema.prisma`, new migration.

## Validation
Migration applies cleanly; a manual insert/query round-trips correctly via Prisma Studio or a throwaway script.

## Acceptance Criteria
- Schema matches `ERD.md` exactly for this table.

## Definition of Done
- Migration committed and applied to the dev database.

# TASK-013 — Database Schema: Orders, Order Items, Measurement Snapshots

## Objective
Add `order_number_counters`, `orders`, `order_items`, `order_measurement_snapshots`, `order_measurement_snapshot_values`, and `order_status_histories` tables.

## Scope
- Add all six models per `database/ERD.md`.
- Migrate.

## Out of Scope
- API/UI (Tasks 014–017).

## Dependencies
TASK-002, TASK-005 (customer FK), TASK-008 (garment type FK), TASK-010 (measurement version FK).

## Architecture Context
`database/ERD.md` (orders section); `DECISIONS.md#D-003`, `#D-011`.

## Requirements
- `orders.order_number` UNIQUE.
- `order_measurement_snapshots`: partial unique index `UNIQUE(order_id) WHERE superseded_by_resnapshot_at IS NULL` (implement via a raw SQL migration addition, since Prisma's schema DSL does not support partial unique indexes directly — document this in the migration).
- No `deleted_at` on `orders` (cancellation-only deletion model).

## Implementation Notes
- The partial unique index requires a manual SQL block in the generated migration file (Prisma allows this via `prisma migrate dev --create-only` then editing the migration before applying). Document this clearly in a code comment in the migration.

## Files / Modules
`backend/prisma/schema.prisma`, new migration (with manual SQL edit).

## Validation
Migration applies cleanly; attempting to insert two non-superseded snapshots for the same order fails at the database level.

## Acceptance Criteria
Schema matches ERD; partial unique constraint verified by a manual test insert.

## Definition of Done
Migration committed, applied, and the partial-unique behavior confirmed.

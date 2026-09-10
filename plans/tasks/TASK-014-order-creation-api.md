# TASK-014 — Order Creation API

## Objective
Implement order creation, including order number generation, measurement snapshotting, and pricing calculation.

## Scope
- `POST /api/orders` per `API.md#orders`.
- Order number generation via `order_number_counters` with row-level locking (`SELECT ... FOR UPDATE` inside the transaction, via Prisma's raw query or `$transaction` with appropriate isolation).
- Call `measurements.getCurrentMeasurementVersion(customerId)`; if none exists, throw a `BUSINESS_RULE_VIOLATION` guiding the operator to record a measurement first.
- Copy the current version's values into a new `order_measurement_snapshot` + `order_measurement_snapshot_values`.
- Compute `subtotal` (sum of item `quantity*unitPrice`), `total = subtotal + additionalCost + expressFee - discount`.
- Insert initial `order_status_histories` row (`from_status=null`, `to_status=DRAFT`).
- Wrap everything in one transaction; call `recordAudit('order','create',...)`.

## Out of Scope
- Status transitions beyond initial `DRAFT` (Task 015).
- List/detail GET endpoints (Task 016).
- UI (Task 017).

## Dependencies
TASK-004, TASK-011, TASK-013.

## Architecture Context
`ARCHITECTURE.md` §7 (Data Flow example is this exact task); `BUSINESS-RULES.md#order`, `#measurement`.

## Requirements
- Validate `customerId` exists and is not soft-deleted.
- Validate each `items[].garmentTypeId` references an active garment type.
- Order created with `status=DRAFT` regardless of item count (an empty-item `DRAFT` is allowed per business rules; items can be added via `PATCH /orders/:id/items` before confirming — see Task 016/017 for that endpoint's home, though it may be implemented in this task if simpler to keep item-writing logic together — **decision: implement `PATCH /orders/:id/items` in this task** since it shares all the same subtotal/total recomputation logic as creation).

## Implementation Notes
- A service layer (`orders.service.ts`) is warranted per `ARCHITECTURE.md` §3.2 given the multi-table transactional orchestration.
- Reuse the `shared/money` helper for all arithmetic.

## Files / Modules
`backend/src/modules/orders/*`.

## Validation
Integration tests: create order with items → correct totals, correct snapshot values matching the customer's current measurement version, correct order number format and sequencing across multiple orders in the same year; create order for a customer with no measurement version → `409 BUSINESS_RULE_VIOLATION`.

## Acceptance Criteria
- Order numbers are unique and correctly sequenced even under concurrent creation (verified via a test that fires multiple creations concurrently).
- Snapshot values exactly match the source measurement version at creation time.
- Later changes to the customer's measurement do not alter the snapshot (verified by creating a new measurement version after order creation and re-fetching the order).

## Definition of Done
Order creation and item-replace endpoints implemented and tested per above.

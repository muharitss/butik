# TASK-016 — Order List/Detail API, and Retroactive Customer-Deletion Guard

## Objective
Implement order listing/search and full order detail retrieval; complete the customer soft-delete guard deferred in TASK-006.

## Scope
- `GET /api/orders` and `GET /api/orders/:id` per `API.md#orders`.
- Update the `customers` module's delete guard (from TASK-006) to actually check for non-cancelled orders and block deletion with `409 CONFLICT` if any exist.
- `PATCH /api/orders/:id` for mutable-field updates while `status` is `DRAFT`/`CONFIRMED`.
- `POST /api/orders/:id/resnapshot`.

## Out of Scope
- UI (Task 017).

## Dependencies
TASK-006, TASK-014, TASK-015.

## Architecture Context
`API.md#orders`; `BUSINESS-RULES.md#customer` (deletion guard), `#measurement` (resnapshot rule).

## Requirements
- Detail response assembles: order + items + current (non-superseded) snapshot + values + payments summary (paid_total, remaining_balance, payment_status) + fittings + revisions + attachments (non-deleted) + status history — all in one response to minimize round trips for the detail page.
- List supports `q`, `status`, `dueBefore`, `dueAfter` filters and pagination.
- `PATCH /api/orders/:id` rejects (409) if status is not `DRAFT`/`CONFIRMED`.
- `resnapshot` creates a new snapshot from the customer's current measurement version, marks the old one `superseded_by_resnapshot_at`, and audit-logs before/after snapshot values.

## Implementation Notes
- Compose the detail response via parallel Prisma queries (or a single query with relations) rather than N+1 sequential calls.

## Files / Modules
`backend/src/modules/orders/*`, `backend/src/modules/customers/*` (guard update).

## Validation
Integration tests: list filters behave correctly; detail response includes all sub-resources; customer with a `DRAFT` order cannot be deleted, but can after that order is `CANCELLED`; resnapshot correctly supersedes the old snapshot.

## Acceptance Criteria
- Customer deletion guard from `BUSINESS-RULES.md#customer` is fully enforced (closing the gap noted in TASK-006).
- Order detail is a complete, single-call view for the frontend.

## Definition of Done
Endpoints implemented and tested; TASK-006's deferred guard closed out.

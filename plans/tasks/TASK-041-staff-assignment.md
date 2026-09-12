# TASK-041 — Staff Assignment for Orders

## Objective

Allow orders to be assigned to a specific staff member (tailor). Track who is responsible for each order's production. The `User` model already exists; this task adds the assignment relation to `Order` and exposes it in the API and UI.

## Scope

**Backend:**
- Add `assignedToId String? @map("assigned_to_id") @db.Uuid` to the `Order` model with a nullable relation to `User`
- Extend `GET /api/orders` list response to include `assignedTo: { id, name } | null`
- Extend `GET /api/orders/:id` detail to include `assignedTo`
- Extend `PATCH /api/orders/:id` to accept `assignedToId` (valid active user UUID, or `null` to unassign); restricted to orders with status `DRAFT`, `CONFIRMED`, or `IN_PROGRESS`
- Extend `GET /api/orders` query params: `assignedToId` for filtering by staff member
- Audit log entry for assignment changes (before/after `assignedToId`)

**Frontend:**
- Assignment dropdown on `OrderDetailPage` (rendered only when status allows editing)
- Staff filter on `OrderListPage`

## Out of Scope

- Assignment to multiple staff members simultaneously (Post-MVP)
- Assignment history per order beyond what the audit log captures (Post-MVP)
- Time tracking or productivity metrics (Post-MVP)
- Staff workload view (can be seen by filtering `OrderListPage` by staff; no dedicated view needed)

## Dependencies

TASK-032, TASK-035 (`GET /api/users` needed for the assignment dropdown)

## Architecture Context

`DOMAIN.md#Order` — assignment is operational metadata on the Order aggregate.
`ARCHITECTURE.md#3.4` — assignment change inside `PATCH /api/orders/:id` is part of the existing update transaction; audit log is written in the same transaction.
`DECISIONS.md#D-008` — Order is never deleted; assignment changes are mutable metadata (not immutable financial/status data).

## Database Changes

`Order` model additions:
- `assignedToId String? @map("assigned_to_id") @db.Uuid`
- Relation: `assignedTo User? @relation("OrderAssignment", fields: [assignedToId], references: [id], onDelete: SetNull)`
- Index: `@@index([assignedToId])`

`User` model: add inverse relation `assignedOrders Order[] @relation("OrderAssignment")`

Migration required.

## Requirements

- `assignedToId` must reference a user with `isActive=true`; assigning an inactive user returns `409 BUSINESS_RULE_VIOLATION`
- Unassigning (setting `assignedToId: null`) is always allowed while status permits editing
- Assignment change is only allowed when order status is `DRAFT`, `CONFIRMED`, or `IN_PROGRESS`; attempting to assign a `FITTING`/`REVISION`/`READY` order returns `409`
- Audit log records the assignment change with `before: { assignedToId }` and `after: { assignedToId }`
- The assignment dropdown in the UI fetches the active user list from `GET /api/users`

## Implementation Notes

- Extend `orders.schemas.ts` `UpdateOrderInput` with optional `assignedToId: z.string().uuid().nullable().optional()`
- In `orders.service.ts` `updateOrder`: validate that the referenced user is active if `assignedToId` is provided
- Frontend dropdown: show `name` for each user, value is UUID; include a "Unassign" option (null)

## Files / Modules

`backend/prisma/schema.prisma` — add `assignedToId` to Order; add inverse relation to User
`backend/prisma/migrations/` — new migration
`backend/src/modules/orders/orders.schemas.ts` — add `assignedToId` to update schema
`backend/src/modules/orders/orders.service.ts` — validate active user and audit assignment change
`frontend/src/features/orders/pages/OrderDetailPage.tsx` — add assignment dropdown
`frontend/src/features/orders/components/AssignmentDropdown.tsx` — new
`frontend/src/features/orders/pages/OrderListPage.tsx` — add staff filter
`plans/database/ERD.md` — update Order entity with `assigned_to_id`

## Validation

- Assigning an inactive user's ID returns `409`
- Assigning a valid active user is reflected in `GET /api/orders/:id`
- `GET /api/orders?assignedToId=<userId>` returns only orders assigned to that user
- Attempting to assign an order in `FITTING` status returns `409`
- Unassigning (setting `assignedToId: null`) succeeds
- Audit log records the change

## Acceptance Criteria

- Orders can be assigned and unassigned via the `OrderDetailPage`
- Staff filter on the order list works correctly
- Only active users can be assigned

## Definition of Done

- Implementation complete
- Migration created and applied
- Integration tests: valid assignment, inactive-user assignment (409), status-restricted assignment (409), unassign, filter
- `plans/database/ERD.md` updated
- Existing tests passing

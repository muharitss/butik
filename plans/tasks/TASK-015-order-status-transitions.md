# TASK-015 — Order Status Transition API

## Objective
Implement the governed order status transition endpoint per the state machine.

## Scope
- `POST /api/orders/:id/transition` per `API.md#orders`.
- Implement the full transition table from `STATE-MACHINES.md#order`, including the `requires_fitting` branching logic.
- Enforce the `READY → COMPLETED` balance guard (`remaining_balance <= 0`), reading from `paid_total_cache`/order total.
- Insert `order_status_histories` row for every transition, including cancellations (with required `reason`).
- Call `recordAudit('order','status_change',...)` with before/after status.

## Out of Scope
- The endpoints that *cause* implicit transitions from fitting/revision actions (e.g., recording a fitting result) — those live in Tasks 020/022, which will call this module's exported transition function rather than duplicating the transition table.

## Dependencies
TASK-014.

## Architecture Context
`STATE-MACHINES.md#order`; `DECISIONS.md#D-005`.

## Requirements
- Export a `transitionOrder(orderId, toStatus, { reason, actorId })` function usable by other modules (fittings, revisions) per the module-boundary rule in `ARCHITECTURE.md` §3.3.
- Reject illegal transitions with `409 BUSINESS_RULE_VIOLATION`, including a message naming the current status and the attempted target.
- `CONFIRMED` transition requires ≥1 order item (query at transition time).

## Implementation Notes
- Represent the transition table as an explicit in-code map (`Record<FromStatus, ToStatus[]>` plus a per-transition guard function) rather than scattered `if` statements, so it visibly matches `STATE-MACHINES.md` and is easy to audit against that document.

## Files / Modules
`backend/src/modules/orders/orders.rules.ts` (transition table + guards), `orders.service.ts` (exported `transitionOrder`).

## Validation
Integration tests covering: every legal transition in the table succeeds; a representative sample of illegal transitions (e.g., `DRAFT→READY`, `COMPLETED→*`, `CANCELLED→*`) are rejected; `READY→COMPLETED` is rejected when balance > 0 and succeeds when balance ≤ 0.

## Acceptance Criteria
- Transition table in code matches `STATE-MACHINES.md#order` exactly (a reviewer can check one against the other line by line).
- All illegal transitions are rejected; all legal ones succeed under their stated guards.

## Definition of Done
Transition endpoint and exported function implemented and tested; audit entries verified.

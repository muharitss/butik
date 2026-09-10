# TASK-018 — Payment Schema and API

## Objective
Add the `payments` table and implement payment recording with balance/status recomputation.

## Scope
- Add `Payment` model per `database/ERD.md`.
- Migrate.
- Implement `GET/POST /api/orders/:orderId/payments` per `API.md#payments`.
- Enforce overpayment rule, `ADJUSTMENT` note requirement, and negative-amount-only-for-adjustment rule.
- Recompute and persist `orders.paid_total_cache` and `payment_status_cache` in the same transaction as the payment insert.

## Out of Scope
- UI (Task 019).

## Dependencies
TASK-004, TASK-013 (orders table).

## Architecture Context
`database/ERD.md#payments`; `BUSINESS-RULES.md#payment`; `STATE-MACHINES.md#payment-rules`; `DECISIONS.md#D-004`, `#D-010`.

## Requirements
- `type` enum validated (`DP`/`PARTIAL`/`FINAL`/`ADJUSTMENT`).
- Non-adjustment `amount` must be > 0; would-exceed-total check runs against `order.total - current paid_total` using the money helper's decimal-safe comparison.
- `reversedPaymentId`, if provided, must reference an existing payment on the same order.
- Export a function (`getOrderBalance(orderId)`) for the `orders` module's status-transition guard (TASK-015) to call — reconcile: since TASK-015 precedes this task in dependency order but needs balance data, TASK-015's `READY→COMPLETED` guard should be implemented against `orders.paid_total_cache` directly (already available once any payment task writes it) rather than importing from `payments` module, avoiding a circular dependency between `orders` and `payments`. Document this resolution in `DECISIONS.md` if it wasn't already covered.

## Implementation Notes
- A small service layer (`payments.service.ts`) is warranted for the transactional recompute step.

## Files / Modules
`backend/prisma/schema.prisma` (add Payment model, migrate), `backend/src/modules/payments/*`.

## Validation
Integration tests: DP then partial then final payments reaching exactly `PAID`; an overpayment attempt rejected; an `ADJUSTMENT` with negative amount and note accepted and correctly reduces `paid_total_cache`.

## Acceptance Criteria
- Balance/status cache is always consistent with the sum of that order's payments after every write.
- Overpayment is impossible outside of `ADJUSTMENT`.

## Definition of Done
Schema, API implemented and tested; audit entries verified.

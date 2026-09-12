# TASK-037 — Customer CRM: History and Statistics

## Objective

Enhance the customer detail page with aggregated historical data: lifetime spending, order count, outstanding balance, payment history across all orders, and measurement version count. No new domain entities — all data is derived from existing models.

## Scope

**Backend:**
- Extend `GET /api/customers/:id` response with:
  - `orderCount: number` — all orders including cancelled
  - `totalSpending: string` — sum of `order.total` for non-`CANCELLED` orders
  - `outstandingBalance: string` — sum of (`order.total - order.paidTotalCache`) for orders where `paymentStatusCache != 'PAID'` and status not `CANCELLED`
  - `lastOrderAt: string | null` — `createdAt` of the most recent order
  - `measurementVersionCount: number`
- New endpoint: `GET /api/customers/:id/payments` — all payments across all of the customer's orders, newest first, each record including `orderNumber` and `orderId` for navigation

**Frontend:**
- Stats cards row at the top of `CustomerDetailPage`
- Payment history tab alongside the existing order history section

## Out of Scope

- Customer segmentation, tags, or scoring (Post-MVP)
- Customer portal / self-service view (Post-MVP)
- Export of customer history (TASK-045)

## Dependencies

TASK-031 (MVP base). TASK-032 for auth protection of the endpoints.

## Architecture Context

`DOMAIN.md#Customer` — Customer owns measurement versions and orders; all stats are derivable from existing relations.
`API.md#Customers` — `GET /api/customers/:id` already includes `orders[]`; this extends the DTO with computed aggregates.
`ARCHITECTURE.md#3.2` — no service layer; extend the existing handler with Prisma aggregates.

## Requirements

- Stats computed in a single efficient query using Prisma's `_count` and `_sum` aggregates — avoid N+1
- `totalSpending` excludes `CANCELLED` orders
- `outstandingBalance` computed from `paidTotalCache` (not re-summing payments) for consistency with the existing payment cache pattern (`DECISIONS.md#D-014`)
- `GET /api/customers/:id/payments`: paginated (`page`, `pageSize`); ordered by `recordedAt DESC`; each record: `{ id, orderId, orderNumber, type, amount, method, note, recordedAt }`

## Implementation Notes

- Extend `getCustomerById` handler with a parallel `prisma.order.aggregate` for spending and an `prisma.payment.findMany` joined through orders
- Add `GET /:id/payments` to `customers.router.ts` (before the `/:id` route to avoid conflicts)
- Frontend: add a `<CustomerStatsCards>` component above the existing tabs; add a Payments tab to the existing tabbed section

## Files / Modules

`backend/src/modules/customers/customers.handlers.ts` — extend detail response; add payment history handler
`backend/src/modules/customers/customers.router.ts` — add `GET /:id/payments`
`frontend/src/features/customers/pages/CustomerDetailPage.tsx` — add stats cards, payment tab
`frontend/src/features/customers/components/CustomerStatsCards.tsx` — new
`frontend/src/features/customers/components/CustomerPaymentsTab.tsx` — new
`frontend/src/features/customers/api/customers.api.ts` — add `fetchCustomerPayments`
`plans/api/API.md` — document extended customer detail response and new payments endpoint

## Validation

- Customer with 3 orders (2 completed, 1 cancelled): `orderCount=3`, `totalSpending` excludes the cancelled order
- Customer with 0 orders: all stats are zero
- Payment history endpoint returns payments across all orders, newest first, with `orderNumber` on each record
- Customer with fully paid orders: `outstandingBalance` is `"0.00"`

## Acceptance Criteria

- Stats cards show accurate aggregated data
- Payment history is navigable and links to the parent order
- No N+1 queries in the customer detail endpoint

## Definition of Done

- Implementation complete
- Integration test: multi-order, multi-payment customer returns correct aggregate stats
- `plans/api/API.md` updated
- Existing tests passing

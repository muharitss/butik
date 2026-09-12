# TASK-038 — Reporting Infrastructure

## Objective

Establish a backend `reports` module providing period-based aggregate endpoints. This is the data layer consumed by the reports UI (TASK-039). No frontend in this task.

## Scope

- New `backend/src/modules/reports/` module
- `GET /api/reports/summary` — period-aggregate report filterable by `from`/`to` date
- Shared `buildDateRangeFilter(from?, to?)` helper within the module
- All report endpoints owner-only (via `authorize('reports:view')` from TASK-034)

## Out of Scope

- Reports UI (TASK-039)
- CSV export (TASK-045)
- Staff-level performance reports (Post-MVP)
- Accounting or tax integrations (Post-MVP)

## Dependencies

TASK-032, TASK-034

## Architecture Context

`ARCHITECTURE.md#3.2` — reports are read-only aggregations; handler-level Prisma aggregates are appropriate; no service layer.
`ARCHITECTURE.md#3.3` — module may read other modules' Prisma models directly (this is a monolith); no cross-module business rule duplication.

## Requirements

`GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`:

| Field | Description |
|---|---|
| `totalOrders` | Count of all orders where `orderDate` is in period |
| `completedOrders` | Count of `COMPLETED` orders where `orderDate` is in period |
| `cancelledOrders` | Count of `CANCELLED` orders where `orderDate` is in period |
| `totalRevenue` | Sum of `order.total` for `COMPLETED` orders where `orderDate` is in period |
| `totalCollected` | Sum of `payment.amount` where `recordedAt` is in period |
| `outstandingBalance` | Sum of (`order.total - order.paidTotalCache`) for all non-CANCELLED, non-fully-paid orders (global snapshot; not period-filtered) |
| `newCustomers` | Count of customers where `createdAt` is in period and `deletedAt IS NULL` |

- Both `from` and `to` are optional ISO date strings; when omitted, no date filter is applied
- Response follows the standard envelope: `{ data: { ... }, meta: {} }`
- Invalid date strings return `400 VALIDATION_ERROR`

## Implementation Notes

- `buildDateRangeFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined` — returns undefined if both are absent, otherwise builds `{ gte, lte }` from date-only strings (append `T00:00:00Z` and `T23:59:59.999Z` respectively)
- Keep all queries as separate `prisma.order.aggregate` / `prisma.payment.aggregate` / `prisma.customer.count` calls — readable over clever
- `ponytail:` 5 separate aggregate queries per request is fine at boutique scale. Upgrade path: `Promise.all` them (they are already independent) — do this from day one.

## Files / Modules

`backend/src/modules/reports/reports.router.ts` — new
`backend/src/modules/reports/reports.handlers.ts` — new
`backend/src/modules/reports/reports.schemas.ts` — new (Zod query param validation)
`backend/src/modules/reports/reports.utils.ts` — `buildDateRangeFilter`
`backend/src/modules/reports/index.ts` — new
`backend/src/app.ts` — mount `/api/reports`
`plans/api/API.md` — add Reports endpoint group

## Validation

- `GET /api/reports/summary?from=2026-01-01&to=2026-03-31` with known seeded data returns correct totals for the period
- `GET /api/reports/summary` (no date filter) aggregates all records
- `staff` user receives `403`
- `from=not-a-date` returns `400 VALIDATION_ERROR`
- `totalRevenue` includes only `COMPLETED` orders

## Acceptance Criteria

- Summary report returns accurate aggregated data verified against known seeded values
- Owner-only access enforced via `authorize` middleware
- All 5 aggregate queries run in parallel via `Promise.all`

## Definition of Done

- Implementation complete
- Integration test with seeded data asserting correct aggregate values for a bounded period
- `plans/api/API.md` updated with Reports endpoint group
- Existing tests passing

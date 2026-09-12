# TASK-039 — Reports UI

## Objective

Implement the frontend reports section: a summary dashboard with period-based KPI cards, order breakdown, and payment breakdown. Consumes the `GET /api/reports/summary` endpoint from TASK-038.

## Scope

- `/reports` route — reports hub page (owner only via `usePermission`)
- Date range selector with presets: "This Month", "Last Month", "This Year", "All Time"
- Summary KPI cards: total orders, revenue, collected payments, outstanding balance, new customers
- Order breakdown: paginated order list filtered to the selected period (reuses `GET /api/orders` with date params)
- Payment breakdown: paginated payment aggregate for the period (from `totalCollected` breakdown, or a separate orders/payments list)
- Reports nav item visible only to `owner` role

## Out of Scope

- Charts or graphs (Post-MVP — add if trivially addable with a zero-dependency canvas, otherwise defer)
- CSV/Excel export (TASK-045)
- Per-garment-type performance breakdown (Post-MVP)
- Staff performance report (Post-MVP)

## Dependencies

TASK-038, TASK-033

## Architecture Context

`ARCHITECTURE.md#4.1` — new `features/reports/` directory following the established feature structure.
`DECISIONS.md#D-012` — no global state library; date range state is local to the ReportsPage component.

## Requirements

- Reports page is only accessible to `owner` role; navigation item hidden for `staff`
- Date range presets generate correct `from`/`to` ISO date strings for the API query
- KPI cards re-fetch when the date range changes
- Order and payment lists within the reports view are read-only (no action buttons)
- Loading and error states handled for all data sections

## Implementation Notes

- `frontend/src/features/reports/` — new feature directory
- `DateRangePicker` component: a reusable preset-based selector; can be a simple `<select>` with preset options plus optional custom date inputs — keep it simple
- KPI card values are formatted using the existing money/date formatting patterns from other features
- The order list within reports reuses `fetchOrders` from the orders feature's API module with `orderDate` range params

## Files / Modules

`frontend/src/features/reports/pages/ReportsPage.tsx` — new
`frontend/src/features/reports/api/reports.api.ts` — new
`frontend/src/features/reports/components/SummaryCards.tsx` — new
`frontend/src/features/reports/components/DateRangePicker.tsx` — new (or `frontend/src/components/DateRangePicker.tsx` if reused elsewhere)
`frontend/src/features/reports/types/reports.types.ts` — new
`frontend/src/features/reports/index.ts` — new
`frontend/src/app/router.tsx` — add `/reports` route
`frontend/src/app/AppShell.tsx` — add Reports nav item (owner only)

## Validation

- Owner sees the Reports nav item; staff does not
- Selecting "This Month" updates all KPI cards with the current month's data
- KPI values match the `GET /api/reports/summary` response for the same date range
- Loading skeleton shown while data is fetching
- Selecting "All Time" removes date filters and aggregates all records

## Acceptance Criteria

- Reports page loads and displays accurate data
- Owner-only nav visibility enforced via `usePermission`
- All preset date ranges produce correct API queries
- Page is usable without charts (tabular data is sufficient)

## Definition of Done

- Implementation complete
- Manual verification of KPI values against known order/payment data
- Reports nav item appears for owner, absent for staff
- Existing frontend self-checks remain passing

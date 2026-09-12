# TASK-045 — Data Export (Customer and Order CSV)

## Objective

Allow the owner to export customer and order data as UTF-8 CSV files for offline analysis, backup, or accounting. Triggered from the existing list pages.

## Scope

**Backend:**
- `GET /api/customers/export` — CSV of all active customers (owner only)
- `GET /api/orders/export` — CSV of orders filterable by `from`/`to` (orderDate) and `status` (owner only)
- Both return streaming CSV responses with correct `Content-Disposition` headers

**Frontend:**
- "Export CSV" button on `CustomerListPage` (owner only)
- "Export CSV" button on `OrderListPage` (owner only); exports with the current `status` filter applied
- Both trigger a browser file download

## Out of Scope

- Excel / XLSX format (Post-MVP)
- Measurement export (complex nested structure; Post-MVP)
- Data import (Post-MVP)
- PDF generation (see `CONSISTENCY-REVIEW.md` — browser print-to-PDF is sufficient for MVP)

## Dependencies

TASK-032, TASK-034

## Architecture Context

`ARCHITECTURE.md#3.2` — CSV generation is a presentation concern handled directly in the handler; no service layer.
`ponytail:` Full-table scan export is O(n) — acceptable for boutique scale (< 10,000 records). Upgrade: Prisma cursor-based streaming if row count grows.

## Requirements

**Customer export CSV columns:**
`id, name, phone, email, address, notes, createdAt`

**Order export CSV columns:**
`orderNumber, status, customerName, customerPhone, total, paidTotal, remainingBalance, paymentStatus, deadlineAt, orderDate, requiresFitting, notes`

- CSV uses UTF-8 with BOM (`\uFEFF`) for correct Excel rendering on Windows
- `Content-Disposition: attachment; filename="customers-YYYY-MM-DD.csv"` (date = today)
- Date/time values exported in ISO 8601 format
- Monetary values exported as raw decimal numbers without currency symbols (e.g., `150000.00`)
- No pagination — all matching records in one response
- `from` and `to` query params for the order export are ISO date strings (`YYYY-MM-DD`)

## Implementation Notes

- CSV generation: Node.js string concatenation — no CSV library needed at this volume
- Header row is the first line of the CSV
- Each field is quoted with `"` and internal `"` are escaped as `""`
- Routes must be defined **before** the `/:id` route in each router to avoid Express treating `export` as an ID
- Frontend download: open a fetch request with credentials (cookie) and use `URL.createObjectURL` + an anchor click

## Files / Modules

`backend/src/modules/customers/customers.handlers.ts` — add `exportCustomers` handler
`backend/src/modules/customers/customers.router.ts` — add `GET /export` route (before `/:id`)
`backend/src/modules/orders/orders.handlers.ts` — add `exportOrders` handler
`backend/src/modules/orders/orders.router.ts` — add `GET /export` route (before `/:id`)
`frontend/src/features/customers/pages/CustomerListPage.tsx` — add Export button (owner only)
`frontend/src/features/orders/pages/OrderListPage.tsx` — add Export button (owner only)
`plans/api/API.md` — document export endpoints

## Validation

- `GET /api/customers/export` returns a CSV with a header row and one data row per active customer
- `GET /api/orders/export?status=COMPLETED&from=2026-01-01&to=2026-12-31` returns only completed orders in the date range
- `staff` user receives `403`
- Downloaded CSV opens correctly in Microsoft Excel with correct column headers and character encoding
- Monetary values are plain decimals (no "Rp" prefix)
- Dates are ISO 8601

## Acceptance Criteria

- CSV files download correctly in Chrome and Firefox
- All specified columns are present and correctly formatted
- Owner-only access enforced
- `export` route does not conflict with `/:id` routes

## Definition of Done

- Implementation complete
- Manual verification: download customer CSV and order CSV, open in Excel
- `plans/api/API.md` updated with export endpoint documentation
- Existing tests passing

# TASK-029 — Printable Receipt

## Objective
Implement a printable receipt view for completed/in-progress orders.

## Scope
- `GET /api/orders/:orderId/receipt` per `API.md#receipts`.
- Frontend receipt view styled for print (simple, shopping-receipt-like layout) usable via the browser's native print/PDF function; no server-side PDF generation.

## Out of Scope
Server-side PDF generation (explicitly deferred; browser print-to-PDF is sufficient for MVP per `API.md#receipts` note).

## Dependencies
TASK-016, TASK-018.

## Architecture Context
`API.md#receipts`.

## Requirements
- Receipt includes: boutique name (a simple configured constant/env value for MVP, since multi-business is out of scope), order number, customer, items with quantities/prices, totals, payments summary, remaining balance, date.
- Print stylesheet hides app chrome (nav, buttons) when printing.

## Implementation Notes
None beyond the above.

## Files / Modules
`backend/src/modules/receipts/*`, `frontend/src/features/receipts/*`.

## Validation
Manual print-preview check on both mobile and desktop browsers.

## Acceptance Criteria
Receipt is legible and complete when printed or saved as PDF via the browser.

## Definition of Done
Feature implemented and verified via print preview.

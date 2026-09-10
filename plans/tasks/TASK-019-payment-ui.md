# TASK-019 — Payment UI

## Objective
Build payment recording and history display on the order detail page.

## Scope
- Payment history list (type, amount, method, note, date) on order detail.
- "Record payment" form (type, amount, method, note) with client-side preview of resulting balance before submit.
- Clear display of `paid_total`, `remaining_balance`, `payment_status` on order detail (replacing the read-only placeholder from TASK-017).

## Out of Scope
- Adjustment/reversal UI beyond a basic form supporting it (full "select which payment to reverse" UX can be simple: a dropdown of this order's payments when `type=ADJUSTMENT` is selected, feeding `reversedPaymentId`).

## Dependencies
TASK-003, TASK-017, TASK-018.

## Architecture Context
`API.md#payments`; `BUSINESS-RULES.md#payment`.

## Requirements
- Form disables submit / shows a warning if the entered amount would overpay (client-side pre-check mirroring server rule, server remains authoritative).
- Order detail's payment section updates immediately after a successful payment without a full page reload.

## Implementation Notes
None beyond the above.

## Files / Modules
`frontend/src/features/payments/*`, updates to `frontend/src/features/orders/*`.

## Validation
Manual walkthrough: record DP, partial, final payments; attempt an overpayment and confirm rejection; record an adjustment/reversal.

## Acceptance Criteria
Payment section on order detail is fully functional.

## Definition of Done
UI implemented and manually verified.

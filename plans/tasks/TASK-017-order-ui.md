# TASK-017 — Order UI

## Objective
Build order creation, list, and detail screens.

## Scope
- Order creation flow: select customer (search/select existing) → add items (garment type + quantity + unit price, showing that garment type's required measurement fields as informational context) → confirm pricing (additional cost/express fee/discount) → submit.
- Order list: searchable/filterable table (status, due date range).
- Order detail: shows all sections from the detail API (items, snapshot summary, payment summary, fittings/revisions/attachments/status history placeholders — those sections' full interactivity comes from later tasks; this task renders them read-only where their own tasks haven't landed yet, and should be revisited to wire in actions as those tasks complete).
- A prominent status-transition control on the detail page, calling `POST /orders/:id/transition`, showing only the legal next transitions for the current status (fetch or hard-code the same transition table client-side for display purposes only — the server remains the enforcement authority).

## Out of Scope
- Payment/fitting/revision/attachment interactive UI (their own tasks); this task only reserves/read-only-renders their sections.

## Dependencies
TASK-003, TASK-007, TASK-012, TASK-016.

## Architecture Context
`ARCHITECTURE.md` §4 (UI principles: staged forms are acceptable for order creation).

## Requirements
- Creation flow validates client-side (item count ≥1 before allowing "Confirm" — though `DRAFT` with zero items can still be saved as an intermediate step) mirroring server rules, but always defers final authority to server responses.
- Status control disables illegal transitions in the UI (informational only, not a security boundary).
- Order detail's "Order History" placeholder on the Customer detail page (from TASK-007) is now filled in with real data from `GET /api/orders?customerId=...` or via the customer detail endpoint's summary — reconcile with whichever the actual `GET /api/customers/:id` response shape ended up including in TASK-006.

## Implementation Notes
None beyond the above.

## Files / Modules
`frontend/src/features/orders/*`, updates to `frontend/src/features/customers/*`.

## Validation
Manual walkthrough: create an order end-to-end from an existing customer with a measurement on file; verify totals; walk it through a couple of legal status transitions; attempt an illegal one via direct API call (not UI) to confirm server-side rejection still holds regardless of UI.

## Acceptance Criteria
- Order creation, list, and detail are functional and match the API contracts.

## Definition of Done
UI implemented and manually verified.

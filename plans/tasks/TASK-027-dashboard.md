# TASK-027 — Dashboard API and UI
Status: COMPLETE

## Objective
Implement the operator dashboard summarizing current business state.

## Scope
- `GET /api/dashboard/summary` per `API.md#dashboard`.
- Dashboard UI page consuming it: active orders, due-soon, overdue, ready, upcoming fittings, unpaid/partial totals, recent orders — each as an actionable list/card linking to the relevant order.

## Out of Scope
Calendar (Task 028) — related but a distinct view.

## Dependencies
TASK-016 (orders), TASK-018 (payments), TASK-020 (fittings).

## Architecture Context
`API.md#dashboard`; `DECISIONS.md#D-013`.

## Requirements
- "Due soon" window configurable via query param, default 7 days.
- All figures computed via read queries over existing tables — no new persisted aggregate tables.
- Every list item on the dashboard links to its order detail page (actionable over decorative, per the product principle).

## Implementation Notes
- This module is read-only; keep it thin (a single handler assembling several Prisma aggregate queries), no service layer needed.

## Files / Modules
`backend/src/modules/dashboard/*`, `frontend/src/features/dashboard/*`.

## Validation
Manual walkthrough with a handful of seeded orders in various statuses/payment states, confirming each dashboard section reflects them correctly.

## Acceptance Criteria
Dashboard accurately reflects live data across all listed sections.

## Definition of Done
API + UI implemented and verified.

# TASK-028 — Calendar API and UI

## Objective
Implement a date-range calendar view over order deadlines and fittings.

## Scope
- `GET /api/calendar/events?from=&to=` per `API.md#calendar`.
- Calendar UI (month/week view acceptable) plotting deadline and fitting events, each linking to its order.

## Out of Scope
Any dedicated calendar-event entity — this is a view over existing data, not a new domain concept (`DOMAIN.md` intentionally has no `CalendarEvent` entity).

## Dependencies
TASK-016 (orders), TASK-020 (fittings).

## Architecture Context
`API.md#calendar`.

## Requirements
- Events are tagged by type (`deadline` / `fitting`) so the UI can style them distinctly.
- Query is bounded by `from`/`to` to avoid unbounded scans; reasonable default range (current month) if omitted.

## Implementation Notes
Thin, read-only module.

## Files / Modules
`backend/src/modules/calendar/*`, `frontend/src/features/calendar/*`.

## Validation
Manual walkthrough confirming deadlines and fittings appear on the correct dates and link correctly.

## Acceptance Criteria
Calendar accurately reflects live data for the queried range.

## Definition of Done
API + UI implemented and verified.

# TASK-040 — Audit Log UI

## Objective

Expose the existing backend audit log endpoint as a searchable, paginated frontend page visible to owners. The backend endpoint (`GET /api/audit-logs`) is already implemented; this task is frontend-only.

## Scope

- `/audit-logs` route (owner only)
- Paginated table: timestamp, actor name (or "System"), entity type, entity ID, action
- Filter bar: entity type dropdown, date range, entity ID text input
- Expandable "before / after" diff for entries that carry change payloads
- Each row links to the relevant entity detail page where applicable (customer → `/customers/:id`, order → `/orders/:id`)

## Out of Scope

- Backend changes to the audit log module (already complete and tested in TASK-026/031)
- Audit log export (Post-MVP)
- Real-time streaming of new audit events (Post-MVP)

## Dependencies

TASK-033, TASK-034

## Architecture Context

`ARCHITECTURE.md#4.1` — new `features/audit/` directory. Note: `backend/src/modules/audit/` already exists; this creates the corresponding frontend feature.
`API.md#Audit` — `GET /api/audit-logs` with `entityType`, `entityId`, `from`, `to`, `page`, `pageSize` is already defined and working.

## Requirements

- Route `/audit-logs` is owner-only; staff accessing it directly sees a 403/permission error state (the backend will return 403 and the frontend should show an appropriate message)
- Default view: all audit log entries, newest first, page size 20
- Filter bar applied filters to `entityType`, `from`/`to` (date), `entityId` (text)
- Each log entry shows: formatted timestamp (local time), actor display name or "System" if `actorId` is null, entity type, entity ID (truncated UUID), action verb
- Clicking entity ID for known types (customer, order) navigates to that entity's detail page
- Before/after diff: shown in an expandable section below the row; raw JSON is acceptable for MVP
- Pagination controls: previous / next page

## Implementation Notes

- Actor name: the audit log currently stores `actorId` only. For MVP, display `actorId` (truncated) or "System" if null. Full actor name resolution can be added in a follow-up if a users cache is available from TASK-035.
- The filter bar should use `<select>` for entity type dropdown with options: All, customer, order, payment, fitting, revision, attachment, garmentType, measurement
- The diff display can be a `<pre>` block with JSON.stringify(before/after, null, 2) — no diff library needed

## Files / Modules

`frontend/src/features/audit/pages/AuditLogPage.tsx` — new
`frontend/src/features/audit/api/audit.api.ts` — new
`frontend/src/features/audit/components/AuditLogTable.tsx` — new
`frontend/src/features/audit/components/AuditLogFilters.tsx` — new
`frontend/src/features/audit/types/audit.types.ts` — new
`frontend/src/features/audit/index.ts` — new
`frontend/src/app/router.tsx` — add `/audit-logs` route
`frontend/src/app/AppShell.tsx` — add Audit Log nav item (owner only)

## Validation

- Owner sees the Audit Log nav item and can access the page
- Staff user sees the Audit Log nav item hidden; direct URL access shows a permission error (not a blank page)
- Filtering by `entityType=customer` returns only customer audit entries
- Clicking a customer entity ID navigates to `/customers/<id>`
- "Before" and "after" JSON is visible in the expanded row
- Pagination works: page 2 loads the next set of entries

## Acceptance Criteria

- Audit log page renders paginated entries
- All filter combinations return correct results
- Owner-only navigation enforced
- Before/after diffs are viewable without external tools

## Definition of Done

- Implementation complete
- Manual verification against known audit log entries from existing tests
- AppShell navigation updated
- Existing frontend self-checks remain passing

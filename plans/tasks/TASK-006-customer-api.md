# TASK-006 — Customer API

## Objective
Implement the `customers` module's CRUD and search endpoints.

## Scope
- Implement all endpoints under `/api/customers` listed in `API.md#customers`.
- Implement the soft-duplicate phone check (warn-only, returned as a field in the create response's `meta`, e.g. `meta.possibleDuplicate: { id, name }`), not a hard block.
- Implement soft delete with the "blocked if active orders exist" rule — for this task, since Orders don't exist yet, implement the check as a no-op that always allows deletion, with a `// TODO(TASK-016 or later): enforce order-existence check` marker, OR sequence this task after Orders if preferred. **Decision for this plan: implement the guard as a stub returning true (always allowed) now, and revisit/complete it in TASK-016 once orders exist** — record this explicitly as a known temporary gap, not a silent omission.
- Wire `recordAudit` calls for create/update/delete.

## Out of Scope
- Order-existence enforcement on delete (temporarily deferred, see above).
- Frontend (Task 007).

## Dependencies
TASK-004, TASK-005.

## Architecture Context
`API.md#customers`; `BUSINESS-RULES.md#customer`; `ARCHITECTURE.md`'s audit cross-cutting convention.

## Requirements
- `GET /api/customers?q=&page=&pageSize=` — search matches `name ILIKE` or normalized `phone` contains.
- `POST /api/customers` — validates required `name`; optional `phone/email/address/notes`.
- `PATCH /api/customers/:id` — partial update of contact fields/notes.
- `DELETE /api/customers/:id` — soft delete (sets `deleted_at`), per the temporary-gap note above.
- All list/detail queries exclude `deleted_at IS NOT NULL` by default.

## Implementation Notes
- Keep this module's internals simple: handlers calling Prisma directly, no separate service layer (per `ARCHITECTURE.md` §3.2 — CRUD-only modules stay simple).

## Files / Modules
`backend/src/modules/customers/*`.

## Validation
Integration tests: create, get, update, search by name substring, search by phone, soft-delete then confirm excluded from list/detail.

## Acceptance Criteria
- All endpoints match `API.md` contracts.
- Soft-deleted customers never appear in default list/search/detail results.
- Audit log entries are created for create/update/delete.

## Definition of Done
- Endpoints implemented, integration tests passing, audit entries verified.

# TASK-011 — Measurement API

## Objective
Implement measurement version creation and retrieval endpoints.

## Scope
- Endpoints under `API.md#measurements`.
- Enforce: never update an existing version; every write is a new version + its values, in one transaction, with `version_number` computed as `max(existing)+1`.

## Out of Scope
- UI (Task 012); Order snapshot logic (Task 013–014, which will call this module's exported "get current version" function).

## Dependencies
TASK-004, TASK-010.

## Architecture Context
`BUSINESS-RULES.md#measurement`; `DECISIONS.md#D-003`.

## Requirements
- `GET /api/customers/:customerId/measurements` — all versions, newest first, each with its values.
- `GET /api/customers/:customerId/measurements/current` — the latest version (`404 NOT_FOUND` if none exist).
- `POST /api/customers/:customerId/measurements` — validates `values[]` field_keys against a shared vocabulary list (not garment-specific — any known field key is acceptable; garment-specific *requirement* is enforced at order-item-selection time in the UI/order API, not here).
- Export a function (e.g., `getCurrentMeasurementVersion(customerId)`) for the `orders` module to call at order-creation time (per `ARCHITECTURE.md` §3.3 module boundary rule — no reaching into Prisma models directly from `orders`).

## Implementation Notes
- A service-layer file (`measurements.service.ts`) is warranted here per `ARCHITECTURE.md` §3.2, since version-number computation + multi-row value insert is non-trivial orchestration.

## Files / Modules
`backend/src/modules/measurements/*`.

## Validation
Integration tests: create version, fetch current, fetch history, confirm sequential version numbers per customer.

## Acceptance Criteria
- No endpoint exists that edits/deletes an existing version's values.
- `getCurrentMeasurementVersion` is exported and usable by other modules.

## Definition of Done
API implemented and tested; export confirmed usable (even if not yet consumed until TASK-014).

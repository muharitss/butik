# TASK-004 — Shared Backend Conventions: Validation & Error Handling

## Objective
Establish the reusable validation and error-handling conventions every subsequent backend module will use, per `API.md`'s error table.

## Scope
- Choose and integrate a schema validation library (e.g., Zod) for request body/query validation.
- Implement a centralized error-handling Express middleware translating thrown domain errors (`ValidationError`, `NotFoundError`, `BusinessRuleViolationError`, `ConflictError`) into the HTTP status/error-code table in `API.md`.
- Implement pagination helper (`shared/http/pagination.ts`) matching `API.md` conventions (`page`, `pageSize`, `meta.total`).
- Implement the `shared/money` helper for decimal-safe arithmetic (add/subtract/multiply/compare) to be used everywhere monetary math occurs.

## Out of Scope
- Any specific module's validation schemas (defined per-module in later tasks).

## Dependencies
TASK-001, TASK-002.

## Architecture Context
`API.md` §Error Behavior; `ARCHITECTURE.md` §5 (monetary values as `DECIMAL(14,2)`, decision D-010).

## Requirements
- Custom error classes for each error code in `API.md`'s table, each carrying the right HTTP status.
- Middleware catches thrown errors (including Zod validation errors, mapped to `VALIDATION_ERROR`) and Prisma known errors (e.g., unique constraint → `CONFLICT`) and shapes them per the envelope.
- Money helper uses Prisma's `Decimal` (or an equivalent decimal library) — no native floating point in monetary calculations anywhere in the codebase from this point forward.

## Implementation Notes
- This task is a prerequisite for every module task below; keep its public API (error classes, money helpers, pagination helper) stable since many tasks will import from it.

## Files / Modules
`backend/src/shared/errors/*`, `backend/src/shared/validation/*`, `backend/src/shared/http/*`, `backend/src/shared/money/*`.

## Validation
Unit tests for money helper (rounding, comparison). Manual test: an intentionally invalid request to the health-check-adjacent test route returns the correct `VALIDATION_ERROR` shape.

## Acceptance Criteria
- All error codes in `API.md`'s table are producible and correctly shaped.
- Money helper has unit test coverage for basic arithmetic and comparison operations.

## Definition of Done
- Shared modules committed with unit tests; used successfully by at least one throwaway example route.

# TASK-031 — Hardening: Validation, Security, Testing, Deployment

## Objective
Close out MVP readiness: complete validation coverage, apply the MVP security checklist, fill out the test suite, and finalize deployment/migration/backup setup.

## Scope
- **Validation review:** walk every mutating endpoint against `API.md`'s error table and `domain/BUSINESS-RULES.md`; confirm server-side enforcement exists for every stated rule (not just UI-side checks).
- **Security pass** per `ARCHITECTURE.md` §9-adjacent concerns / master requirements: environment secrets never committed; input validation on every endpoint (via the shared validation library from TASK-004); CORS configured to the frontend's actual origin(s); file upload validation (format/size) confirmed at the Cloudinary layer; rate limiting on write endpoints (basic, e.g. per-IP) if the hosting environment doesn't already provide it; ensure logs never print secrets or full payment/customer PII at `info` level.
- **Testing completion:** ensure unit test coverage exists for pricing, payment balance, status transitions, measurement snapshot construction, and revision rules (per `ARCHITECTURE.md` §9); ensure integration tests cover customer/order APIs, order/payment flow, fitting/revision flow, and key database constraints (order number uniqueness, partial unique snapshot index); implement the E2E critical-path test (`create customer → create order → add measurement → add payment → progress order → fitting → revision → ready → final payment → complete`) using the tooling chosen in TASK-001.
- **Deployment finalization:** confirm environment separation (dev/prod env files), Prisma Migrate deploy process documented, automated daily PostgreSQL backup configured for the chosen hosting provider, basic error monitoring/logging configured (e.g., structured logs; an external error-tracking service is optional and not required for MVP).

## Out of Scope
Any new domain features. Post-MVP items listed in `ROADMAP.md`.

## Dependencies
All prior tasks.

## Architecture Context
`ARCHITECTURE.md` §9 (Testing), §10 (Deployment); `API.md`'s validation/error requirements throughout.

## Requirements
See Scope — each bullet is independently checkable.

## Implementation Notes
Track findings as a checklist in this task's PR/commit description; any gap found and fixed should reference which `BUSINESS-RULES.md`/`API.md` rule it closes.

## Files / Modules
Cross-cutting — touches most modules for small fixes; deployment config files (`Dockerfile`/hosting config as chosen, CI config if applicable, backup script/scheduled job config).

## Validation
Full test suite passes; a fresh deploy from scratch (migrate + seed) succeeds; the E2E critical path passes against a deployed or deploy-like environment.

## Acceptance Criteria
- No known validation or business-rule gap remains open.
- Full test pyramid (unit/integration/E2E) implemented per `ARCHITECTURE.md` §9.
- Deployment is repeatable and backed up.

## Definition of Done
All checklist items closed; MVP considered implementation-complete pending real-world operator feedback.

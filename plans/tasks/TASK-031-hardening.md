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

---

## Hardening Checklist & Findings Report

### 1. Validation Review
- [x] Walk every mutating endpoint against `API.md` and `domain/BUSINESS-RULES.md`:
  - `POST /api/customers` & `PATCH /api/customers/:id`: Zod schema validation; soft-duplicate phone check with warnings; phone normalization (`normalizePhone`).
  - `DELETE /api/customers/:id`: Soft delete enforced; deletion blocked if active non-cancelled orders exist (`canDeleteCustomer`).
  - `POST /api/garment-types` & `PATCH /api/garment-types/:id`: Name uniqueness triggers 409 CONFLICT; nested measurement fields schema validation; deactivation via soft-flag (`isActive=false`).
  - `POST /api/customers/:customerId/measurements`: Immutable version incrementing; vocabulary validation against allowed fields; positive decimal values.
  - `POST /api/orders`: Atomic sequential order number (`JF-YYYY-XXX`) generated via row-lock counter; customer existence and non-deleted check; snapshot copied from latest measurement version; initial `DRAFT` status and history recorded.
  - `PATCH /api/orders/:id` & `PATCH /api/orders/:id/items`: Restricted strictly to `DRAFT` or `CONFIRMED` statuses (409 if modified later); item replace recomputes totals.
  - `POST /api/orders/:id/transition`: Governed state machine matrix enforced (`validateTransition`); `DRAFT->CONFIRMED` requires ≥1 item, active customer, and snapshot; `IN_PROGRESS->READY` blocked if `requiresFitting: true`; `FITTING->READY` blocked if open revisions exist; `READY->COMPLETED` requires `remainingBalance <= 0`; cancellations and reopening require non-empty reasons.
  - `POST /api/orders/:id/resnapshot`: Allowed only pre-FITTING (`DRAFT`, `CONFIRMED`, `IN_PROGRESS`); supersedes existing snapshot and logs audit entry.
  - `POST /api/orders/:orderId/payments`: Overpayment strictly rejected unless `type=ADJUSTMENT` (409); negative amounts only permitted for `ADJUSTMENT` with required note; `reversedPaymentId` validated against same order; balance and payment caches updated transactionally.
  - `POST /api/orders/:orderId/fittings` & `PATCH /.../fittings/:id`: Scheduling fitting while in `REVISION` requires all open revisions resolved; marking `DONE` requires `result` (`APPROVED` or `NEEDS_REVISION`) and `occurredAt`; auto-transitions order to `REVISION` on `NEEDS_REVISION` and to `READY` on `APPROVED`.
  - `POST /api/orders/:orderId/revisions` & `PATCH /.../revisions/:id`: State machine enforced (`OPEN -> IN_PROGRESS -> RESOLVED / CANCELLED`); `RESOLVED` requires `resolvedAt`; `fittingId` validated.
  - `POST /api/orders/:orderId/attachments`: Format whitelist (`jpg`, `jpeg`, `png`, `webp`) and size limit (≤ 10MB); Cloudinary public ID validated to scoped order folder; soft delete in DB with best-effort Cloudinary destroy.
  - Audit logging wired across all mutating endpoints.

### 2. Security Pass
- [x] Environment secrets never committed: root `.gitignore` created and verified; `.env` is uncommitted.
- [x] Strict CORS configured: `backend/src/app.ts` evaluates `process.env.CORS_ORIGIN` with local fallback (`http://localhost:5173`, `http://127.0.0.1:5173`); unapproved browser origins rejected.
- [x] Write endpoint rate limiting: Zero-dependency in-memory per-IP rate limiter (`rateLimitWrites` in `shared/middleware/rateLimiter.ts`) throttles mutating requests (120 req / 15 min per IP) with HTTP 429 `RATE_LIMIT_EXCEEDED` and `Retry-After` headers.
- [x] Structured logging & PII/Secret safety: `shared/logger/logger.ts` structured JSON logger automatically redacts sensitive keys (`password`, `token`, `secret`, `apiKey`, `apiSecret`, `authorization`, `cookie`, `signature`); HTTP access logging records method, route, status code, latency without logging request bodies at info level.
- [x] Error monitoring: `errorHandler.ts` pipes unhandled 500 errors through `logger.error` with stack trace while preserving standard response envelope.

### 3. Testing Pyramid Completion
- [x] Pure unit test suite (`backend/src/unit.test.ts`):
  - Pricing calculation (`computeOrderTotals`): item subtotals, additional cost, express fee, discount, and negative total rejection.
  - Status transitions (`validateTransition`): full transition matrix, terminal states, item requirement, fitting requirement, revision blocking, balance requirement, cancellation reasons.
  - Revision rules (`validateRevisionTransition`): allowed transitions and terminal state enforcement.
  - Payment balance math: accurate evaluation of remaining balance, payment status (`UNPAID`, `PARTIAL`, `PAID`), and overpayment detection.
- [x] Database constraint tests (`backend/src/modules/orders/orders.constraints.test.ts`):
  - Order number uniqueness (`orders_order_number_key` P2002).
  - Partial unique active snapshot index (`order_measurement_snapshots_order_id_active_unique` P2002 prevention of duplicate active snapshots).
- [x] E2E Critical-path test (`backend/src/e2e.test.ts`):
  - Complete 17-step lifecycle: `Customer creation → Measurement versioning → Order creation (DRAFT + snapshot) → CONFIRMED → Down Payment (DP) → IN_PROGRESS → FITTING → Fitting 1 (NEEDS_REVISION) → REVISION → Revision created & resolved → FITTING 2 → Fitting 2 (APPROVED) → READY → Premature completion blocked (409) → Final payment (balance = 0) → COMPLETED → Detail assembled verification`.
- [x] Unified frontend test runner (`frontend/src/runChecks.ts`):
  - `npm test` runs all 13 feature self-checks across attachments, calendar, customers, dashboard, fittings, garments, measurements, orders, whatsapp, payments, receipts, revisions, and apiClient.

### 4. Deployment Finalization
- [x] Container configuration: `backend/Dockerfile` multi-stage production image and root `docker-compose.yml` (PostgreSQL 16 + JahitFlow backend).
- [x] Automated PostgreSQL backups: `scripts/backup-db.sh` (Bash) and `scripts/backup-db.ps1` (PowerShell) with timestamping, gzip compression, and 14-day retention cleanup.
- [x] Deployment documentation: `plans/DEPLOYMENT.md` detailing migration deploy, seeding, backups, container/PaaS deployment, security, and verification.
- [x] Package scripts: added `"migrate:deploy"` and `"db:seed"` to `backend/package.json`.


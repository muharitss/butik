# TASK-047 — Production Observability Hardening

## Objective

Improve production observability: add a database-backed `/api/readiness` endpoint, attach unique request IDs to every request log line and error response, and document the monitoring baseline. No new domain features.

## Scope

- `GET /api/readiness` — checks PostgreSQL connectivity; returns `200` or `503`
- Request ID middleware: generates a UUID per request, propagated via `AsyncLocalStorage`; included in all log lines and error responses as `X-Request-Id` header
- Structured log format: ensure every log line emitted by `requestLogger` includes `{ requestId, method, path, statusCode, durationMs }`
- Error responses: include `requestId` in the error body: `{ error: { code, message, requestId } }`
- `plans/DEPLOYMENT.md`: document the readiness endpoint, `X-Request-Id` header, and a minimal monitoring baseline (what to alert on)

## Out of Scope

- External error-tracking service integration (Sentry, Datadog, etc.) — Post-MVP
- Distributed tracing (Post-MVP)
- Custom Prometheus metrics (Post-MVP)
- OpenTelemetry instrumentation (Post-MVP)

## Dependencies

TASK-031

## Architecture Context

`DEPLOYMENT.md#7` — `/api/health` already exists as a liveness check; readiness is the complement.
`ARCHITECTURE.md#3.1 (shared/)` — request ID middleware belongs in `shared/middleware/`; the logger in `shared/logger/`.

## Requirements

- `GET /api/readiness`:
  - Executes `prisma.$queryRaw\`SELECT 1\`` inside a try/catch
  - Returns `200 { data: { status: "ready", db: "ok" } }` on success
  - Returns `503 { data: { status: "not_ready", db: "error", reason: "<message>" } }` on DB failure
  - Does **not** require authentication (must be accessible to infrastructure health checks)
- Request ID middleware:
  - Runs as the **first** middleware in `app.ts`
  - Generates `crypto.randomUUID()` (Node built-in, no dependency)
  - Stores in `AsyncLocalStorage` and also attaches to `req.requestId`
  - Sets `X-Request-Id` response header on every response
- Logger update:
  - `requestLogger` reads `requestId` from `AsyncLocalStorage`; includes it in every HTTP access log line
  - `logger.error` in the error handler includes `requestId`
- Error handler update:
  - `errorHandler` reads `req.requestId` and adds it to the error response body

## Implementation Notes

- `AsyncLocalStorage` is part of Node's `async_hooks` module (built-in since Node 12.17)
- Create `backend/src/shared/context/requestContext.ts` — exports `AsyncLocalStorage<{ requestId: string }>` instance and a `getRequestId()` helper
- Middleware `requestId.ts`: creates store with `{ requestId: uuid }`, runs `next()` inside `als.run(store, next)`
- Logger reads `getRequestId()` — returns the request ID from the current async context, or `undefined` outside a request context

## Files / Modules

`backend/src/shared/context/requestContext.ts` — new (AsyncLocalStorage instance + getRequestId helper)
`backend/src/shared/middleware/requestId.ts` — new
`backend/src/shared/logger/logger.ts` — read requestId from context in each log call
`backend/src/shared/errors/errorHandler.ts` — include `requestId` in error response body
`backend/src/app.ts` — add `/api/readiness` endpoint; add `requestId` middleware as first middleware
`plans/DEPLOYMENT.md` — document readiness endpoint and monitoring baseline

## Validation

- `GET /api/readiness` with a healthy DB returns `{ data: { status: "ready", db: "ok" } }`
- `GET /api/readiness` when DB is unreachable returns `503` with `{ data: { status: "not_ready" } }`
- Every HTTP response includes `X-Request-Id: <uuid>` header
- Two concurrent requests produce different request IDs in logs
- An error response (e.g., `404`) includes `requestId` in the body
- `GET /api/readiness` is accessible without authentication

## Acceptance Criteria

- Readiness endpoint is suitable for Docker health checks and Kubernetes probes
- Every request log line includes `requestId`, `method`, `path`, `statusCode`, `durationMs`
- Error responses include `requestId` for log correlation
- `plans/DEPLOYMENT.md` documents the readiness endpoint and monitoring baseline

## Definition of Done

- Implementation complete
- Integration test: readiness returns 200 with healthy DB; error response body includes `requestId`
- `plans/DEPLOYMENT.md` updated with readiness endpoint documentation and monitoring baseline
- Existing tests passing

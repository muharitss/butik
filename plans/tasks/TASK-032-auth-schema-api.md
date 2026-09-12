# TASK-032 — Authentication Schema and API

## Objective

Add secure credential-based authentication to the JahitFlow backend. Implements login, logout, session management via `HttpOnly` JWT cookie, the `GET /api/auth/me` current-user endpoint, and the `authenticate` middleware that populates `req.actorId` for all downstream handlers.

## Scope

- Add `passwordHash String?` field to the `User` model (migration required)
- Implement `POST /api/auth/login` — validate credentials, issue session cookie
- Implement `POST /api/auth/logout` — clear session cookie
- Implement `GET /api/auth/me` — return current authenticated user profile
- Implement `authenticate` middleware: validates the JWT cookie, sets `req.actorId` and `req.userRole`
- Apply `authenticate` globally to all existing `/api/*` routes (excluding `/api/health` and `POST /api/auth/login`)
- Replace the `req.headers["x-actor-id"]` stub pattern across all existing handlers with `req.actorId` from the middleware
- Seed script update: hash the initial operator password from `INITIAL_ADMIN_PASSWORD` env var
- Add `JWT_SECRET` and `INITIAL_ADMIN_PASSWORD` to documented env configuration
- Separate login rate limiter: max 10 attempts per 15 minutes per IP (distinct from the existing write limiter)

## Out of Scope

- Frontend login UI (TASK-033)
- Authorization / permission checking (TASK-034)
- User management CRUD (TASK-035)
- Multi-factor authentication
- OAuth / SSO
- Password reset via email

## Dependencies

TASK-031

## Architecture Context

`ARCHITECTURE.md#8` — auth is explicitly listed as Post-MVP with forward compatibility designed in.
`DECISIONS.md#D-002` — `users` table exists from Phase 0; adding auth is additive: add credential fields, add login endpoint, swap actor resolution. No existing FK changes.
`ARCHITECTURE.md#3.2` — actor resolution currently uses `x-actor-id` header as a stub; this task replaces that stub with verified middleware.

## Requirements

- Passwords **must** be stored as bcrypt hashes (cost factor ≥ 12). Never log, return, or serialize the `passwordHash` field.
- Session tokens: short-lived JWTs (configurable TTL, default 60 minutes) stored in `HttpOnly`, `Secure` (production), `SameSite=Strict` cookies. Do not use `localStorage`.
- `POST /api/auth/login`:
  - Request: `{ email: string, password: string }`
  - On success: `200`, set cookie, return `{ data: { id, name, role } }`
  - On failure (wrong email or wrong password): `401 UNAUTHORIZED` — same generic message in both cases (no user enumeration)
  - Inactive user (`isActive=false`): `401 UNAUTHORIZED` with the same generic message
- `POST /api/auth/logout`: clear cookie, return `200 { data: { loggedOut: true } }`
- `GET /api/auth/me`: return `{ id, name, role, isActive }` for the authenticated user; `401` if unauthenticated
- `authenticate` middleware: extract JWT from cookie, verify, set `req.actorId` and `req.userRole`; on failure: `401`
- Apply `authenticate` as a global middleware in `app.ts` before all route registrations, with explicit exclusions for `/api/health` and `POST /api/auth/login`
- Login endpoint must be rate-limited to 10 requests per 15 minutes per IP (separate limiter instance from the existing write limiter)

## Implementation Notes

- Create `backend/src/modules/auth/` with `auth.router.ts`, `auth.handlers.ts`, `auth.schemas.ts`, `auth.middleware.ts`
- JWT library: use `jose` (zero-dependency, ESM-native) or `jsonwebtoken` — choose one and apply consistently
- `User` model: add `email String? @unique` if not already present (currently `User` has `name` and `phone` only — email is the login identifier; decide whether to add `email` to `User` or use `name` as the login identifier and document the decision in `DECISIONS.md#D-015`)
- Replace the `x-actor-id` extraction block in every handler. After this task, `req.actorId` is the only valid actor source
- Integration test: unauthenticated request → 401; authenticated request → 200; inactive user → 401

## Files / Modules

`backend/prisma/schema.prisma` — add `passwordHash`, optionally `email` to `User`
`backend/prisma/migrations/` — new migration
`backend/src/modules/auth/auth.router.ts` — new
`backend/src/modules/auth/auth.handlers.ts` — new
`backend/src/modules/auth/auth.schemas.ts` — new
`backend/src/modules/auth/auth.middleware.ts` — new
`backend/src/modules/auth/index.ts` — new
`backend/src/app.ts` — mount auth router, apply authenticate globally
`backend/src/modules/customers/customers.handlers.ts` — remove x-actor-id fallback
`backend/src/modules/orders/orders.service.ts` — remove x-actor-id fallback
`backend/src/modules/payments/payments.handlers.ts` — remove x-actor-id fallback
`backend/src/modules/measurements/measurements.handlers.ts` — remove x-actor-id fallback
(all other handlers that currently read `x-actor-id`)
`backend/prisma/seed.ts` — hash and set initial operator password
`plans/api/API.md` — add Auth endpoint group
`plans/database/ERD.md` — update User entity with `password_hash`
`plans/DECISIONS.md` — add D-015 (auth strategy)

## Validation

- Unauthenticated `GET /api/customers` returns `401`
- Correct credentials return `200` and set an `HttpOnly` cookie
- Wrong password returns `401` with the same message as an unknown login identifier
- Inactive user returns `401`
- `GET /api/auth/me` with valid cookie returns `{ id, name, role, isActive }`; `passwordHash` is absent
- `POST /api/auth/logout` clears the session cookie
- After logout, `GET /api/auth/me` returns `401`
- Brute force: > 10 login attempts per 15 min per IP returns `429`
- `GET /api/health` remains accessible without authentication

## Acceptance Criteria

- All existing API routes require authentication (return `401` without a valid session cookie)
- Passwords are hashed with bcrypt (cost ≥ 12) and never appear in any API response or log line
- Session cookie is `HttpOnly`, `Secure` (in production), `SameSite=Strict`
- Authentication failures do not reveal whether a login identifier exists in the system
- Inactive users cannot authenticate
- `req.actorId` is reliably populated on all authenticated requests
- The `x-actor-id` header stub is removed from all handlers

## Definition of Done

- Implementation complete
- Migration created and applied to development database
- Unit test for bcrypt comparison logic
- Integration tests covering login / logout / me / protected-route / inactive-user scenarios
- `plans/api/API.md` updated with auth endpoints
- `plans/database/ERD.md` updated with `password_hash` field on User
- `plans/DECISIONS.md` updated with D-015
- All existing tests remain passing

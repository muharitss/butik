# TASK-046 — CI/CD Pipeline

## Objective

Implement a GitHub Actions CI pipeline that automatically runs type checking, linting, unit tests, integration tests, and a frontend build on every pull request and push to `main`. Ensures quality gates are enforced before merging.

## Scope

- `.github/workflows/ci.yml` with two parallel jobs:
  - **backend**: typecheck → lint → unit tests → integration + E2E tests (with PostgreSQL service container)
  - **frontend**: typecheck → build → frontend self-checks
- `node_modules` caching keyed by lockfile hash
- PR status checks block merges on any step failure

## Out of Scope

- Automated deployment (depends on hosting choice; Post-MVP)
- Docker image publishing to a registry (Post-MVP)
- Playwright browser E2E tests (Post-MVP — backend E2E already covers the critical path)
- Staging environment provisioning (Post-MVP)

## Dependencies

TASK-031 (full test suite must be passing before CI is set up)

## Architecture Context

`ARCHITECTURE.md#9 (Testing Architecture)` — unit, integration, and E2E tests are all defined; CI is the enforcement layer.
`DEPLOYMENT.md#7` — documents `npm test` as the verification command; CI mirrors this.

## Requirements

**Backend CI job steps (in order):**
1. `actions/checkout@v4`
2. `actions/setup-node@v4` with Node 22 LTS
3. `actions/cache@v4` — cache `backend/node_modules` on `backend/package-lock.json` hash
4. `npm ci` in `backend/`
5. `npx tsc --noEmit` (type check)
6. ESLint check (add minimal `eslint.config.js` if not present)
7. `npm run test -- --testPathPattern="unit"` (unit tests, no DB)
8. Start PostgreSQL 16 service container (`postgres:16-alpine`) with health check
9. `npx prisma migrate deploy` with `DATABASE_URL` from the service container
10. `npm test` (full test suite: unit + integration + E2E)

**Frontend CI job steps:**
1. `actions/checkout@v4`
2. `actions/setup-node@v4` with Node 22 LTS
3. Cache `frontend/node_modules`
4. `npm ci` in `frontend/`
5. `npx tsc --noEmit`
6. `npm run build` (Vite production build — fails on type errors)
7. `npm test` (frontend self-checks via `runChecks.ts`)

**PostgreSQL service container config:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: jahitflow_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

**Environment secrets required (GitHub repository secrets):**
- `DATABASE_URL` — set to `postgresql://test:test@localhost:5432/jahitflow_test?schema=public`
- `DIRECT_URL` — same value (Prisma requires both)
- `JWT_SECRET` — any test secret value (required once TASK-032 is done)

## Implementation Notes

- Use `working-directory:` on each step rather than `cd` in the command
- The backend unit test step runs without the DB service for speed; the full `npm test` then runs all tests against the real DB
- If ESLint is not configured in `backend/` or `frontend/`, add a minimal `eslint.config.js` that only enforces parsing (no strict rules). The goal is a working CI step, not a new linting philosophy.
- `NODE_ENV=test` must be set for the test run to use the test database URL

## Files / Modules

`.github/workflows/ci.yml` — new
`backend/eslint.config.js` — new (if not present)
`frontend/eslint.config.js` — new (if not present)

## Validation

- Introduce a deliberate unit test failure → CI backend job fails
- Introduce a TypeScript error → CI typecheck step fails
- Fix both → CI run goes green
- A passing push to `main` produces a green CI run that takes less than 5 minutes

## Acceptance Criteria

- CI pipeline runs on every push to `main` and every opened/updated pull request
- All three test categories (unit, integration/E2E, frontend) are covered in CI
- A failing test or type error blocks merge
- CI completes in under 5 minutes on a standard GitHub Actions runner for a warm cache

## Definition of Done

- `.github/workflows/ci.yml` committed and at least one green run confirmed on `main`
- A deliberate test failure validated to produce a red CI run
- No secrets committed to the workflow file

# TASK-002 — Configure Prisma and PostgreSQL

## Objective
Wire up Prisma ORM against a PostgreSQL database, establishing the migration workflow for all future schema tasks.

## Scope
- Add Prisma to the backend project.
- Configure `DATABASE_URL` via environment variables.
- Create an initial empty (or minimal `users` table only) Prisma schema and run the first migration.
- Create `infrastructure/prisma/client.ts` exporting a singleton Prisma client.

## Out of Scope
- Domain tables beyond `users` (each subsequent domain gets its own task).

## Dependencies
TASK-001.

## Architecture Context
`ARCHITECTURE.md` §5 (Database Architecture) — UUID PKs everywhere, Prisma Migrate as the only schema-change mechanism.

## Requirements
- `prisma/schema.prisma` configured for PostgreSQL, `previewFeatures` none required.
- `users` table created per `database/ERD.md` (`id`, `name`, `phone`, `role`, `is_active`, `created_at`), seeded with exactly one row representing the operator (seed script).
- Prisma Client generated and importable from `infrastructure/prisma/client.ts`.

## Implementation Notes
- Use `gen_random_uuid()` default (`@default(uuid())` in Prisma maps to this via `dbgenerated` if needed depending on Prisma version — confirm during implementation which mechanism the installed Prisma version supports and note in `DECISIONS.md` if it deviates from a pure `@default(uuid())`).
- Set up a `prisma/seed.ts` and wire it to `package.json`'s `prisma.seed` field.

## Files / Modules
`backend/prisma/schema.prisma`, `backend/prisma/migrations/*`, `backend/prisma/seed.ts`, `backend/src/infrastructure/prisma/client.ts`.

## Validation
`npx prisma migrate dev` succeeds; seed inserts one user row; a throwaway script can query it via the Prisma client.

## Acceptance Criteria
- Migration applies cleanly to a fresh database.
- Seeded user exists and is queryable.

## Definition of Done
- Migration + seed committed; documented `DATABASE_URL` setup in `.env.example`.

# TASK-001 — Initialize Backend Project Structure

## Objective
Set up the backend Node.js + Express + TypeScript project skeleton with the module folder structure defined in `ARCHITECTURE.md`.

## Scope
- Initialize `backend/` package with TypeScript, Express, ts-node-dev (or equivalent) for local dev, build script.
- Create the folder structure: `src/modules/`, `src/shared/`, `src/infrastructure/`, `src/app.ts`, `src/server.ts`.
- Set up a basic health-check route (`GET /api/health`).
- Configure environment variable loading (`.env` support), with `.env.example` documenting required variables (to be extended by later tasks: `DATABASE_URL`, `CLOUDINARY_*`).
- Set up linting/formatting config.

## Out of Scope
- Any business modules or database connectivity (Task 002).
- Frontend setup (Task 003).

## Dependencies
None — first task.

## Architecture Context
See `ARCHITECTURE.md` §3 (Backend Architecture) for the target folder shape and module philosophy (no forced controller/service/repository layering).

## Requirements
- TypeScript strict mode enabled.
- Express app exported separately from the process entrypoint (`app.ts` vs `server.ts`) to support integration testing later without binding a port.
- Response envelope helper stub in `shared/http/` per `API.md` conventions (`{ data }` / `{ error }`).
- Centralized error-handling middleware stub in `shared/errors/` (to be filled in fully by Task 004).

## Implementation Notes
- Do not add any Prisma or database code yet.
- Keep the health-check route trivial; its only purpose is confirming the server boots and the envelope helper works.

## Files / Modules
`backend/src/app.ts`, `backend/src/server.ts`, `backend/src/shared/http/*`, `backend/src/shared/errors/*`, `backend/.env.example`, `backend/package.json`, `backend/tsconfig.json`.

## Validation
`npm run dev` boots the server; `GET /api/health` returns `{ "data": { "status": "ok" } }`.

## Acceptance Criteria
- Server starts without errors.
- Folder structure matches `ARCHITECTURE.md` §3.1.
- Health-check endpoint responds correctly using the shared envelope.

## Definition of Done
- Code committed, builds cleanly, health check passes locally.

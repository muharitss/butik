# TASK-003 — Initialize Frontend Project Structure

## Objective
Set up the React + Vite + TypeScript frontend skeleton with the feature-oriented folder structure.

## Scope
- Scaffold `frontend/` with Vite's React-TS template.
- Create folder structure: `src/app/`, `src/features/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/types/`.
- Set up routing (e.g., React Router) with a placeholder shell layout and a placeholder home route.
- Set up a base API client in `lib/` pointing at the backend's `/api` base URL (via environment variable), including the shared response-envelope typing (`{ data }` / `{ error }`) matching `API.md`.

## Out of Scope
- Any feature UI (customers, orders, etc.) — later tasks.

## Dependencies
TASK-001 (backend health-check exists to smoke-test the connection, though not strictly blocking).

## Architecture Context
`ARCHITECTURE.md` §4 (Frontend Architecture).

## Requirements
- TypeScript strict mode.
- Base layout shell with navigation placeholders for the modules listed in `ARCHITECTURE.md` §4.1.
- `lib/apiClient.ts` exposing a typed `get/post/patch/delete` helper that unwraps the envelope and throws a typed error on `{ error }` responses.

## Implementation Notes
- No global state library (per `DECISIONS.md#D-012`).
- Confirm the frontend can call `GET /api/health` and render its result on the placeholder home route as a smoke test.

## Files / Modules
`frontend/src/app/*`, `frontend/src/lib/apiClient.ts`, `frontend/vite.config.ts`, `frontend/package.json`.

## Validation
`npm run dev` serves the app; home route displays the backend health-check result.

## Acceptance Criteria
- App boots, routes render, API client successfully calls the backend.

## Definition of Done
- Code committed; smoke test confirmed working against local backend.

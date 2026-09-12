# TASK-035 — User Management API and UI

## Objective

Allow the owner to manage user accounts: list users, create new staff accounts, activate/deactivate accounts, and change passwords. Enables multi-staff operation of the boutique.

## Scope

**Backend:**
- `GET /api/users` — list all users (owner only); returns `{ id, name, phone, role, isActive, createdAt }`
- `POST /api/users` — create user with hashed temporary password (owner only)
- `PATCH /api/users/:id` — update `name`, `phone`, `role` (owner only)
- `PATCH /api/users/:id/deactivate` — set `isActive=false` (owner only); blocked if target is the only active owner
- `PATCH /api/users/:id/activate` — set `isActive=true` (owner only)
- `PATCH /api/users/:id/password` — owner resets another user's password (owner only)
- `PATCH /api/auth/password` — authenticated user changes their own password (any role); requires `{ currentPassword, newPassword }`

**Frontend:**
- Settings section: `/settings/users` — user list with role badge, active/inactive status, actions
- Create user dialog (name, phone, role, temporary password)
- Deactivate / activate toggle
- Change password dialog: self-service (requires current password); owner-forced (new password only, for other users)

## Out of Scope

- Role granularity beyond `owner` / `staff` (Post-MVP)
- Password reset via email (Post-MVP)
- Session invalidation across devices on deactivation (active sessions expire at JWT TTL; no server-side token revocation in MVP)

## Dependencies

TASK-032, TASK-033, TASK-034

## Architecture Context

`DOMAIN.md#User` — minimal identity record; this task extends it with credential management.
`DECISIONS.md#D-002` — the `users` table was designed with future auth in mind; user management is the natural next step.
`ARCHITECTURE.md#3.2` — new `users` module with standard handler/router/schema structure; no service layer (simple CRUD).

## Requirements

- `POST /api/users`:
  - Request: `{ name: string, phone?: string, role: 'owner' | 'staff', temporaryPassword: string }`
  - `temporaryPassword` must be ≥ 8 characters (Zod validation)
  - Returns user profile without `passwordHash`
- `PATCH /api/users/:id/deactivate`: blocked if it would leave zero active owners; returns `409 BUSINESS_RULE_VIOLATION`
- `PATCH /api/auth/password`: verifies `currentPassword` against stored hash before updating; on mismatch returns `401`
- `PATCH /api/users/:id/password` (owner-forced reset): requires only `{ newPassword }`, no current password check
- All password operations use bcrypt (cost ≥ 12) via the same helper introduced in TASK-032
- `passwordHash` must never appear in any response body

## Implementation Notes

- Create `backend/src/modules/users/` — new module (handlers, router, schemas)
- `PATCH /api/auth/password` lives in the `auth` module (not `users`) since it operates on the requester's own record
- Frontend: add "Settings" nav item (owner only via `usePermission`); route `/settings` → `SettingsLayout` with a "Users" tab
- Owner cannot deactivate themselves

## Files / Modules

`backend/src/modules/users/users.router.ts` — new
`backend/src/modules/users/users.handlers.ts` — new
`backend/src/modules/users/users.schemas.ts` — new
`backend/src/modules/users/index.ts` — new
`backend/src/modules/auth/auth.handlers.ts` — add `changeOwnPassword` handler
`backend/src/modules/auth/auth.router.ts` — add `PATCH /auth/password`
`backend/src/app.ts` — mount `/api/users`
`frontend/src/features/admin/pages/UsersPage.tsx` — new
`frontend/src/features/admin/components/CreateUserDialog.tsx` — new
`frontend/src/features/admin/components/ChangePasswordDialog.tsx` — new
`frontend/src/features/admin/api/users.api.ts` — new
`frontend/src/app/router.tsx` — add `/settings/users` route
`frontend/src/app/AppShell.tsx` — add Settings nav item (owner only)
`plans/api/API.md` — add Users endpoint group

## Validation

- `staff` user requesting `GET /api/users` receives `403`
- `owner` can create a `staff` user; new user can log in with the temporary password
- Deactivated user receives `401` on the next login attempt
- Owner attempting to deactivate themselves receives `409`
- Password change with incorrect current password returns `401`
- Owner resetting another user's password does not require the current password
- `passwordHash` never appears in any API response

## Acceptance Criteria

- Owner can fully manage user accounts via the UI
- All password operations enforce bcrypt hashing
- Deactivated users cannot access any API endpoint
- User list never includes `passwordHash`

## Definition of Done

- Implementation complete
- Integration tests for each user management endpoint
- `plans/api/API.md` updated with Users endpoint group
- Existing tests passing

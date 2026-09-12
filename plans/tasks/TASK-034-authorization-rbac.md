# TASK-034 — Authorization and RBAC

## Objective

Implement role-based access control (RBAC). Define a permission map for the two existing roles (`owner`, `staff`), add a backend `authorize(permission)` middleware, apply it to sensitive endpoints, and add a frontend `usePermission` hook for conditional UI rendering.

## Scope

- Define the permission map in `backend/src/shared/auth/permissions.ts`
- `authorize(permission)` middleware factory: reads `req.userRole` (set by `authenticate`), returns `403` if the role lacks the permission
- Apply `authorize` to sensitive endpoints:
  - `DELETE /api/customers/:id` — `owner` only
  - `POST /api/garment-types`, `PATCH /api/garment-types/:id`, `PATCH /api/garment-types/:id/deactivate` — `owner` only
  - `GET /api/audit-logs` — `owner` only
  - All `/api/users` routes (TASK-035) — `owner` only
  - `PATCH /api/settings` (TASK-036) — `owner` only
  - `GET /api/reports/*` (TASK-038) — `owner` only
- Frontend `usePermission(permission: string): boolean` hook based on `currentUser.role` from `AuthContext`
- Conditionally hide/disable restricted UI elements (delete customer button, deactivate garment type, audit log nav item, settings nav item)

## Out of Scope

- Fine-grained per-order or per-customer ownership checks (Post-MVP)
- Custom role creation beyond `owner` and `staff` (Post-MVP)
- Full frontend route blocking by role — only action-level hiding is required; direct URL access returns 403 from the backend

## Dependencies

TASK-032, TASK-033

## Architecture Context

`ARCHITECTURE.md#3.2` — authorization logic belongs in middleware or `<module>.rules.ts`; no new abstraction layer.
`DECISIONS.md#D-002` — `users.role` field exists from Phase 0; RBAC is the natural extension.

## Requirements

- Permission map is a plain object: `Record<string, string[]>` mapping permission name to allowed roles
- `authorize(permission)` returns `403` with code `FORBIDDEN` for unauthorized roles; the error envelope follows the existing error format
- Owner-only permissions to define:
  - `customers:delete`
  - `garments:manage`
  - `audit:view`
  - `users:manage`
  - `settings:manage`
  - `reports:view`
  - `materials:manage` (for TASK-042)
- Staff permissions (all authenticated users): all read endpoints + create/update customers, create orders, record payments/fittings/revisions, upload attachments
- `usePermission` hook: `const canDelete = usePermission('customers:delete')` — returns true if `currentUser.role` is in the permission's allowed roles

## Implementation Notes

- `backend/src/shared/auth/permissions.ts` — pure object, no DB query, no runtime cost
- `authorize` middleware is composable: `router.delete('/:id', authenticate, authorize('customers:delete'), handler)`
- Frontend: `usePermission` reads `currentUser` from `useAuth()` — pure derivation, no API call
- Do not add a `usePermission` check on every route — only for action buttons and navigation items that should be hidden for `staff`
- Add `DECISIONS.md#D-016` documenting the RBAC strategy

## Files / Modules

`backend/src/shared/auth/permissions.ts` — new
`backend/src/shared/auth/authorize.ts` — new
`backend/src/modules/customers/customers.router.ts` — add `authorize('customers:delete')` to DELETE
`backend/src/modules/garments/garments.router.ts` — add `authorize('garments:manage')` to POST/PATCH
`backend/src/modules/audit/audit.router.ts` — add `authorize('audit:view')` to GET
`frontend/src/hooks/usePermission.ts` — new shared hook
`frontend/src/app/AppShell.tsx` — conditional nav items (Audit Log, Settings — owner only)
`frontend/src/features/customers/pages/CustomerDetailPage.tsx` — conditional delete button
`frontend/src/features/garments/` — conditional deactivate button
`plans/api/API.md` — add authorization requirements to each endpoint group
`plans/DECISIONS.md` — add D-016

## Validation

- `staff` authenticated user calling `DELETE /api/customers/:id` receives `403 FORBIDDEN`
- `owner` authenticated user calling the same returns the correct business response
- `staff` user does not see the delete button on `CustomerDetailPage`
- `owner` sees Audit Log in the navigation; `staff` does not
- `403` response body follows the standard error envelope: `{ error: { code: "FORBIDDEN", message: "..." } }`

## Acceptance Criteria

- All owner-only endpoints return `403` for `staff` requests
- Frontend permission checks are driven by the backend-provided role (no client-side override possible)
- Authorization failures return `403`, never `404` (no information leaking)
- `plans/api/API.md` documents the authorization requirement for each endpoint

## Definition of Done

- Implementation complete
- Integration tests for each defined permission boundary
- `plans/api/API.md` updated with authorization requirements
- `plans/DECISIONS.md` updated with D-016
- All existing tests remain passing

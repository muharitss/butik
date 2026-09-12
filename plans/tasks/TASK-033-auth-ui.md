# TASK-033 — Authentication UI

## Objective

Implement the frontend login flow: a login page, session state via React context, a `ProtectedRoute` wrapper, automatic redirect on session expiry, and a logout action in the app shell. After this task, all application pages require a valid session.

## Scope

- `LoginPage`: form with login identifier and password fields, inline error display
- `AuthContext`: React context providing `currentUser` (`{ id, name, role }`) and `logout()` globally
- `ProtectedRoute`: wrapper component that redirects unauthenticated users to `/login?redirect=<path>`
- All existing routes wrapped in `ProtectedRoute` in `router.tsx`
- `/login` as a public route (inaccessible when already authenticated → redirect to dashboard)
- `apiClient` 401 interceptor: any 401 from any API call triggers `logout()` and redirect to `/login`
- Logout button in `AppShell` header or sidebar footer
- Session initialisation: on app mount, call `GET /api/auth/me` to restore session from existing cookie

## Out of Scope

- Permission-based UI visibility (TASK-034)
- User management page (TASK-035)
- Password reset flow (Post-MVP)
- Remember-me / persistent sessions beyond the JWT TTL (Post-MVP)

## Dependencies

TASK-032

## Architecture Context

`ARCHITECTURE.md#4.2` — no global state library; session state is a narrow, justified exception. Use React context with `useState`.
`DECISIONS.md#D-012` — no Redux/Zustand introduced; `useContext` is the right tool here.
`ARCHITECTURE.md#4.1` — auth feature lives in `frontend/src/features/auth/`.

## Requirements

- Route `/login` renders `LoginPage` with login identifier and password fields
- On successful login: redirect to `redirect` query param, or `/` (dashboard)
- On failed login: display an inline error; do not clear the password field
- `ProtectedRoute`: reads `currentUser` from `AuthContext`; if null, redirects; if loading (session check in progress), shows a loading state
- `apiClient` must detect all `401` responses and call the context's `logout()` function
- Session state persists across page refresh (restored from cookie via `GET /api/auth/me` on mount)
- The `/login` route must redirect an already-authenticated user to `/`
- Logout clears `AuthContext` state, calls `POST /api/auth/logout`, then redirects to `/login`

## Implementation Notes

- `AuthContext`: `{ currentUser: User | null, loading: boolean, logout: () => void, setCurrentUser: (u: User) => void }`
- Wrap `<RouterProvider>` in `<AuthProvider>` inside `main.tsx`
- Session initialisation in `AuthProvider`'s `useEffect` — call `GET /api/auth/me`; on success, set `currentUser`; on `401`, leave `currentUser` as null
- `apiClient` interceptor: add a module-level `onUnauthorized` callback registered by `AuthProvider` to avoid circular imports
- `LoginPage` should be visually polished and match the existing design system (use the existing `Card`, `Input`, `Button` components)

## Files / Modules

`frontend/src/app/AuthContext.tsx` — new
`frontend/src/app/ProtectedRoute.tsx` — new
`frontend/src/features/auth/` — new feature directory
`frontend/src/features/auth/pages/LoginPage.tsx` — new
`frontend/src/features/auth/api/auth.api.ts` — new
`frontend/src/features/auth/types/auth.types.ts` — new
`frontend/src/app/router.tsx` — wrap existing routes in ProtectedRoute; add /login
`frontend/src/main.tsx` — wrap with AuthProvider
`frontend/src/lib/apiClient.ts` — add 401 interception callback
`frontend/src/app/AppShell.tsx` — add logout button, show current user name

## Validation

- Navigating to `/orders` when unauthenticated redirects to `/login?redirect=/orders`
- Successful login redirects back to `/orders`
- Failed login shows an error message without leaving the login page
- After logout, any protected route redirects to `/login`
- An API call that returns 401 (simulated expired session) triggers redirect to `/login`
- The `/login` page when already authenticated redirects to `/`
- Page refresh preserves the session (currentUser is restored from the cookie)

## Acceptance Criteria

- All existing pages require a valid session
- Login page uses the existing design system components and looks polished
- Session expiry is gracefully handled with a redirect to login
- No credentials or tokens are stored in `localStorage`
- Current user's name is visible in the app shell

## Definition of Done

- Implementation complete
- Manual end-to-end login flow verified
- Frontend self-check (`runChecks.ts`) updated to include auth flow check
- All existing frontend feature self-checks remain passing

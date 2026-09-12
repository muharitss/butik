# TASK-044 — In-App Notifications

## Objective

Implement a lightweight notification system that surfaces actionable alerts per user: overdue orders, upcoming deadlines, scheduled fittings, and low material stock. Notifications are generated lazily on request and stored per user. A notification bell in the app shell shows the unread count.

## Scope

**Backend:**
- New `Notification` model (migration required)
- `GET /api/notifications` — return notifications for the current user; refresh (upsert) notifications before returning
- `PATCH /api/notifications/:id/read` — mark one notification as read
- `PATCH /api/notifications/read-all` — mark all of the current user's notifications as read
- Notification types generated on refresh:
  - `ORDER_OVERDUE`: orders past `deadlineAt` with status not in `READY`, `COMPLETED`, `CANCELLED`
  - `ORDER_DUE_SOON`: orders with `deadlineAt` within the next 3 days, same status exclusions
  - `FITTING_UPCOMING`: fittings with `scheduledAt` within the next 2 days and status `SCHEDULED`
  - `MATERIAL_LOW_STOCK`: active materials where `currentStock <= lowStockThreshold` (only if TASK-042 is implemented)

**Frontend:**
- Notification bell icon in `AppShell` header with unread count badge
- Dropdown panel listing recent unread notifications (newest 10)
- Each notification shows: icon, message, relative time
- Clicking a notification marks it as read and navigates to the related entity
- "Mark all as read" action

## Out of Scope

- Browser Web Push notifications (Post-MVP)
- Email notifications (Post-MVP)
- A dedicated background worker process (lazy on-request generation is sufficient for MVP)
- Per-user notification preferences (Post-MVP)

## Dependencies

TASK-032, TASK-035 (users needed for per-user scoping). TASK-042 is optional — skip `MATERIAL_LOW_STOCK` type if TASK-042 is not yet done.

## Architecture Context

`DECISIONS.md#D-001` — monolith; no separate notification service. Notifications are generated lazily inside the `GET /api/notifications` handler.
`ponytail:` Lazy upsert-on-request pattern avoids a background job. Ceiling: if notification refresh adds > 200ms to response time at scale, add a scheduled job. Upgrade path: extract `refreshNotifications` into a cron-triggered endpoint.

## Database Changes

New model `Notification`:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `userId` | `String @db.Uuid` (FK → User, Cascade) | Recipient |
| `type` | `String` | ORDER_OVERDUE, ORDER_DUE_SOON, FITTING_UPCOMING, MATERIAL_LOW_STOCK |
| `entityType` | `String` | order, fitting, material |
| `entityId` | `String` | UUID of the related entity |
| `message` | `String` | Pre-formatted human-readable message |
| `isRead` | `Boolean @default(false)` | |
| `createdAt` | `DateTime @default(now())` | |

Unique constraint: `@@unique([userId, type, entityId])` — prevents duplicate notifications for the same event.
Index: `@@index([userId, isRead])`.
Migration required.

## Requirements

- Notifications are scoped to the requesting user (`req.actorId`)
- `owner` receives all notification types; `staff` receives only `ORDER_DUE_SOON`, `FITTING_UPCOMING`, and (if TASK-041 is done) `ORDER_OVERDUE` for orders assigned to them
- Upsert strategy: on `GET /api/notifications`, run `refreshNotifications(userId, role)` which upserts current alerts and deletes notifications for entities that no longer qualify (e.g., overdue order now completed)
- Response includes `meta.unreadCount: number`
- `PATCH /api/notifications/read-all` must be defined before `PATCH /api/notifications/:id/read` in the router to avoid route conflicts

## Implementation Notes

- `backend/src/modules/notifications/notifications.service.ts` — `refreshNotifications` function:
  1. Query orders/fittings/materials that qualify for each type
  2. `prisma.notification.upsert` for each qualifying entity (create or update `message`; do not reset `isRead` on re-upsert)
  3. Delete notifications for entities that no longer qualify (e.g., order is now COMPLETED)
- `MATERIAL_LOW_STOCK` notification generation: guard with `try/catch` or a feature flag so missing the `Material` model (if TASK-042 not done) does not break the whole refresh
- Frontend bell: fetched on app mount and after any navigation to keep count fresh (lightweight `GET` with no body)
- `DECISIONS.md#D-017` — document the lazy notification generation strategy

## Files / Modules

`backend/prisma/schema.prisma` — add Notification model
`backend/prisma/migrations/` — new migration
`backend/src/modules/notifications/notifications.router.ts` — new
`backend/src/modules/notifications/notifications.handlers.ts` — new
`backend/src/modules/notifications/notifications.service.ts` — new
`backend/src/modules/notifications/notifications.schemas.ts` — new
`backend/src/modules/notifications/index.ts` — new
`backend/src/app.ts` — mount `/api/notifications`
`frontend/src/features/notifications/components/NotificationBell.tsx` — new
`frontend/src/features/notifications/components/NotificationPanel.tsx` — new
`frontend/src/features/notifications/api/notifications.api.ts` — new
`frontend/src/features/notifications/types/notifications.types.ts` — new
`frontend/src/features/notifications/index.ts` — new
`frontend/src/app/AppShell.tsx` — add NotificationBell to header
`plans/api/API.md` — add Notifications endpoint group
`plans/database/ERD.md` — add Notification entity
`plans/DECISIONS.md` — add D-017

## Validation

- An order past its `deadlineAt` with status `IN_PROGRESS` appears as `ORDER_OVERDUE` in the notification list
- After the order is moved to `COMPLETED`, the `ORDER_OVERDUE` notification is removed on the next refresh
- Marking a notification as read removes it from the unread count
- No duplicate notifications for the same order + type combination after multiple fetches
- `staff` user does not receive `MATERIAL_LOW_STOCK` notifications

## Acceptance Criteria

- Notification bell shows accurate unread count
- Clicking a notification navigates to the relevant entity and marks the notification as read
- Notifications reflect current system state on each page load
- No duplicate notifications for the same event

## Definition of Done

- Implementation complete
- Migration created and applied
- Integration tests: notification generation, deduplication (upsert), cleanup on state change, mark-read
- `plans/api/API.md`, `plans/database/ERD.md`, and `plans/DECISIONS.md` updated
- Existing tests passing

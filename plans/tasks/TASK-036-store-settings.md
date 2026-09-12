# TASK-036 — Store / Boutique Settings API and UI

## Objective

Move boutique configuration (name, tagline, address, phone, email, receipt footer) from hardcoded environment variables to a database-backed `StoreSettings` table. Provide an owner-accessible UI to update these values without requiring a server restart or redeployment.

## Scope

**Backend:**
- New `StoreSettings` Prisma model (single-row table, sentinel PK `id = 'default'`)
- `GET /api/settings` — return current store settings (any authenticated user; needed for receipt rendering)
- `PATCH /api/settings` — update settings fields (owner only)
- Update `receipts.service.ts` to fetch boutique info from the DB instead of `process.env`
- Update `whatsapp.service.ts` same
- Seed: upsert the `store_settings` default row from current env-var defaults on first deploy

**Frontend:**
- `/settings` route → `SettingsPage` — a store info form pre-populated with current values
- Save with inline success/error feedback

## Out of Scope

- Logo upload (requires Cloudinary integration for settings; deferred)
- Order number prefix customisation (the `JF-` format is a deliberate `BUSINESS-RULES.md` commitment)
- Per-order or per-garment configuration
- Multi-branch settings (Post-MVP)

## Dependencies

TASK-032, TASK-034

## Architecture Context

`DECISIONS.md#D-002` — env vars are the current source; moving to DB is additive and backward-compatible.
`ARCHITECTURE.md#3.2` — simple CRUD with no cross-module orchestration; no service layer needed.
`ARCHITECTURE.md#3.3` — `receipts` and `whatsapp` modules read settings from the new `settings` module's exported getter, not from their own Prisma calls.

## Database Changes

New model `StoreSettings`:

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default("default")` | Singleton sentinel |
| `name` | `String` | Boutique/store name |
| `tagline` | `String?` | Tagline for receipts |
| `address` | `String?` | Physical address |
| `phone` | `String?` | Display phone number |
| `whatsappPhone` | `String?` | Phone for WhatsApp links (if different from `phone`) |
| `email` | `String?` | Contact email |
| `receiptFooter` | `String?` | Footer text on printed receipts |
| `updatedAt` | `DateTime @updatedAt` | |

Migration required. `@@map("store_settings")`.

## Requirements

- `GET /api/settings`: returns the current row; if the row does not exist (first deploy before seed), returns hardcoded env-var defaults as a fallback (graceful degradation)
- `PATCH /api/settings`: partial update accepted; validates `name` is not empty when provided
- `receipts.service.ts` and `whatsapp.service.ts`: call a shared `getStoreSettings()` exported from the settings module; fallback to env vars only if the DB row is absent
- Audit log entry for settings update (before/after)
- Seed script: `prisma.storeSettings.upsert` with env-var defaults as the initial values

## Implementation Notes

- `backend/src/modules/settings/` — single small module (router, handler, schema, index)
- Export `getStoreSettings(): Promise<StoreSettings>` for use by `receipts` and `whatsapp` modules
- The frontend settings form uses the existing `Card`, `Input`, `Textarea`, `Button` components

## Files / Modules

`backend/prisma/schema.prisma` — add `StoreSettings` model
`backend/prisma/migrations/` — new migration
`backend/src/modules/settings/settings.router.ts` — new
`backend/src/modules/settings/settings.handlers.ts` — new
`backend/src/modules/settings/settings.schemas.ts` — new
`backend/src/modules/settings/index.ts` — export `getStoreSettings`
`backend/src/app.ts` — mount `/api/settings`
`backend/src/modules/receipts/receipts.service.ts` — call `getStoreSettings()`
`backend/src/modules/whatsapp/whatsapp.service.ts` — call `getStoreSettings()`
`backend/prisma/seed.ts` — upsert default settings row
`frontend/src/features/settings/pages/SettingsPage.tsx` — new
`frontend/src/features/settings/api/settings.api.ts` — new
`frontend/src/app/router.tsx` — add `/settings` route
`frontend/src/app/AppShell.tsx` — add Settings nav link (owner only)
`plans/api/API.md` — add Settings endpoint group
`plans/database/ERD.md` — add StoreSettings entity

## Validation

- After `PATCH /api/settings { name: "Butik Sari" }`, the next receipt for any order reflects "Butik Sari" as the boutique name
- After updating `whatsappPhone`, WhatsApp links use the updated number
- `PATCH /api/settings { name: "" }` returns `400 VALIDATION_ERROR`
- `staff` user calling `PATCH /api/settings` receives `403`
- Settings form in the UI pre-populates with the current DB values

## Acceptance Criteria

- Boutique info on receipts and WhatsApp messages comes from the database
- Settings change is immediately reflected on the next receipt generation (no restart required)
- Owner can update all settings fields via the UI

## Definition of Done

- Implementation complete
- Migration created and applied to development database
- Integration test: update `name` via API → verify receipt DTO reflects the new name
- `plans/api/API.md` and `plans/database/ERD.md` updated
- Existing tests passing

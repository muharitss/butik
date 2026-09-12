# TASK-042 — Inventory / Materials Schema and API

## Objective

Introduce a basic materials inventory: define the `Material` and `MaterialMovement` models, implement CRUD and movement-recording endpoints, and surface low-stock material count in the dashboard summary. Backend-only in this task.

## Scope

- New `Material` model and `MaterialMovement` model (migration required)
- `GET /api/materials` — list materials with computed `currentStock` and low-stock flag
- `GET /api/materials/:id` — detail with movement history (paginated)
- `POST /api/materials` — create material (owner only)
- `PATCH /api/materials/:id` — update name, category, unit, `lowStockThreshold`, `isActive` (owner only)
- `POST /api/materials/:id/movements` — record a movement (any authenticated user)
- Extend `GET /api/dashboard/summary` to include `lowStockMaterials: number`

## Out of Scope

- Linking materials to specific orders (Post-MVP)
- Supplier management (Post-MVP)
- Purchase orders (Post-MVP)
- Material usage configuration per garment type (Post-MVP)
- Inventory UI (TASK-043)

## Dependencies

TASK-032, TASK-034

## Architecture Context

`ARCHITECTURE.md#3.2` — new `materials` module with standard structure; no service layer (simple CRUD + aggregate query).
`ARCHITECTURE.md#3.3` — `dashboard` module may read the `materials` Prisma model directly for the low-stock count (no cross-module business rule duplication).
`ROADMAP.md` — inventory is Post-MVP; this task introduces the minimum foundation without over-engineering.

## Database Changes

New model `Material`:

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | |
| `name` | `String @unique` | |
| `category` | `String` | FABRIC, THREAD, BUTTON, ZIPPER, LINING, ACCESSORY, OTHER |
| `unit` | `String` | meter, pcs, roll, kg |
| `lowStockThreshold` | `Decimal @db.Decimal(10,2)` | Alert when currentStock ≤ this value |
| `isActive` | `Boolean @default(true)` | |
| `createdAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |
| `movements` | `MaterialMovement[]` | |

New model `MaterialMovement`:

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | |
| `materialId` | `String @db.Uuid` (FK → Material) | |
| `type` | `String` | RECEIVED, USED, ADJUSTED |
| `quantity` | `Decimal @db.Decimal(10,2)` | Positive for RECEIVED; negative for USED/ADJUSTED |
| `note` | `String?` | |
| `recordedBy` | `String? @db.Uuid` (FK → User, SetNull) | |
| `recordedAt` | `DateTime @default(now())` | |

Both tables `@@map(...)` to snake_case. Migration required.

## Requirements

- `currentStock` = `SUM(movements.quantity)` — computed on read, not stored
- Low-stock condition: `currentStock <= lowStockThreshold`
- `POST /api/materials/:id/movements`:
  - `type=USED` movements that would push stock below zero are allowed with a soft warning in the response (`meta.warning: "Stock is now negative"`) — small shops record usage after the fact
  - Quantity must be non-zero
- Audit log entry for: material created, material deactivated, and any `ADJUSTED` type movement
- `GET /api/dashboard/summary` extended: `lowStockMaterials` = count of active materials where `currentStock <= lowStockThreshold`

## Implementation Notes

- `ponytail:` `currentStock` is a `SUM` aggregate query per material detail fetch — acceptable for boutique movement volumes (< 10,000 rows per material). Upgrade: add `currentStockCache Decimal` column if latency becomes measurable.
- Material list (`GET /api/materials`) includes `currentStock` via a `_sum` aggregate joined to each material — use a raw query or `Promise.all` per item if Prisma doesn't support inline aggregates on list queries cleanly

## Files / Modules

`backend/prisma/schema.prisma` — add Material, MaterialMovement models
`backend/prisma/migrations/` — new migration
`backend/src/modules/materials/materials.router.ts` — new
`backend/src/modules/materials/materials.handlers.ts` — new
`backend/src/modules/materials/materials.schemas.ts` — new
`backend/src/modules/materials/index.ts` — new
`backend/src/app.ts` — mount `/api/materials`
`backend/src/modules/dashboard/dashboard.handlers.ts` — add `lowStockMaterials` to summary query
`plans/api/API.md` — add Materials endpoint group
`plans/database/ERD.md` — add Material, MaterialMovement entities

## Validation

- Creating a material with `lowStockThreshold=5` and recording a `USED` movement of -6 units shows `currentStock=-1` and low-stock flag
- `GET /api/dashboard/summary` includes correct `lowStockMaterials` count
- `staff` can record movements; only `owner` can create or deactivate materials
- Material with no movements has `currentStock=0`
- `type=ADJUSTED` movement appears in the audit log

## Acceptance Criteria

- Material CRUD works correctly
- Stock level is accurately computed from movement history
- Low-stock condition is surfaced in both the material list and dashboard summary
- Owner-only creation and deactivation enforced

## Definition of Done

- Implementation complete
- Migration created and applied
- Integration tests: stock calculation, low-stock detection, owner-only creation
- `plans/api/API.md` and `plans/database/ERD.md` updated
- Existing tests passing

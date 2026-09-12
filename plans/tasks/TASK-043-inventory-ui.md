# TASK-043 — Inventory UI

## Objective

Implement the frontend materials inventory: list materials with stock levels and low-stock badges, record movements, create and deactivate materials, and surface a low-stock warning on the dashboard. Consumes the APIs from TASK-042.

## Scope

- `/inventory` route — materials list with current stock, category, unit, low-stock badge
- Create material dialog (owner only): name, category, unit, low-stock threshold
- Record movement dialog: type (RECEIVED/USED/ADJUSTED), quantity, optional note
- Material detail page (or expandable row): movement history with pagination
- Low-stock warning card on the existing `DashboardPage` (uses `lowStockMaterials` from summary API)
- Inventory nav item in `AppShell`

## Out of Scope

- Linking materials to orders (Post-MVP)
- Supplier management UI (Post-MVP)
- Barcode scanning (Post-MVP)

## Dependencies

TASK-042

## Architecture Context

`ARCHITECTURE.md#4.1` — new `features/inventory/` directory following established feature structure.
`ARCHITECTURE.md#4.3` — mobile-first for movement recording (done on phone in the shop); inventory list can be desktop-optimised.

## Requirements

- Materials list shows: name, category, unit, current stock, threshold, status badge (LOW STOCK in red when `currentStock <= lowStockThreshold`, ACTIVE otherwise)
- Record movement dialog validates: quantity ≠ 0, type selected
- Owner sees "Create Material" and "Deactivate" buttons; staff sees only the list and the record movement action
- Dashboard warning card: shown only when `lowStockMaterials > 0`; links to `/inventory`
- Material detail page or expandable section shows movement history (type, quantity, note, recorded by, date)
- Inactive materials are hidden from the default list; a toggle shows them

## Implementation Notes

- Follow the existing feature pattern: `features/inventory/pages/`, `api/`, `components/`, `types/`, `index.ts`
- Low-stock badge: reuse the existing `Badge` component with a `variant` or `className` for red
- The dashboard warning card is a new card in the existing `DashboardPage` component; reads `lowStockMaterials` from the already-fetched summary data (no additional API call)

## Files / Modules

`frontend/src/features/inventory/pages/InventoryPage.tsx` — new
`frontend/src/features/inventory/pages/MaterialDetailPage.tsx` — new (or modal/expandable row)
`frontend/src/features/inventory/api/materials.api.ts` — new
`frontend/src/features/inventory/components/MaterialsTable.tsx` — new
`frontend/src/features/inventory/components/CreateMaterialDialog.tsx` — new
`frontend/src/features/inventory/components/RecordMovementDialog.tsx` — new
`frontend/src/features/inventory/types/materials.types.ts` — new
`frontend/src/features/inventory/index.ts` — new
`frontend/src/features/dashboard/pages/DashboardPage.tsx` — add low-stock warning card
`frontend/src/app/router.tsx` — add `/inventory` and `/inventory/:id` routes
`frontend/src/app/AppShell.tsx` — add Inventory nav item

## Validation

- Low-stock material shows red badge in the list
- Recording a RECEIVED movement increases the displayed current stock
- Owner sees Create Material and Deactivate; staff does not
- Dashboard shows low-stock warning card with count and link when any materials are low
- Inactive materials are hidden by default; toggling "Show inactive" reveals them

## Acceptance Criteria

- Materials list is usable as a daily stock check tool
- Movement recording form is simple and mobile-friendly
- Low-stock warning is prominent on the dashboard
- All permission controls match TASK-042's backend enforcement

## Definition of Done

- Implementation complete
- Manual verification: create material → record movement → verify stock update in list
- Frontend self-check added for inventory feature
- Existing frontend self-checks remain passing

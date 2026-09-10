# JahitFlow — API Design

## Conventions

- Base path: `/api`
- JSON request/response bodies.
- Response envelope:
  ```json
  { "data": { ... }, "meta": { ... } }
  ```
  or on error:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [ ... ] } }
  ```
- Pagination (list endpoints): query params `page` (default 1), `pageSize` (default 20, max 100); response `meta: { page, pageSize, total }`.
- Filtering/search: query params specific to each resource, documented per endpoint group below.
- Authorization: none enforced in MVP (see `DECISIONS.md#D-002`); all endpoints are open. Endpoints are still written to accept an implicit "system actor" for audit purposes, so adding real auth later only changes how the actor is resolved, not the endpoint signatures.
- All mutating endpoints wrap their multi-table writes in a transaction (see `ARCHITECTURE.md#3.4`).

## Error Behavior

| Situation | HTTP Status | Error code |
|---|---|---|
| Request body fails schema validation | 400 | `VALIDATION_ERROR` |
| Business-rule violation (e.g., illegal status transition, overpayment) | 409 | `BUSINESS_RULE_VIOLATION` |
| Referenced entity not found | 404 | `NOT_FOUND` |
| Referenced entity exists but is soft-deleted/inactive where an active one is required | 409 | `CONFLICT` |
| Unexpected server error | 500 | `INTERNAL_ERROR` |

Validation is always enforced server-side regardless of what the frontend already checked (`BUSINESS-RULES.md`, `ARCHITECTURE.md#validation` intent).

## Endpoint Groups

### Customers (`/api/customers`)
- `GET /api/customers` — list/search. Query: `q` (matches name/phone), `page`, `pageSize`.
- `GET /api/customers/:id` — detail, including order history summary.
- `POST /api/customers` — create.
- `PATCH /api/customers/:id` — update contact info/notes.
- `DELETE /api/customers/:id` — soft delete (blocked if active orders exist, per `BUSINESS-RULES.md`).

### Garment Types (`/api/garment-types`)
- `GET /api/garment-types` — list (query `includeInactive=true` to include inactive).
- `POST /api/garment-types` — create, with nested `measurementFields[]`.
- `PATCH /api/garment-types/:id` — update fields, including replacing `measurementFields[]`.
- `PATCH /api/garment-types/:id/deactivate` — set `is_active=false` (soft-delete equivalent; used instead of DELETE since garment types are referenced by historical order items).

### Measurements (`/api/customers/:customerId/measurements`)
- `GET /api/customers/:customerId/measurements` — version history, newest first.
- `GET /api/customers/:customerId/measurements/current` — latest version + values.
- `POST /api/customers/:customerId/measurements` — create a new version (body: `measuredAt`, `label?`, `notes?`, `values: [{fieldKey, value, unit}]`).

### Orders (`/api/orders`)
- `GET /api/orders` — list/search. Query: `q` (order number, customer name/phone), `status`, `dueBefore`, `dueAfter`, `page`, `pageSize`.
- `GET /api/orders/:id` — full detail (items, snapshot, payments summary, fittings, revisions, attachments, status history).
- `POST /api/orders` — create (body: `customerId`, `deadlineAt`, `requiresFitting?`, `items: [{garmentTypeId, quantity, unitPrice, notes?}]`, `additionalCost?`, `expressFee?`, `discount?`, `notes?`). Server computes snapshot, subtotal/total, order number, initial `DRAFT` status + history row.
- `PATCH /api/orders/:id` — update mutable fields (`deadlineAt`, `notes`, pricing adjustments) — **only** while status is `DRAFT` or `CONFIRMED`; later statuses restrict to specific sub-resources (payments, fittings, etc.) rather than free-form edits.
- `PATCH /api/orders/:id/items` — replace item list (same status restriction as above); recomputes subtotal/total.
- `POST /api/orders/:id/transition` — body `{ toStatus, reason? }`; runs the governed transition (see `STATE-MACHINES.md`), returns updated order + new history row, or `409 BUSINESS_RULE_VIOLATION` if illegal.
- `POST /api/orders/:id/resnapshot` — re-copy the customer's current measurement version into a new snapshot (see `BUSINESS-RULES.md#measurement`); audit-logged.

### Payments (`/api/orders/:orderId/payments`)
- `GET /api/orders/:orderId/payments` — list, newest first.
- `POST /api/orders/:orderId/payments` — record a payment (body: `type`, `amount`, `method?`, `note?`, `reversedPaymentId?` for adjustments). Server enforces overpayment rule, recomputes `paid_total_cache`/`payment_status_cache`.

### Fittings (`/api/orders/:orderId/fittings`)
- `GET /api/orders/:orderId/fittings` — list.
- `POST /api/orders/:orderId/fittings` — schedule (`scheduledAt`, `notes?`).
- `PATCH /api/orders/:orderId/fittings/:id` — record result (`status=DONE`, `result`, `occurredAt`, `notes?`, `nextAction?`) or cancel (`status=CANCELLED`).

### Revisions (`/api/orders/:orderId/revisions`)
- `GET /api/orders/:orderId/revisions` — list.
- `POST /api/orders/:orderId/revisions` — create (`fittingId?`, `issue`, `requestedChange?`, `notes?`).
- `PATCH /api/orders/:orderId/revisions/:id` — update status (`IN_PROGRESS`/`RESOLVED`/`CANCELLED`), notes, `resolvedAt`.

### Attachments (`/api/orders/:orderId/attachments`)
- `GET /api/orders/:orderId/attachments` — list (excludes soft-deleted).
- `POST /api/orders/:orderId/attachments/upload-signature` — returns a signed Cloudinary upload payload (timestamp, signature, api key, folder) for direct client upload.
- `POST /api/orders/:orderId/attachments` — register metadata after a successful direct upload (body: `type`, `cloudinaryPublicId`, `secureUrl`, `format?`, `width?`, `height?`).
- `DELETE /api/orders/:orderId/attachments/:id` — soft delete + best-effort Cloudinary delete.

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/summary` — aggregates: active order count, due-soon count (configurable window, default 7 days), overdue count, ready-for-pickup count, upcoming fittings (next N days), unpaid/partial order count and total outstanding balance, recent orders (last N).

### Calendar (`/api/calendar`)
- `GET /api/calendar/events` — query `from`, `to` (date range); returns deadline events and fitting events within range, each tagged with type and a link to the underlying order/fitting.

### Receipts (`/api/orders/:orderId/receipt`)
- `GET /api/orders/:orderId/receipt` — returns a receipt-ready DTO (boutique info, order number, customer, items, totals, payments summary, remaining balance, date) for the frontend to render as a printable view. No PDF generation endpoint in MVP (frontend print-to-PDF via browser print is sufficient — see `DECISIONS.md` note under Post-MVP if this changes).

### WhatsApp (`/api/orders/:orderId/whatsapp-link`)
- `GET /api/orders/:orderId/whatsapp-link?template=confirmation|ready|payment_reminder` — returns `{ url: "https://wa.me/..." }` built from the customer's phone and a filled-in message template. Purely a formatting endpoint; no external call is made.

### Audit (`/api/audit-logs`)
- `GET /api/audit-logs` — query `entityType`, `entityId`, `from`, `to`, `page`, `pageSize` — for operator/investigative review. Read-only.

## Transaction Boundaries Summary

| Endpoint | Transaction covers |
|---|---|
| `POST /orders` | order + items + snapshot + snapshot values + status history + order_number_counter increment |
| `POST /orders/:id/transition` | order.status update + status history insert (+ balance check read) |
| `POST /orders/:orderId/payments` | payment insert + order paid_total_cache/payment_status_cache update |
| `PATCH /orders/:id/items` | item replace + order subtotal/total recompute |
| `POST /orders/:orderId/attachments` | attachment metadata insert (no other table involved, but still wrapped for consistency with audit-log write) |

Every mutating endpoint additionally issues its `recordAudit(...)` call inside the same transaction as its primary write, so an audit failure rolls back the business write rather than leaving them inconsistent.

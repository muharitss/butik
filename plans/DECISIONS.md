# JahitFlow — Decisions Log

Each entry: **Decision**, **Context**, **Alternatives Considered**, **Consequences**.

---

## D-001: Modular Monolith
**Decision:** Single backend deployable organized into domain modules; single database.
**Context:** One business, one operator, small order volume; no current need for independent scaling or deployment of parts of the system.
**Alternatives considered:** Microservices, serverless functions per module.
**Consequences:** Simpler operations, one deploy pipeline, one database to back up. Revisiting this later (e.g., multi-business SaaS) will require re-architecture, which is acceptable since it's explicitly Post-MVP.

## D-002: No Authentication in MVP, but `users` Table Exists
**Decision:** No login/auth flow is built for MVP. A `users` table exists from the start with a single seeded row representing the operator, referenced by `audit_logs.actor_id` and any future "created_by"/"recorded_by" fields.
**Context:** Single operator; requiring login adds friction with no access-control benefit yet, but audit trails and future multi-staff support are known future needs.
**Alternatives considered:** No `users` table at all (use nullable actor everywhere); full auth from day one.
**Consequences:** Adding real authentication later (password/session, or SSO) is additive: add credential fields, add a login endpoint, and swap the seeded/default actor resolution for a resolved session actor. No existing foreign keys change.

## D-003: Measurement Snapshot via Copy, Not Just Version Reference
**Decision:** When an order is created, the system copies the customer's current measurement values into an immutable `order_measurement_snapshot` (with its own `order_measurement_snapshot_values`), while also recording which `measurement_version` it was copied from.
**Context:** Requirement: correcting/updating a customer's measurement must never silently change a historical order's measurement. A pure reference to `measurement_version_id` would satisfy this *only if* measurement versions themselves are strictly immutable and corrections always create a new version. Copying is a stronger, more explicit guarantee.
**Alternatives considered:**
  - (a) Reference-only (`order.measurement_version_id`), relying entirely on version immutability.
  - (b) Copy-only, with no reference back to the version.
  - (c) Hybrid (chosen): copy the values (source of truth for the order) **and** keep the reference (traceability/audit, "which version was this based on").
**Consequences:** Slightly more storage and one extra write per order, but the order's measurement data is fully self-contained and immune to any future change in how `measurement_versions` are stored, corrected, or even deleted. This is the safer choice for a domain with real tailoring consequences (wrong garment size).

## D-004: Payments Are Append-Only
**Decision:** Payment records are never edited or hard-deleted. Corrections happen via a new `ADJUSTMENT`/reversal payment row referencing the original (`reversed_payment_id`), which may be negative in amount or explicitly typed as a reversal.
**Context:** Financial history integrity is a stated requirement; "corrections should preserve an audit trail."
**Alternatives considered:** Allow editing amount/date on a payment row directly.
**Consequences:** Order balance is always computed as a sum over the full payment history, not read from a mutable running total column (though a denormalized `paid_total` cache column on `orders` is maintained for query performance, recomputed inside the same transaction as any payment write — see `ERD.md`).

## D-005: Order Status Is a Governed State Machine
**Decision:** Order status transitions are validated server-side against an explicit transition table (see `STATE-MACHINES.md`), not accepted as an arbitrary string update.
**Context:** Requirement explicitly calls this out; status has real workflow and completion implications (e.g., completion requires zero balance).
**Consequences:** All status changes go through one code path (`orders` module's transition function), which also writes `order_status_histories` and can enforce cross-cutting rules (e.g., blocking COMPLETED while balance > 0).

## D-006: Cloudinary for Attachments, Direct-Upload Flow
**Decision:** Files are uploaded to Cloudinary; Postgres stores only metadata (`cloudinary_public_id`, `secure_url`, dimensions/format if available, owner entity, uploader, timestamp). The upload itself may use a Cloudinary signed-upload flow initiated by the backend (backend issues a signature, frontend uploads directly to Cloudinary, then frontend registers the resulting metadata with the backend) to avoid routing binary data through the Node process.
**Alternatives considered:** Proxying uploads through the backend entirely; building custom file storage.
**Consequences:** Backend must expose a "get upload signature" endpoint in addition to the "register attachment metadata" endpoint. Deletion from Cloudinary should be attempted when an attachment is soft-deleted, but a failure to delete from Cloudinary must not block the metadata soft-delete (log and continue) — orphaned Cloudinary assets are an acceptable, low-cost trade-off vs. blocking the user's action.

## D-007: WhatsApp via `wa.me` Link, No API
**Decision:** Outbound WhatsApp messaging is a client-side deep link built from a phone number and a URL-encoded message template. No webhook, no message queue, no Business API integration.
**Context:** Explicit non-goal; the tailor manually sends via their own WhatsApp app/account.
**Consequences:** No delivery confirmation, no automation, no inbound message handling — purely a convenience link-builder with a small set of message templates (order confirmation, ready notification, payment reminder).

## D-008: Soft Delete vs. Hard Delete Policy (Per Entity)
**Decision:**
  - Soft delete (`deleted_at`): `customers`, `garment_types`, `order_attachments`.
  - No delete at all, only state changes: `orders` (→ `CANCELLED`), `payments` (→ reversal row), `fittings` (→ `CANCELLED` status), `revisions` (→ `CANCELLED` status), `measurement_versions` (never deleted; superseded by a new version).
  - Hard delete acceptable only for: nothing in the domain model (even drafts are just orders in `DRAFT` status, cancellable but not deletable) — this keeps the deletion policy uniform and simple rather than adding a special case for "draft orders can be truly deleted."
**Context:** Historical business/financial data integrity requirement.
**Consequences:** All list queries for these entities must filter `deleted_at IS NULL` / exclude cancelled where relevant by default, with an explicit "show cancelled/inactive" toggle where useful (e.g., garment type management, order list).

## D-009: Audit Log Is Selective, Not Universal
**Decision:** Audit log records are written only for the specific action list in `BUSINESS-RULES.md#audit`, not for every read or trivial UI interaction. Before/after payloads are stored only where they add investigative value (e.g., status changes, payment records, measurement corrections) — not for every field on every entity.
**Context:** Explicit instruction to avoid logging insignificant interactions.
**Consequences:** Audit log stays queryable and useful rather than becoming an undifferentiated firehose.

## D-010: Monetary Values as `DECIMAL(14,2)`
**Decision:** All money fields use Postgres `DECIMAL(14,2)` (mapped via Prisma `Decimal`), not floating point, and not integer minor-units.
**Context:** IDR in practice has no minor unit in daily use, but `DECIMAL` avoids floating-point rounding risk entirely and keeps room for precision if ever needed (e.g., percentage-based discounts computed to cents-equivalent).
**Consequences:** Application code must use a decimal-safe arithmetic approach (Prisma's `Decimal` type / a small `shared/money` helper) rather than native JS floating point for any calculation touching these fields.

## D-011: UUID Primary Keys Everywhere
**Decision:** All tables use UUID primary keys (`@default(uuid())` / `gen_random_uuid()`), including append-only logs.
**Context:** Consistency and to avoid ever leaking sequential IDs (e.g., customer counts) in a customer-facing context (receipts, WhatsApp links).
**Consequences:** `order_number` is a separate, human-facing, sequential/formatted field (`JF-2026-001`), not the primary key — see `BUSINESS-RULES.md#order-number-generation`. In Prisma schemas, UUID PKs are configured via `@default(dbgenerated("gen_random_uuid()")) @db.Uuid` ensuring PostgreSQL handles generation natively with default column expressions in DDL.

## D-012: No Global Frontend State Library for MVP
**Decision:** No Redux/Zustand/etc. introduced by default; server state fetched per-feature, local UI state via React hooks.
**Context:** Small app surface; premature state-management infrastructure adds complexity without current benefit.
**Consequences:** If cross-feature state sharing becomes painful during implementation, this is a candidate for an explicit, recorded architecture change — not a silent addition.

## D-013: Dashboard and Calendar Remain in MVP
**Decision:** Both stay in MVP scope, contrary to a common instinct to cut "nice to have" views.
**Context:** The tailor's core stated pain point is *scattered manual tracking*; a dashboard (what needs attention now) and calendar (what's due when) are the direct replacement for that manual tracking, not decorative additions. They require no new domain entities — both are read-only aggregations over Orders/Fittings/Payments already in MVP.
**Consequences:** Their implementation cost is low relative to their value, so no MVP-boundary risk is introduced.

## D-014: Order Balance Guard Uses Denormalized Cache
**Decision:** The `orders` module's status-transition guard for `READY → COMPLETED` inspects `orders.paid_total_cache` directly rather than importing `getOrderBalance` from the `payments` module.
**Context:** Circular dependency avoidance between `orders` and `payments` modules. Since `paid_total_cache` is updated atomically in the same database transaction on every payment write, the cached value is guaranteed to be accurate at any status-transition point.
**Consequences:** Avoids a circular dependency between `orders` and `payments`; `getOrderBalance` remains exported by `payments` for external callers or queries needing authoritative calculation.

## D-015: Authentication Strategy (JWT via HttpOnly Cookie, Bcrypt Cost 12)
**Decision:** Credential authentication uses `email` as the login identifier (`users.email` unique, nullable for forward compatibility) with passwords hashed via `bcrypt` (cost factor 12). Sessions use short-lived JWTs (default 60m) issued in `HttpOnly`, `Secure` (in production), `SameSite=Strict` cookies (`jahitflow_session`). A global `authenticate` middleware replaces the previous `x-actor-id` stub, populating `req.actorId` and `req.userRole`.
**Context:** Transitioning from MVP's stub actor resolution to secure multi-user authentication without breaking existing foreign keys or business flow.
**Alternatives considered:**
  - (a) LocalStorage tokens: vulnerable to XSS and token exfiltration.
  - (b) Stateful session tables in Postgres: introduces unnecessary write latency on every request for a single boutique deployment.
  - (c) Using `name` instead of `email` as login identifier: names are prone to duplicates, typos, and spaces; email provides a standardized unique handle.
**Consequences:** Frontend must include credentials in CORS requests (`credentials: "include"`). API handlers rely exclusively on `req.actorId` populated from the verified token. Password hashes are never logged, serialized, or returned in any API response.



# JahitFlow — Business Rules

## Customer

- **Uniqueness strategy:** No hard uniqueness constraint on name (common names repeat). Phone number is soft-checked for duplicates: on create, if an active customer with the same normalized phone number exists, the UI must warn and let the operator either reuse the existing customer or proceed anyway (small tailoring shops sometimes share a household phone). No database-level unique constraint on phone.
- **Duplicate customers:** No automatic merge tooling in MVP. If duplicates are created, they remain separate; a manual "merge" feature is Post-MVP.
- **Phone number handling:** Store as entered but normalize for comparison (strip spaces/dashes, handle leading `0` vs `+62` for Indonesian numbers) when checking for the soft-duplicate warning and when building WhatsApp links.
- **Customer deletion:** Soft delete only (`deleted_at`). A customer with any non-cancelled order **cannot** be soft-deleted (block with a clear error) — deletion is only allowed for customers with zero orders or only cancelled orders.

## Measurement

- **Versioning:** Every save of a customer's measurement creates a new `MeasurementVersion` row plus its `MeasurementValue` rows. There is no "edit" endpoint for an existing version's values.
- **Snapshot timing:** The order measurement snapshot is created **at order creation time**, copying whatever is the customer's current (latest) measurement version at that moment. If no measurement version exists yet for the customer, order creation must be blocked with a clear validation error directing the operator to record a measurement first.
- **Correction behavior:** If a measurement was recorded incorrectly, the operator creates a new version (optionally noting "correction of version N" in its `notes` field). The incorrect version is never deleted — it remains for historical traceability of what was known at the time.
- **Historical integrity:** Once an order's measurement snapshot is created, it is never updated by later measurement version changes. An operator who realizes an order used a wrong measurement can only address it by canceling/reopening the order per `STATE-MACHINES.md` and creating a new order or, if the order still allows it (pre-FITTING), by an explicit "resnapshot" action that creates a new snapshot from the current version and logs it via the audit log — this resnapshot action is the only sanctioned way to change an order's snapshot post-creation, and it must be audit-logged with before/after values.

## Order

- **Order number generation:** Format `JF-<year>-<sequential>` (e.g., `JF-2026-001`), sequential per year, zero-padded to at least 3 digits, generated inside the same transaction as order creation using a per-year counter (a small `order_number_counters` table keyed by year, incremented with a row lock) to avoid collisions — not derived from `COUNT(*)`, which is unsafe under concurrent inserts.
- **Status transitions:** See `STATE-MACHINES.md#order`. All transitions must go through the governed transition function; no direct status field update elsewhere in the codebase.
- **Cancellation:** Allowed from `DRAFT`, `CONFIRMED`, `IN_PROGRESS`, `FITTING`, `REVISION`. Not allowed from `READY` or `COMPLETED` without first reopening (see reopening rule). Cancellation requires a reason (free text) and is recorded in `order_status_histories`. Cancelling an order does **not** automatically reverse its payments — the operator must independently record a refund/adjustment payment if money is returned (see Payment rules).
- **Reopening:** `COMPLETED` orders cannot be reopened (a completed, paid, delivered order is final; issues found after completion are handled as a new order or an off-system resolution). `READY` orders may be reopened to `REVISION` if the customer requests further alteration before final handover.
- **Deadline:** `deadline_at` is required on order creation (the shop needs to promise a completion date). No system-enforced consequence of missing a deadline beyond surfacing it prominently on the Dashboard/Calendar as "overdue."
- **Multiple items:** An order must have at least one `OrderItem` to leave `DRAFT` status (a `DRAFT` order may temporarily have zero items while being built in the UI, but confirming to `CONFIRMED` requires ≥1 item).
- **Measurement relationship:** See Measurement section above; snapshot is order-level, not per-item — see next rule.
- **Measurement — order vs. item:** Measurements are modeled at the **order** level, because in this domain a single measurement profile (the customer's body) applies to all items in the same order in the overwhelming majority of cases. Exception: if a future need arises for genuinely different people's measurements within one order (rare, e.g., ordering for a family member using someone else's measurements), that is handled by creating a separate order per person rather than complicating the snapshot model — this is a deliberate simplicity trade-off, recorded here per the assumption policy.

## Payment

- **Overpayment:** A payment that would cause `sum(payments for order) > order.total` is rejected by the API with a validation error, unless explicitly flagged as `type=ADJUSTMENT` (which may be used for refunds, i.e., negative amounts, or for intentional overage with a required note explaining why).
- **Refunds:** Modeled as an `ADJUSTMENT` payment with a negative amount and a required note. No separate refund entity.
- **Balance / completion requirement:** `order.remaining_balance = order.total - sum(payments.amount)`. Transitioning an order to `COMPLETED` requires `remaining_balance <= 0` (allowing exact zero or a small negative from an intentional discount adjustment, but not a positive remaining balance). Enforced in the status transition function, not just in the UI.
- **Correction/deletion:** Payments are never edited or deleted (see `DECISIONS.md#D-004`); corrections are new `ADJUSTMENT` rows referencing `reversed_payment_id` where applicable.

## Fitting

- **Multiple fittings:** Unlimited fittings per order; each gets a sequential `fitting_number` scoped to the order for display ("Fitting 1", "Fitting 2").
- **Fitting status:** `SCHEDULED → DONE`, with `DONE` requiring a `result` of `APPROVED` or `NEEDS_REVISION`. `CANCELLED` is reachable from `SCHEDULED` only.
- **Relationship to revisions:** A fitting with `result=NEEDS_REVISION` is expected to have at least one associated `Revision` created (the UI should prompt for this immediately), but the system does not hard-block saving the fitting without one — a warning is sufficient, since real-world operators may record the fitting first and log the revision minutes later.

## Revision

- **Lifecycle:** `OPEN → IN_PROGRESS → RESOLVED`, or `OPEN/IN_PROGRESS → CANCELLED`. See `STATE-MACHINES.md#revision`.
- **Resolution:** Setting status to `RESOLVED` requires `resolved_at` to be set (defaults to now if not explicitly provided).
- **Relationship to fitting:** A revision *should* reference the `fitting_id` that prompted it. `fitting_id` is nullable to allow revisions arising from direct inspection/operator judgment without a formal fitting session, but the UI should default to requiring it when created from a fitting's "needs revision" flow.

## Attachments

- **Ownership:** Every `OrderAttachment` belongs to exactly one `Order`. No standalone/orphaned attachments.
- **Deletion:** Soft delete (`deleted_at`) in the database; best-effort hard delete from Cloudinary (failure does not block the DB soft-delete — see `DECISIONS.md#D-006`).
- **Validation:** Accept common image formats (jpg/png/webp) and a reasonable size cap (e.g., 10MB) enforced both client-side (fast feedback) and server-side (source of truth) before registering metadata.

## Audit

Must be logged (actor, entity, entity_id, action, before/after where meaningful, timestamp):

- Customer created / updated / soft-deleted
- Measurement version created
- Garment type created / updated / deactivated
- Order created / status changed / cancelled / resnapshotted
- Payment recorded (including adjustments/reversals)
- Fitting created / result recorded
- Revision created / resolved / cancelled
- Attachment uploaded / deleted

Must **not** be logged: reads/views, form field focus/blur, pagination, search queries, and other purely navigational UI interactions.

**Retention:** No automatic purge in MVP; audit logs are kept indefinitely (they are small relative to business data volume at this scale).

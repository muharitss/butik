# JahitFlow — Domain Model

## Core Entities and Relationships

```
User (minimal, system actor for now)
  │
  └── (actor on) AuditLog

Customer 1───* MeasurementVersion 1───* MeasurementValue
   │
   1
   │
   *
Order *───1 Customer
Order 1───* OrderItem *───1 GarmentType
Order 1───1 OrderMeasurementSnapshot 1───* OrderMeasurementSnapshotValue
                                             (copied from a MeasurementVersion)
Order 1───* Payment
Order 1───* Fitting
Order 1───* Revision  (Revision *───0..1 Fitting)
Order 1───* OrderAttachment
Order 1───* OrderStatusHistory

GarmentType 1───* GarmentMeasurementField
```

## Entity Summaries

### Customer
A person who places orders. Holds contact info and notes. Owns a history of measurement versions and a history of orders. Customer data is not duplicated into orders — orders reference the customer by ID and carry only what must be historically frozen (the measurement snapshot; optionally a denormalized name/phone cache for display resilience, but the customer record remains the source of truth for current contact info).

### MeasurementVersion
A dated, immutable snapshot of a customer's body measurements at a point in time. A customer accumulates multiple versions over time; the most recent one (by `measured_at`, tie-broken by `created_at`) is the "current measurement" shown in the UI. Versions are never edited — a correction creates a new version with a note explaining the correction (see `BUSINESS-RULES.md#measurement`).

### MeasurementValue
A single field/value pair (e.g., `chest = 92, unit=cm`) belonging to a `MeasurementVersion`. Field keys are drawn from a shared vocabulary also referenced by `GarmentMeasurementField`, so garment types can declare which fields they require without hard-coding field names into application logic.

### GarmentType
A configurable category of garment (kemeja, gamis, celana, custom, etc.) with a name, description, active/inactive flag, and a set of measurement fields it requires/uses. Garment types are managed by the operator, not hard-coded, but are still a simple flat list — not a generic "entity metadata" framework.

### GarmentMeasurementField
Declares that a given `field_key` is required/optional for a given `GarmentType`, with a display label, unit, and sort order for form rendering. This is the mechanism that keeps "which measurements does a kemeja need" out of application code.

### Order
The central business entity: one customer, one or more order items, a deadline, a status, pricing fields, and everything derived from its lifecycle (payments, fittings, revisions, attachments, status history). Identified externally by a human-facing `order_number` (e.g., `JF-2026-001`) distinct from its internal UUID.

### OrderItem
One line of an order: a garment type, quantity, unit price, computed subtotal, and item-specific notes.

### OrderMeasurementSnapshot / OrderMeasurementSnapshotValue
The frozen copy of measurement values used for this order, created at order-creation time from the customer's then-current `MeasurementVersion`. See `DECISIONS.md#D-003`. Modeled at the **order** level (not per order item) — see `BUSINESS-RULES.md#measurement-order-vs-item` for the rationale and the documented exception.

### Payment
A single, immutable financial event against an order: DP, partial, final, or adjustment/reversal. The order's paid total and remaining balance are always derivable by summing its payments.

### Fitting
A single fitting session for an order: scheduled/occurred date, result (approved / needs revision), notes, next action. An order may have multiple fittings over its lifecycle.

### Revision
A required alteration arising from a fitting (typically) or another inspection context. Tracks the issue, requested change, status, and resolution. Usually linked to the fitting that produced it.

### OrderAttachment
Metadata for a file stored in Cloudinary, owned by an order (reference photos, result photos, etc.), with type, uploader, and upload timestamp.

### OrderStatusHistory
An append-only log of every status transition an order has gone through, with who/what triggered it and an optional reason (e.g., cancellation reason).

### AuditLog
A cross-cutting append-only log of significant actions across the system (see `BUSINESS-RULES.md#audit` for exact scope), recording actor, entity, action, and before/after where meaningful.

### User
Minimal identity record used as an actor reference for audit and "recorded_by"/"created_by" fields. Not used for authentication in MVP (see `DECISIONS.md#D-002`).

## Why Measurement Data Isn't Stored Directly on Customer or Order

Storing mutable measurement fields directly on `Customer` and having `Order` reference `Customer` for measurements would mean any correction to a customer's measurements retroactively changes every past order's data — violating the explicit historical-integrity requirement. The version + snapshot model (see `DECISIONS.md#D-003`) is the mechanism that prevents this while still letting the UI show "current measurement" easily (latest version) and full history (all versions).

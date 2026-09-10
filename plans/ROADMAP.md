# JahitFlow — Roadmap

## Phases

The roadmap follows dependency order, not calendar time. Each phase must be functionally complete (per its tasks' Definition of Done) before the next phase begins, though minor overlap (e.g. starting UI while the last API endpoint of a module is finished) is acceptable.

```
Phase 0 — Foundation
   ↓
Phase 1 — Customers
   ↓
Phase 2 — Garments & Measurements
   ↓
Phase 3 — Orders (core + status machine)
   ↓
Phase 4 — Payments
   ↓
Phase 5 — Fittings & Revisions
   ↓
Phase 6 — Attachments
   ↓
Phase 7 — Audit Log (retrofit + ongoing)
   ↓
Phase 8 — Dashboard & Calendar
   ↓
Phase 9 — Receipt & WhatsApp Link
   ↓
Phase 10 — Hardening (validation, security, testing, deployment)
```

### Phase 0 — Foundation
Backend/frontend project scaffolding, shared conventions (error format, validation approach), database connection, base deployment shape. No business features yet.

### Phase 1 — Customers
Customer CRUD, search (name/phone/order number placeholder until orders exist), notes, contact info.

### Phase 2 — Garments & Measurements
Garment type configuration, measurement field dictionary, measurement version/value model and API, measurement history UI. This phase must be complete before Orders, because order creation depends on measurement snapshotting.

### Phase 3 — Orders
Order + order item schema, order number generation, pricing calculation, measurement snapshot creation, order status state machine, status history.

### Phase 4 — Payments
Payment recording, balance/payment-status calculation, payment rules (no overpayment, immutability).

### Phase 5 — Fittings & Revisions
Fitting scheduling/results, revision creation/resolution, their relationship to order status transitions.

### Phase 6 — Attachments
Cloudinary integration, attachment metadata, ownership rules.

### Phase 7 — Audit Log
Audit infrastructure introduced early enough to wrap all mutating actions from Customers onward; this phase formalizes and back-fills any module not yet wired in.

### Phase 8 — Dashboard & Calendar
Read-only aggregating views over existing data. No new domain entities.

### Phase 9 — Receipt & WhatsApp Link
Printable receipt view, WhatsApp deep-link helper. Both are presentation-layer features over existing data.

### Phase 10 — Hardening
Validation completeness pass, security review, test suite completion, deployment/migration/backup finalization.

## MVP Boundary

**In MVP:** Customer, Measurement, Garment, Order, Payment, Fitting, Revision, Dashboard, Calendar, Attachment, Receipt, WhatsApp link, Audit Log.

All of these are required for the tailor to run real orders end-to-end (intake → measurement → order → production tracking → fitting/revision loop → payment → completion), with basic operational visibility (dashboard/calendar) and accountability (audit log). None of them were reclassified out of MVP — see `DECISIONS.md` for the reasoning on borderline candidates (Audit Log, Calendar).

**Explicitly Post-MVP:** customer portal, authentication & RBAC, staff accounts, inventory, supplier management, accounting, WhatsApp Business API, payment gateway integration, multi-business/multi-branch SaaS, advanced analytics, native mobile apps.

## Extension Points (not built now, just kept open)

- `users` table exists from Phase 0 with a single implicit system user; adding real auth later means adding credentials + session handling without changing any foreign keys (see `DECISIONS.md`).
- Garment measurement fields are data-driven, not hard-coded, so new garment types don't require schema changes.
- Order status values are an enum with a centralized transition table (see `STATE-MACHINES.md`), so adding a status later is a contained change.

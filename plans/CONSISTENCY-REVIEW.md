# JahitFlow — Final Planning Consistency Review

## Cross-Document Checks

- **Entities referenced by API exist in ERD:** Verified — every resource in `API.md` (customers, garment-types, measurements, orders, order items, payments, fittings, revisions, attachments, audit-logs) maps to a table in `database/ERD.md`. Dashboard/calendar/receipts/whatsapp are read/derived endpoints with no dedicated tables, consistent with `DOMAIN.md`'s decision not to model them as entities.
- **Tasks don't depend on nonexistent features:** Verified via each task's `Dependencies` section; dependency chain is acyclic and matches `ROADMAP.md`'s phase order. Two internal cross-references were explicitly flagged and resolved in-place: (1) TASK-004 must include a working `recordAudit` stub before TASK-006 onward calls it, formalized fully in TASK-026; (2) TASK-020's fitting-creation guard must check "no open revisions" before allowing the `REVISION → FITTING` transition, per `STATE-MACHINES.md`, cross-referenced explicitly in TASK-022.
- **Status transitions match business rules:** `STATE-MACHINES.md#order` and `BUSINESS-RULES.md#order` agree on cancellation scope, reopening scope, and the `requires_fitting` branch; TASK-015 and TASK-020 implement exactly this table.
- **Payment rules match order completion rules:** `BUSINESS-RULES.md#payment`'s completion requirement (`remaining_balance <= 0`) matches `STATE-MACHINES.md#order`'s `READY→COMPLETED` guard, both implemented in TASK-015/018.
- **Measurement snapshots match database design:** `DECISIONS.md#D-003`'s copy-plus-reference model is fully reflected in `database/ERD.md`'s `order_measurement_snapshots`/`_values` tables and TASK-013/014's schema and API tasks, including the partial-unique-index mechanism for resnapshotting.
- **Attachment design matches Cloudinary:** `DECISIONS.md#D-006` (metadata-only storage, direct-upload flow) matches `database/ERD.md#order_attachments` (no binary column) and TASK-024's signed-upload-then-register flow.
- **Architecture matches chosen stack:** `ARCHITECTURE.md` §21/22 stack (React/Vite/TS, Node/Express/TS, PostgreSQL/Prisma, Cloudinary, modular monolith) is used consistently across every task's Files/Modules sections — no task introduces an alternate framework or a distributed-systems pattern.
- **MVP boundaries are consistent:** `ROADMAP.md`'s MVP list matches the full task list (TASK-001 through TASK-031) with no task belonging to a Post-MVP feature.
- **Tasks follow dependency order:** Confirmed — Foundation (001–004) → Customers (005–007) → Garments/Measurements (008–012) → Orders (013–017) → Payments (018–019) → Fittings/Revisions (020–023) → Attachments (024–025) → Audit (026) → Dashboard/Calendar (027–028) → Receipt/WhatsApp (029–030) → Hardening (031), matching `ROADMAP.md` exactly.

---

# PLANNING REVIEW

- MVP scope: PASS
- Architecture consistency: PASS
- Database consistency: PASS
- API consistency: PASS
- Task dependency consistency: PASS
- Over-engineering risk: LOW

## Important Assumptions

- Measurement field vocabulary is a fixed, code-level list for MVP rather than a fully dynamic, operator-managed dictionary; extending it requires a small code change, not a database migration (see TASK-012). Impact: low — the field set for tailoring is naturally stable, and this avoids a speculative generic-metadata framework the master requirements explicitly warned against.
- Measurements are modeled at the order level, not per order item, on the assumption that one order serves one person's body measurements; multi-person orders are handled as separate orders. Impact: low for a home-tailor's typical order pattern; documented as a deliberate simplicity trade-off in `BUSINESS-RULES.md`.
- No hard uniqueness constraint on customer phone number; duplicate detection is a soft, dismissible warning rather than a block, since shared household phone numbers are common in this business context.
- `order_number_counters`-based sequencing was chosen over `COUNT(*)`-based numbering specifically to remain correct under concurrent order creation; this is a technical assumption about acceptable complexity (one small counter table) justified by the correctness requirement, not scope creep.
- Server-side PDF generation for receipts is deferred; browser print-to-PDF is assumed sufficient for MVP. If the tailor needs to email/WhatsApp a PDF file directly (rather than a link/printed page), this becomes a Post-MVP task.

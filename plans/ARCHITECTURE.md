# JahitFlow — Architecture (Technical Source of Truth)

## 1. Architectural Style

**Modular monolith.** One backend deployable, one frontend deployable, one PostgreSQL database. The backend is internally organized into domain modules with explicit boundaries, but there is no network boundary between modules — calls between modules happen via direct function/service calls within the same process, not HTTP or a message bus.

Rationale: single business, single operator, small order volume (see `DECISIONS.md#modular-monolith`). Distributed-systems patterns would add operational cost with no corresponding benefit at this scale.

## 2. System Boundaries

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────┐
│  Frontend (React)    │ ───────────────────────▶ │  Backend (Express)   │
│  Vite + TypeScript   │ ◀─────────────────────── │  Node.js + TS        │
└─────────────────────┘                            └──────────┬───────────┘
                                                                │
                                                     Prisma ORM │
                                                                ▼
                                                     ┌──────────────────┐
                                                     │   PostgreSQL     │
                                                     └──────────────────┘
                                                                │
                                                     HTTPS (upload API)
                                                                ▼
                                                     ┌──────────────────┐
                                                     │   Cloudinary     │
                                                     └──────────────────┘
```

The frontend never talks to PostgreSQL or Cloudinary directly for persistence of business data. Attachment upload may use a signed direct-upload flow to Cloudinary from the frontend (see `DECISIONS.md#cloudinary`), but the resulting metadata is always registered with the backend, which is the only writer of the database.

## 3. Backend Architecture

### 3.1 Module Structure

```
backend/src/
├── modules/
│   ├── customers/
│   ├── garments/
│   ├── measurements/
│   ├── orders/
│   ├── payments/
│   ├── fittings/
│   ├── revisions/
│   ├── attachments/
│   ├── dashboard/
│   ├── calendar/
│   ├── receipts/
│   ├── whatsapp/
│   └── audit/
├── shared/
│   ├── errors/
│   ├── validation/
│   ├── http/           (response envelope, pagination helpers)
│   └── money/          (monetary value helpers)
├── infrastructure/
│   ├── prisma/          (client, migrations live in prisma/ at repo root)
│   └── cloudinary/
├── app.ts               (Express app wiring)
└── server.ts             (process entrypoint)
```

### 3.2 Module Internal Shape

A module is **not required** to have `controller/service/repository/use-case` for every feature. Each module has, at minimum:

- `<module>.routes.ts` — Express route definitions, wires HTTP to handlers.
- `<module>.handlers.ts` — request/response translation (parse input, call domain logic, shape response). May be merged with routes for very small modules (e.g. `garments`, `whatsapp`).
- `<module>.rules.ts` — business rules and validation that don't belong to a single request (e.g. order state transition legality). Only created when rules exist beyond simple schema validation.
- `<module>.types.ts` — module-local types/DTOs not already covered by Prisma's generated types.

A `service` layer (a class/module separating "business logic" from "handler") is introduced **only** for modules with non-trivial orchestration across multiple tables in one transaction: `orders`, `payments`, `measurements`. Modules with simple CRUD (`customers`, `garments`) keep logic directly in handlers calling Prisma.

Do not introduce `repository` abstractions over Prisma — Prisma's client already is the repository layer for this project's scale. Do not introduce `factory`, `strategy`, `adapter`, `facade`, or `gateway` patterns unless a specific task's Architecture Context section calls for one with a stated reason.

### 3.3 Module Boundaries

- A module may read another module's Prisma models directly (this is a monolith with one schema — that's acceptable), but **must not** duplicate another module's business rules. E.g., `payments` computes "does this payment exceed the remaining balance" using order totals fetched via the `orders` module's exposed calculation function, not by re-deriving the formula independently.
- Cross-module orchestration (e.g., "creating an order also creates a measurement snapshot") lives in the module that owns the *triggering* action (`orders`), which calls an explicit exported function from the owned module (`measurements`), never by reaching into the other module's Prisma models to replicate its logic.
- `audit` is a cross-cutting module: other modules call a shared `recordAudit(...)` function after a successful mutation. Audit logging is not implemented as request middleware auto-inspecting responses, because before/after payloads need domain-specific shaping.

### 3.4 Transactions

Any mutation that touches more than one table as a single business action (order creation + snapshot + status history; payment creation + order balance recompute; fitting result + auto-created revision) **must** run inside a single Prisma `$transaction`. Partial writes are not acceptable for financial or status data.

## 4. Frontend Architecture

### 4.1 Structure

```
frontend/src/
├── app/                 (routing, layout shell, providers)
├── features/
│   ├── customers/
│   ├── garments/
│   ├── measurements/
│   ├── orders/
│   ├── payments/
│   ├── fittings/
│   ├── revisions/
│   ├── attachments/
│   ├── dashboard/
│   ├── calendar/
│   └── receipts/
├── components/          (shared, feature-agnostic UI)
├── hooks/               (shared, feature-agnostic hooks)
├── lib/                 (API client, formatting, whatsapp link builder)
└── types/               (shared types mirroring backend DTOs)
```

Each `features/<x>` folder owns its own components, API calls, and local state for that domain. Cross-feature UI composition (e.g., an order detail page embedding payment and fitting summaries) imports from those features' public exports rather than duplicating their logic.

### 4.2 State Management

No global state management library is introduced for MVP. Server data is fetched per-feature (a lightweight fetch wrapper in `lib/`, e.g. via `fetch` + a small typed helper, or `@tanstack/react-query` if the team prefers — this is a Post-MVP-safe substitution and does not require an architecture change since it only affects `lib/` and feature hooks). Local UI state uses React's built-in state/hooks. This is revisited only if cross-feature state sharing becomes a genuine pain point.

### 4.3 UI Principles

- Mobile-first for data entry screens (customer intake, measurement entry, payment recording) since these are the most likely to be done on a phone in the shop.
- Desktop-friendly, information-dense views for dashboard, order list, and receipt printing.
- Forms are the primary UI element; favor simple forms with clear validation messages over multi-step wizards, except where the domain genuinely requires staged entry (e.g., order creation: select customer → select items → confirm measurements → confirm pricing).

## 5. Database Architecture

PostgreSQL via Prisma ORM. Prisma schema lives at `backend/prisma/schema.prisma`; the `database/ERD.md` document is the human-readable design and must stay consistent with the schema.

Key architectural commitments (detailed in `DECISIONS.md` and `database/ERD.md`):

- **Append-only / immutable records** for measurement versions, order measurement snapshots, payments, and order status history. Corrections are new rows, not edits, except for narrowly-scoped mutable metadata (e.g., a customer's phone number, a garment type's name).
- **Soft delete** (`deleted_at` timestamp) for `customers`, `garment_types`, `order_attachments`. **No delete** (cancellation/reversal only) for `orders`, `payments`, `fittings`, `revisions`, `measurement_versions`.
- Monetary values stored as integer minor units is unnecessary for IDR (no minor unit in practice); store as `DECIMAL(14,2)` to avoid floating-point error while allowing sub-unit precision if ever needed.
- All primary keys are UUIDs (`gen_random_uuid()` via Postgres `pgcrypto`/`gen_random_uuid()` built-in on PG13+), except `audit_logs` and `order_status_histories`, which may use bigserial since they are pure append logs with no external referencing need beyond FK — UUID is fine there too for consistency; **decision: use UUID everywhere** for simplicity (see `DECISIONS.md`).

## 6. External Services

- **Cloudinary**: attachment file storage. Backend stores `cloudinary_public_id`, `secure_url`, and upload metadata only — never binary content in Postgres.
- **WhatsApp**: no API integration. The backend/frontend builds `https://wa.me/<phone>?text=<url-encoded message>` links from templates; opening the link is a client-side action (opens WhatsApp app/web).

No other external services are part of MVP.

## 7. Data Flow (Representative: Order Creation)

```
Frontend: user selects customer, items, confirms measurement version
   → POST /api/orders
Backend orders module:
   1. Validate customer exists, items reference active garment types
   2. Resolve customer's current measurement version
   3. Begin transaction:
      a. Generate order_number
      b. Insert order (status=DRAFT), order_items
      c. Insert order_measurement_snapshot + snapshot values (copied from measurement_version)
      d. Insert order_status_history (null → DRAFT)
      e. Compute and store subtotal/total on order
      f. Call audit.recordAudit('order','create',...)
   4. Commit, return order DTO
```

## 8. Constraints

- Single deployment region/instance; no horizontal scaling requirement for MVP.
- No authentication for MVP (see `DECISIONS.md#auth-scope`); a placeholder `system` actor is used for audit records until real users exist.
- Node.js + Express + TypeScript on the backend; React + Vite + TypeScript on the frontend; no alternate runtime or framework substitutions without an architecture change record.

## 9. Testing Architecture

- **Unit tests** live alongside the module (`modules/orders/__tests__/`), covering pure/business logic: pricing math, status transition legality, measurement snapshot construction, payment balance math.
- **Integration tests** spin up the Express app against a test PostgreSQL database (or a transactional test schema) and exercise real API routes + Prisma, covering cross-module flows (order → payment → status).
- **E2E tests** (optional tooling choice, e.g. Playwright) drive the actual frontend against a running backend for the critical path in `TESTING` section of `ROADMAP.md`'s Phase 10 task.
- Test framework choice (Jest or Vitest) is left to the Foundation task but must be consistent across backend and frontend where feasible.

## 10. Deployment Architecture

```
                 ┌────────────┐
   Users ──────▶ │  Frontend   │  (static build, served via CDN/static host)
                 └─────┬──────┘
                       │ HTTPS
                       ▼
                 ┌────────────┐
                 │  Backend    │  (single Node process, e.g. container/VM/PaaS)
                 └─────┬──────┘
                       │
                 ┌─────▼──────┐        ┌──────────────┐
                 │ PostgreSQL │        │  Cloudinary   │
                 └────────────┘        └──────────────┘
```

- Environments: `development`, `production` at minimum, distinguished by `.env` files / environment variables (never committed).
- Prisma Migrate is the single mechanism for schema change; no manual DDL in production.
- Database backups: at minimum daily automated backup of PostgreSQL (mechanism depends on hosting choice — document the actual choice in `DECISIONS.md` once hosting is selected).
- No Kubernetes, no container orchestration platform required.

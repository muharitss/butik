# JahitFlow — Architecture (Technical Source of Truth)

## 1. Architectural Style

**Modular Monolith aligned with Clean Architecture principles.** One backend deployable, one frontend deployable, and one PostgreSQL database. The backend is organized into domain-driven modules with explicit architectural boundaries:
- **Delivery Mechanism (Interface Adapters):** HTTP routing, input validation, and response serialization.
- **Application Layer (Use Cases / Services):** Workflow orchestration, transaction management, and cross-module coordination.
- **Domain Layer (Entities & Rules):** Pure business invariants, state machines, transition guards, and exact financial calculations.
- **Infrastructure Layer:** Database access (Prisma ORM), external service adapters (Cloudinary, WhatsApp link builders), and system services.

There is no network boundary between modules — inter-module communication occurs via in-process function/service calls, respecting dependency direction.

> **Rationale:** Single boutique business, single operator, low order volume (see `DECISIONS.md#modular-monolith`). Distributed microservices would introduce excessive operational overhead and operational latency with zero benefit. At the same time, maintaining strict internal Clean Architecture layering ensures high testability, prevents spaghetti dependencies, and keeps business rules independent of web frameworks and database clients.

---

## 2. System Boundaries & Dependency Rule

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (React SPA)                 │
│                 Vite + TypeScript + Tailwind           │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JSON (REST)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Delivery Layer (Express Adapters)        │
│          Router (HTTP) ──▶ Handler (Req/Res Mapper)    │
└───────────────────────────┬────────────────────────────┘
                            │ Plain DTOs / Input Models
                            ▼
┌────────────────────────────────────────────────────────┐
│               Application Layer (Use Cases)            │
│            Module Services (Workflow Orchestration)    │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│       Domain Layer       │  │   Infrastructure Layer   │
│  Pure Rules & Invariants │  │  Prisma ORM & PostgreSQL │
│ State Machines & Guards  │  │  Cloudinary Asset Store  │
└──────────────────────────┘  └──────────────────────────┘
```

### Dependency Direction Rules
1. **Inward Dependencies:** Source code dependencies point inward toward business policy. Handlers depend on Services; Services depend on Domain Rules and call Infrastructure.
2. **Pure Domain:** Business rules in `*.rules.ts` and `shared/money/` must remain pure: zero imports from Express (`Request`/`Response`), zero database dependencies, and zero side-effects.
3. **Delivery as Detail:** Handlers must never contain business logic, branching domain validations, or direct database queries.
4. **Persistence as Detail:** Business entities and use case workflows must not be modeled solely around database table convenience.

---

## 3. Backend Architecture

### 3.1 Directory Structure

```
backend/src/
├── modules/
│   ├── attachments/     (order design sketches & fabric photos)
│   ├── audit/           (selective immutable audit trail)
│   ├── auth/            (authentication, JWT tokens, login/logout)
│   ├── calendar/        (deadlines, fittings, delivery events)
│   ├── customers/       (customer records & CRM aggregations)
│   ├── dashboard/       (operational status aggregations & metrics)
│   ├── fittings/        (fitting sessions & status transitions)
│   ├── garments/        (garment catalog & custom measurement fields)
│   ├── measurements/    (customer body measurement versions)
│   ├── orders/          (order lifecycle, pricing, item management)
│   ├── payments/        (append-only payment records & balance calculations)
│   ├── receipts/        (printable thermal/A4 receipt data generation)
│   ├── reports/         (financial & operational summaries)
│   ├── revisions/       (post-fitting alterations & rework tracking)
│   ├── settings/        (boutique metadata, store profile)
│   ├── users/           (staff accounts, roles, access management)
│   └── whatsapp/        (templated wa.me customer communication links)
├── shared/
│   ├── auth/            (RBAC permissions, authorize middleware)
│   ├── errors/          (AppError, BusinessRuleViolationError, NotFoundError)
│   ├── http/            (sendSuccess, sendError, pagination helpers)
│   ├── logger/          (request logging middleware)
│   ├── middleware/      (rateLimiter, common guards)
│   ├── money/           (exact decimal arithmetic & currency formatting)
│   ├── test/            (test setup, in-memory fixtures)
│   └── validation/      (Zod schema validation middleware)
├── infrastructure/
│   ├── prisma/          (Prisma client instance & schema)
│   └── cloudinary/      (Cloudinary upload signatures & asset destruction)
├── app.ts               (Express app bootstrap & router composition)
└── server.ts            (Process entrypoint & listener)
```

### 3.2 Module Internal Anatomy

Each domain module is structured into distinct, cohesive layers:

| File Pattern | Architectural Role | Responsibilities & Constraints |
| :--- | :--- | :--- |
| `<module>.router.ts` | **HTTP Route Boundary** | Binds HTTP paths/verbs, attaches authentication (`authenticate`), authorization (`authorize`), and Zod validation middleware (`validate`). |
| `<module>.handlers.ts` | **Interface Adapter (Delivery)** | Extracts typed params/body/actor, delegates directly to application service functions, and maps output to `sendSuccess(res, data)`. **MUST NOT perform database queries (`prisma.*`) or domain calculations.** |
| `<module>.service.ts` | **Application Use Cases** | Orchestrates domain workflows, manages database transactions (`prisma.$transaction`), invokes domain rules, coordinates cross-module calls, and triggers audit logging. |
| `<module>.rules.ts` | **Domain Invariants & Policies** | Pure business functions: state machine transition validation, transition guards, business calculations. **No async, no database, no HTTP.** |
| `<module>.schemas.ts` | **Input/Output DTOs** | Zod schemas and inferred TypeScript types for request validation and response shaping. |
| `<module>.test.ts` | **Integration & Feature Tests** | Tests API endpoints and end-to-end module workflows. |
| `index.ts` | **Public Module API** | Re-exports only router, public service functions, and necessary types. Modules must not reach into private internals of other modules. |

### 3.3 Module Boundaries & Cross-Module Invocations

- **Explicit Service Calls:** Cross-module coordination must occur via explicit exported service functions (e.g. `orders.service.ts` calls `getCurrentMeasurementVersion` from `measurements` and `recordAudit` from `audit`).
- **No Rule Duplication:** A module must not re-implement another module's business rules. For example, `fittings` checks order transition eligibility by invoking the `orders` module's status transition API, not by manually modifying the order status in the database.
- **Transactional Boundary:** When a workflow spans multiple modules atomically (e.g. creating an order, taking a measurement snapshot, and recording an initial status history), the initiating service controls the `prisma.$transaction` and passes the transaction client (`tx`) down to participating service functions.
- **Cross-Cutting Audit:** Mutations log selective before/after states via `recordAudit(payload, tx)` from `modules/audit/`. Audit logging is explicitly invoked in application services, never in generic HTTP middleware, ensuring domain-meaningful payloads.

---

## 4. Authentication & Authorization Architecture

### 4.1 Authentication Strategy (D-015)
- **Token Mechanism:** Stateless JSON Web Tokens (JWT) signed via `jose` with HS256.
- **Storage:** Secure `HttpOnly`, `SameSite=Strict`, `Secure` (production) cookies (`jahitflow_session`).
- **Password Security:** Hashed using `bcryptjs` with cost factor 12.
- **Actor Resolution:** Global authentication middleware in [app.ts](file:///c:/Users/Muharits/programmer/butik/backend/src/app.ts) validates the JWT on incoming requests and populates `req.actorId` and `req.userRole`. Health checks and login routes are explicitly exempted.

### 4.2 Role-Based Access Control (RBAC) (D-016)
- **Roles:** `owner` (full administrative and financial authority) and `tailor`/`staff` (operational tasks: order handling, customer measurements, fittings).
- **Enforcement:** Pure in-memory permission mapping (`shared/auth/permissions.ts`) paired with the composable `authorize(permission)` middleware.
- **Policy:** Route-level authorization blocks unauthorized actors before executing business logic, returning standard `403 FORBIDDEN` envelopes.

---

## 5. Frontend Architecture

### 5.1 Directory & Feature Structure

```
frontend/src/
├── app/                 (routing definitions, shell layout, global providers)
├── features/            (domain feature slices matching backend modules)
│   ├── auth/            (login form, auth context, session state)
│   ├── customers/       (customer list, detail, CRM history)
│   ├── garments/        (garment catalog, custom measurement fields)
│   ├── measurements/    (measurement history, entry forms)
│   ├── orders/          (order management, item creation, workflow actions)
│   ├── payments/        (recording payments, balance status)
│   ├── fittings/        (schedule, log fitting results)
│   ├── revisions/       (rework logging & tracking)
│   ├── attachments/     (design sketch gallery, Cloudinary uploader)
│   ├── dashboard/       (stat cards, urgent alerts, due-soon orders)
│   ├── calendar/        (monthly/weekly deadline view)
│   ├── receipts/        (printable receipt view)
│   ├── reports/         (revenue, order completion stats)
│   └── settings/        (boutique profile configuration)
├── components/ui/       (design system primitives: Button, Input, Modal, etc.)
├── hooks/               (reusable UI hooks: useDebounce, usePermission)
├── lib/                 (apiClient wrapper, formatting helpers)
└── types/               (shared contract types)
```

### 5.2 Layering & Component Decomposition
To prevent "God Components" and maintain clean UI separation:
1. **Views / Pages (`pages/`):** High-level layout and routing containers. Compose sub-components and bind hooks.
2. **Domain Components (`components/`):** Focused presentational or localized interactive components (e.g. `CustomerSelectModal`, `OrderItemTable`, `OrderSummaryCard`).
3. **Form / State Hooks (`hooks/`):** Custom hooks encapsulating complex form state, validation, and multi-step orchestration (e.g. `useOrderCreateForm`).
4. **Data Gateways (`api/*.api.ts`):** Typed API client functions invoking the shared `apiClient` wrapper. UI components never call raw `fetch` directly.

### 5.3 State Management & UI Principles
- **Server State:** Handled per-feature via lightweight async fetching and localized state or `@tanstack/react-query`.
- **Client State:** React built-in state primitives (`useState`, `useReducer`, Context for Auth). No heavyweight global store library (D-012).
- **Responsive Philosophy:** Mobile-first for shop-floor data capture (measurements, fitting notes, customer intake); desktop-optimized for dense operational views (dashboard, calendar, order lists).

---

## 6. Database Architecture

- **Engine:** PostgreSQL 15+.
- **ORM & Migrations:** Prisma ORM. Prisma schema lives at `backend/prisma/schema.prisma`. All schema modifications happen strictly through `prisma migrate deploy`.
- **Identity & Keys:** UUIDv4 primary keys generated natively in PostgreSQL via `gen_random_uuid()` for all tables (D-011). Sequential order numbers (`JF-YYYY-NNN`) are generated separately using atomic row-level locks on `order_number_counters` (`SELECT FOR UPDATE`).
- **Precision Financials:** Monetary amounts are stored as `DECIMAL(14,2)` to prevent floating-point rounding errors (D-010). Calculations in code use the decimal-safe math utility in `shared/money/`.
- **Immutability & Auditability:**
  - Append-only tables: `measurement_versions`, `order_measurement_snapshots`, `order_measurement_snapshot_values`, `order_status_histories`, `payments`, `audit_logs`.
  - Corrections to payments are written as new adjustment/reversal rows (D-004).
  - Snapshot isolation: When an order is created or re-snapshotted, customer measurement values are copied into an immutable order snapshot, guaranteeing tailoring specs never change retroactively when customer profiles are updated (D-003).
- **Deletion Policy:** Soft-delete (`deleted_at`) for `customers`, `garment_types`, and `order_attachments`. Domain entities (`orders`, `fittings`, `revisions`) utilize explicit terminal state transitions (`CANCELLED`), never hard deletion (D-008).

---

## 7. External Services & Adapters

- **Cloudinary (Storage Gateway):**
  - Used for garment photos, reference sketches, and fabric attachments.
  - Architecture uses signed direct-upload: backend issues a cryptographic upload signature via [infrastructure/cloudinary/](file:///c:/Users/Muharits/programmer/butik/backend/src/infrastructure/cloudinary/index.ts); frontend uploads directly to Cloudinary CDN; frontend registers public ID and URL with the backend (D-006).
  - Binary file payloads never pass through the Node.js backend process.
- **WhatsApp (Notification Gateway):**
  - Zero third-party API dependencies or bot subscriptions.
  - Backend/Frontend builds structured `https://wa.me/<phone>?text=<encoded_text>` deep links from domain templates (order confirmation, fitting reminders, invoice ready) for the operator to send with one click (D-007).

---

## 8. Representative Data Flow: Order Creation Lifecycle

```
[Tailor / Operator]
        │
        │ 1. Submits Order Form (Customer ID, Garment Items, Due Date)
        ▼
[Frontend: OrderCreatePage]
        │
        │ 2. POST /api/orders (Bearer Cookie)
        ▼
[Backend: app.ts]
        │
        │ 3. authenticate & rateLimitWrites middleware
        ▼
[orders.router.ts]
        │
        │ 4. validate({ body: createOrderSchema })
        ▼
[orders.handlers.ts]
        │
        │ 5. Unpacks input & req.actorId ──▶ invokes createOrder(input, actorId)
        ▼
[orders.service.ts]
        │
        │ 6. Executes inside prisma.$transaction:
        │    a. Validates customer existence & active status
        │    b. Validates garment types are active
        │    c. Calls measurements.getCurrentMeasurementVersion(customerId, tx)
        │    d. Calls computeOrderTotals (pure calculation)
        │    e. Generates sequential orderNumber via getNextOrderNumber(year, tx) [FOR UPDATE]
        │    f. Inserts Order (status=DRAFT) + OrderItems
        │    g. Inserts OrderMeasurementSnapshot + SnapshotValues (copied values)
        │    h. Inserts OrderStatusHistory (null -> DRAFT)
        │    i. Calls audit.recordAudit({ action: "create", entityType: "order" }, tx)
        ▼
[Database (PostgreSQL)]
        │
        │ 7. Transaction commits atomically
        ▼
[orders.handlers.ts]
        │
        │ 8. sendSuccess(res, order, undefined, 201)
        ▼
[Frontend: OrderCreatePage]
        │
        │ 9. Navigates to /orders/:id with success notification
```

---

## 9. Testing Architecture

Testing utilizes the native Node.js Test Runner (`node:test` + `node:assert/strict`), eliminating testing framework bloat.

### Tier 1: Pure Domain Unit Tests (`backend/src/unit.test.ts` & `*.rules.ts`)
- Tests business math, pricing logic, order status state machine transitions, and revision guards in memory.
- Execution speed: < 100ms.
- Requirements: Zero database, zero network, zero Express setup.

### Tier 2: Module & API Integration Tests (`*.test.ts`)
- Exercises HTTP endpoints, route authorization, database transactions, and cascade rules against a test PostgreSQL instance.
- Includes constraint validations (e.g. `orders.constraints.test.ts`) to verify uniqueness, row-level locking, and transactional rollback behavior.

### Tier 3: End-to-End & Sanity Checks (`backend/src/e2e.test.ts`)
- Simulates complete operational lifecycles: Customer Intake → Measurement Capture → Order Creation → Payment Recording → Fitting Transition → Completion.

---

## 10. Deployment & Operational Architecture

```
                    ┌────────────────────────┐
   Users / Tailor ─▶│   Frontend (React SPA) │ (Vite static build served via CDN / Nginx)
                    └───────────┬────────────┘
                                │ HTTPS (CORS restricted)
                                ▼
                    ┌────────────────────────┐
                    │  Backend (Node/Express)│ (Single process container, e.g. Docker)
                    └──────┬──────────┬──────┘
                           │          │
         Prisma Connection │          │ HTTPS Upload Signature
                           ▼          ▼
            ┌────────────────┐      ┌────────────────────────┐
            │   PostgreSQL   │      │ Cloudinary Media Cloud │
            └────────────────┘      └────────────────────────┘
```

- **Environment Config:** Managed strictly via environment variables (`.env`, `.env.example`).
- **Database Migrations:** Deployed via `prisma migrate deploy` during deployment pipeline prior to process boot.
- **Backups:** Automated daily logical dump (`pg_dump`) of PostgreSQL database.
- **Process Model:** Single Node.js process managed via Docker container; no multi-region or distributed container orchestration required for single-boutique scale.

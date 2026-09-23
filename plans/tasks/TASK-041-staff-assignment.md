# TASK-041 — Staff Assignment for Orders

## Objective

Tambahkan fitur **penugasan staf (tailor)** pada order. Setiap order bisa ditugaskan ke satu staf yang bertanggung jawab atas produksinya. Model `User` sudah ada; task ini hanya menambahkan relasi assignment ke `Order` lalu mengeksposnya di API dan UI.

**Hasil akhir yang diharapkan:**
- Di halaman detail order, ada dropdown untuk memilih staf/tailor penanggung jawab.
- Di halaman daftar order, ada filter untuk melihat order per staf.
- Riwayat perubahan assignment tersimpan di audit log.

---

## Scope

**Backend:**
- Tambah kolom `assignedToId` (nullable) di tabel `orders` → relasi ke tabel `users`
- `GET /api/orders` — respons list menyertakan `assignedTo: { id, name } | null`
- `GET /api/orders/:id` — respons detail menyertakan `assignedTo`
- `PATCH /api/orders/:id` — terima field `assignedToId` (UUID user aktif, atau `null` untuk unassign)
- `GET /api/orders?assignedToId=<uuid>` — filter list berdasarkan staf yang ditugaskan
- Audit log mencatat perubahan assignment (before/after `assignedToId`)

**Frontend:**
- Dropdown assignment di `OrderDetailPage` (hanya tampil saat status mengizinkan edit)
- Filter staf di `OrderListPage`

## Out of Scope

- Assignment ke banyak staf sekaligus (Post-MVP)
- Riwayat assignment per order di luar audit log (Post-MVP)
- Time tracking atau metrik produktivitas (Post-MVP)
- Tampilan beban kerja staf (gunakan filter `OrderListPage` saja; tidak perlu halaman khusus)

## Dependencies

TASK-032, TASK-035 — `GET /api/users` sudah tersedia dan dibutuhkan oleh dropdown assignment

---

## Memahami Arsitektur yang Ada

Sebelum mulai coding, pahami pola yang sudah ada di project ini:

### Pola Backend (Express + Prisma + TypeScript)

```
backend/src/modules/orders/
├── orders.schemas.ts    ← Validasi input dengan Zod (tipe data & aturan)
├── orders.rules.ts      ← Business rules: state machine, guard
├── orders.service.ts    ← Logic utama: query DB, validasi bisnis, audit
├── orders.handlers.ts   ← HTTP handlers: parse req, panggil service, kirim res
└── orders.router.ts     ← Routing: pasang handler ke path/method
```

**Cara kerja satu request:**
```
HTTP Request
    → Router (orders.router.ts)
    → Handler (orders.handlers.ts) — parse req.body / req.params / req.query
    → Service (orders.service.ts) — logic, validasi, DB, audit
    → Prisma (DB)
    → sendSuccess(res, data)
```

**Error handling:** Semua error dilempar sebagai class tertentu (`BusinessRuleViolationError`, `NotFoundError`, dll.) lalu ditangkap oleh middleware global — kamu **tidak** perlu try/catch manual di service.

**Transaksi DB:** Setiap operasi yang mengubah lebih dari satu tabel dibungkus `prisma.$transaction(async (tx) => { ... })`. Audit log juga ditulis di dalam transaksi yang sama.

### Pola Frontend (React + TypeScript + shadcn/ui)

```
frontend/src/features/orders/
├── types/orders.types.ts   ← Interface TypeScript untuk data order
├── api/orders.api.ts       ← Fungsi fetch ke backend
├── constants/orderRules.ts ← Konstanta & helper format
├── pages/
│   ├── OrderListPage.tsx   ← Halaman daftar order + filter
│   └── OrderDetailPage.tsx ← Halaman detail order
└── components/
    └── OrderEditMetadataDialog.tsx  ← Contoh pola dialog edit (ikuti ini)
```

---

## Business Rules (Aturan Bisnis)

1. **User aktif saja:** `assignedToId` harus merujuk user dengan `isActive = true`. Jika user tidak aktif → `409 BUSINESS_RULE_VIOLATION`.
2. **Unassign bebas:** Set `assignedToId: null` selalu boleh selama status order mengizinkan edit.
3. **Status order:** Assignment hanya boleh diubah saat status `DRAFT`, `CONFIRMED`, atau `IN_PROGRESS`. Mencoba assign order dengan status `FITTING`, `REVISION`, `READY`, dll. → `409`.
4. **Audit log:** Setiap perubahan assignment dicatat dengan `before: { assignedToId }` dan `after: { assignedToId }`.

> **Catatan:** Di `updateOrder` yang sudah ada, status yang boleh diubah adalah `DRAFT | CONFIRMED`. Task ini memperluas **khusus untuk `assignedToId`** ke `DRAFT | CONFIRMED | IN_PROGRESS`. Field lain (pricing, deadline) tetap hanya boleh diubah di `DRAFT | CONFIRMED`.

---

## Database Changes

### Apa yang perlu diubah di `schema.prisma`

**File:** `backend/prisma/schema.prisma`

**Model `Order`** — tambahkan 2 baris field dan 1 baris di blok `@@index`:

```prisma
model Order {
  // ... field yang sudah ada (jangan diubah) ...

  // TAMBAHKAN INI (setelah field `notes`, sebelum `cancelledAt`):
  assignedToId         String?                    @map("assigned_to_id") @db.Uuid
  assignedTo           User?                      @relation("OrderAssignment", fields: [assignedToId], references: [id], onDelete: SetNull)

  // ... relasi yang sudah ada (jangan diubah) ...

  // TAMBAHKAN DI BLOK INDEX (setelah @@index([status])):
  @@index([assignedToId])
}
```

**Penjelasan:**
- `String?` → nullable, boleh null (null = belum ditugaskan)
- `@map("assigned_to_id")` → nama kolom di database menjadi snake_case
- `@db.Uuid` → tipe kolom PostgreSQL adalah UUID
- `onDelete: SetNull` → jika user dihapus, field ini otomatis jadi null
- `@@index([assignedToId])` → indeks DB untuk mempercepat query filter by staff

**Model `User`** — tambahkan inverse relation (satu baris, setelah `auditLogs`):

```prisma
model User {
  // ... field yang sudah ada ...

  // TAMBAHKAN INI (setelah baris auditLogs):
  assignedOrders       Order[]                    @relation("OrderAssignment")
}
```

> **Kenapa harus ada di dua sisi?** Prisma mengharuskan relasi didefinisikan di kedua model. `Order` menyimpan foreign key-nya (`assignedToId`), sedangkan `User` hanya mendapat array balik (`assignedOrders`) untuk navigasi — tidak menambah kolom baru di tabel `users`.

### Membuat Migration

Setelah schema diubah, jalankan dari direktori `backend/`:

```bash
npx prisma migrate dev --name add_order_assigned_to
```

Prisma akan generate SQL migration secara otomatis. Cukup jalankan sekali.

---

## Langkah-langkah Implementasi (Step by Step)

### STEP 1 — Backend: Update Prisma Schema & Migration

1. Edit `backend/prisma/schema.prisma` seperti yang dijelaskan di bagian **Database Changes** di atas.
2. Jalankan `npx prisma migrate dev --name add_order_assigned_to` dari direktori `backend/`.
3. Pastikan tidak ada error. Jika ada error relasi, pastikan nama `"OrderAssignment"` persis sama di kedua model.

---

### STEP 2 — Backend: Update Zod Schema (`orders.schemas.ts`)

**File:** `backend/src/modules/orders/orders.schemas.ts`

Ada **dua tempat** yang perlu diubah:

**a) Tambah field ke `updateOrderSchema`** — tambahkan satu baris `assignedToId` sebelum penutup `.object({...})`:

```typescript
// Di dalam updateOrderSchema, tambahkan:
assignedToId: z.string().uuid("Invalid user ID format").nullable().optional()
```

> `z.string().uuid()` memvalidasi format UUID. `.nullable()` artinya boleh `null`. `.optional()` artinya field boleh tidak ada sama sekali di request body.

**b) Tambah field ke `listOrdersQuerySchema`** — tambahkan satu baris `assignedToId` sebelum `page`:

```typescript
// Di dalam listOrdersQuerySchema, tambahkan:
assignedToId: z.string().uuid().optional()
```

---

### STEP 3 — Backend: Update Service (`orders.service.ts`)

**File:** `backend/src/modules/orders/orders.service.ts`

Ada **tiga fungsi** yang perlu diubah:

---

#### 3a. `updateOrder` — Validasi & simpan assignment

Fungsi ini sudah ada. Kamu perlu:
1. Perluas pengecekan status agar `assignedToId` boleh diubah di `IN_PROGRESS`
2. Validasi bahwa user yang di-assign aktif
3. Simpan perubahan ke DB
4. Catat `assignedToId` di audit log

**Ganti blok pengecekan status** (cari `order.status !== "DRAFT" && order.status !== "CONFIRMED"`):

```typescript
// Field pricing/deadline hanya boleh diubah di DRAFT atau CONFIRMED
const isFullyEditable = order.status === "DRAFT" || order.status === "CONFIRMED";
// Assignment boleh diubah di DRAFT, CONFIRMED, atau IN_PROGRESS
const isAssignable = isFullyEditable || order.status === "IN_PROGRESS";

// Cek jika ada field selain assignedToId yang mau diubah
const hasNonAssignmentChanges = Object.keys(input).some(
  (k) => k !== "assignedToId" && input[k as keyof typeof input] !== undefined
);
if (hasNonAssignmentChanges && !isFullyEditable) {
  throw new BusinessRuleViolationError(
    `Order can only be modified when in DRAFT or CONFIRMED status (current: ${order.status})`
  );
}
if ("assignedToId" in input && input.assignedToId !== undefined && !isAssignable) {
  throw new BusinessRuleViolationError(
    `Assignment can only be changed when order is in DRAFT, CONFIRMED, or IN_PROGRESS status (current: ${order.status})`
  );
}
```

**Tambahkan validasi user aktif** — di dalam transaksi, sebelum `tx.order.update`:

```typescript
// Validasi assignedToId jika ada di input
let resolvedAssignedToId: string | null | undefined = undefined; // undefined = tidak diubah
if ("assignedToId" in input) {
  if (input.assignedToId === null) {
    resolvedAssignedToId = null; // Unassign
  } else if (input.assignedToId) {
    const assignee = await tx.user.findUnique({ where: { id: input.assignedToId } });
    if (!assignee) {
      throw new NotFoundError(`User not found: ${input.assignedToId}`);
    }
    if (!assignee.isActive) {
      throw new BusinessRuleViolationError(
        `Cannot assign order to an inactive user: ${assignee.name}`
      );
    }
    resolvedAssignedToId = assignee.id;
  }
}
```

**Tambahkan ke `updateData`** — setelah blok `updateData` yang ada:

```typescript
if (resolvedAssignedToId !== undefined) {
  updateData.assignedTo = resolvedAssignedToId === null
    ? { disconnect: true }
    : { connect: { id: resolvedAssignedToId } };
}
```

**Tambahkan `assignedTo: true` di blok `include`** pada `tx.order.update`:

```typescript
include: {
  customer: true,
  assignedTo: true,   // ← TAMBAHKAN INI
  items: { include: { garmentType: true } },
  measurementSnapshots: { where: { supersededByResnapshotAt: null }, include: { values: true } },
  statusHistories: true
}
```

**Tambahkan `assignedToId` ke audit log** (di blok `recordAudit` yang sudah ada):

```typescript
before: {
  // ... field yang sudah ada ...
  assignedToId: order.assignedToId   // ← TAMBAHKAN INI
},
after: {
  // ... field yang sudah ada ...
  assignedToId: updatedOrder.assignedToId   // ← TAMBAHKAN INI
}
```

---

#### 3b. `listOrders` — Tambah filter `assignedToId`

Di dalam fungsi `listOrders`, tambahkan filter setelah blok `if (query.q) { ... }`:

```typescript
if (query.assignedToId) {
  where.assignedToId = query.assignedToId;
}
```

Tambahkan `assignedTo` di blok `include` pada `prisma.order.findMany`:

```typescript
include: {
  customer: true,
  assignedTo: {
    select: { id: true, name: true }
  },
  items: { include: { garmentType: true } }
}
```

---

#### 3c. `getOrderById` — Sertakan `assignedTo` di respons detail

Di dalam `db.order.findUnique` (fungsi `getOrderById`), tambahkan `assignedTo` di blok `include`:

```typescript
include: {
  customer: true,
  assignedTo: {
    select: { id: true, name: true }
  },
  // ... include lainnya (jangan diubah) ...
}
```

---

### STEP 4 — Frontend: Update TypeScript Types

**File:** `frontend/src/features/orders/types/orders.types.ts`

**a) Tambah interface `AssignedStaff`** (letakkan sebelum interface `Order`):

```typescript
export interface AssignedStaff {
  id: string;
  name: string;
}
```

**b) Tambah field ke interface `Order`:**

```typescript
export interface Order {
  // ... field yang sudah ada ...
  assignedToId?: string | null;
  assignedTo?: AssignedStaff | null;
  // ... relasi yang sudah ada ...
}
```

**c) Tambah `assignedToId` ke `UpdateOrderInput`:**

```typescript
export interface UpdateOrderInput {
  // ... field yang sudah ada ...
  assignedToId?: string | null;
}
```

**d) Tambah `assignedToId` ke `ListOrdersQueryParams`:**

```typescript
export interface ListOrdersQueryParams {
  // ... field yang sudah ada ...
  assignedToId?: string;
}
```

---

### STEP 5 — Frontend: Update API Client (`orders.api.ts`)

**File:** `frontend/src/features/orders/api/orders.api.ts`

Di fungsi `fetchOrders`, tambahkan `assignedToId` ke query string (setelah params yang sudah ada):

```typescript
if (params.assignedToId) {
  query.set('assignedToId', params.assignedToId);
}
```

---

### STEP 6 — Frontend: Buat Komponen `AssignmentDropdown.tsx` (NEW)

**File baru:** `frontend/src/features/orders/components/AssignmentDropdown.tsx`

Komponen ini: fetch daftar user aktif dari `GET /api/users`, render dropdown, dan panggil `PATCH /api/orders/:id` saat berubah.

Ikuti pola `OrderEditMetadataDialog.tsx` yang sudah ada. Contoh implementasi:

```typescript
import React, { useEffect, useState } from 'react';
import { Loader2, UserCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '../../../lib/apiClient.ts';
import { updateOrder } from '../api/orders.api.ts';
import type { Order } from '../types/orders.types.ts';

interface UserOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface AssignmentDropdownProps {
  order: Order;
  onSuccess: (updated: Order) => void;
}

export const AssignmentDropdown: React.FC<AssignmentDropdownProps> = ({ order, onSuccess }) => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<UserOption[]>('/users')
      .then((data) => setUsers(data.filter((u) => u.isActive)))
      .catch(() => setError('Gagal memuat daftar staf'))
      .finally(() => setLoadingUsers(false));
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const assignedToId = value === '' ? null : value;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOrder(order.id, { assignedToId });
      onSuccess(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah penugasan');
    } finally {
      setSaving(false);
    }
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        <span>Memuat staf...</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        <UserCheck className="size-3.5" />
        Assigned Tailor
      </Label>
      {error && (
        <Alert variant="destructive" className="py-1.5 px-2.5">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      <select
        id="select-order-assignee"
        value={order.assignedToId ?? ''}
        onChange={handleChange}
        disabled={saving}
        className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      >
        <option value="">— Unassigned —</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      {saving && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" /> Menyimpan...
        </p>
      )}
    </div>
  );
};
```

---

### STEP 7 — Frontend: Update `OrderDetailPage.tsx`

**File:** `frontend/src/features/orders/pages/OrderDetailPage.tsx`

**a) Import komponen baru** — tambahkan di bagian import:

```typescript
import { AssignmentDropdown } from '../components/AssignmentDropdown.tsx';
```

**b) Tentukan kapan assignment boleh diedit** — tambahkan di dalam komponen setelah `const isModifiable = ...`:

```typescript
// Assignment boleh diubah saat DRAFT, CONFIRMED, atau IN_PROGRESS
const isAssignable =
  order.status === 'DRAFT' ||
  order.status === 'CONFIRMED' ||
  order.status === 'IN_PROGRESS';
```

**c) Render `AssignmentDropdown`** — tambahkan di kolom kanan (bagian `Right 1 Column`), setelah `OrderHistoryTimeline`:

```tsx
{/* Staff Assignment */}
<div className="rounded-lg border border-border bg-card p-4 space-y-3">
  <h3 className="text-sm font-semibold text-foreground">Penugasan Staf</h3>
  {isAssignable ? (
    <AssignmentDropdown
      order={order}
      onSuccess={(updated) => setOrder(updated)}
    />
  ) : (
    <div>
      <p className="text-xs text-muted-foreground">Assigned Tailor</p>
      <p className="text-sm font-medium text-foreground mt-0.5">
        {order.assignedTo?.name ?? '—'}
      </p>
    </div>
  )}
</div>
```

---

### STEP 8 — Frontend: Update `OrderListPage.tsx`

**File:** `frontend/src/features/orders/pages/OrderListPage.tsx`

**a) Tambah import `apiClient`:**

```typescript
import { apiClient } from '../../../lib/apiClient.ts';
```

**b) Tambah state untuk filter staf** — di antara state yang sudah ada:

```typescript
const [assignedToFilter, setAssignedToFilter] = useState('');
const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
```

**c) Fetch daftar staf saat mount** — tambahkan `useEffect` baru:

```typescript
useEffect(() => {
  apiClient.get<{ id: string; name: string; isActive: boolean }[]>('/users')
    .then((data) => setStaffList(data.filter((u) => u.isActive)))
    .catch(() => {/* gagal diam-diam */});
}, []);
```

**d) Sertakan `assignedToId` di `loadOrders`** — tambahkan parameter baru dan kirim ke `fetchOrders`:

```typescript
// Tambahkan staffId sebagai parameter ke loadOrders
const loadOrders = async (page, q, status, after, before, staffId: string) => {
  const res = await fetchOrders({
    // ... params yang sudah ada ...
    assignedToId: staffId || undefined,   // ← TAMBAHKAN INI
  });
  // ...
};

// Update useEffect yang memanggil loadOrders:
useEffect(() => {
  loadOrders(meta.page, debouncedQuery, statusFilter, dueAfter, dueBefore, assignedToFilter);
}, [meta.page, debouncedQuery, statusFilter, dueAfter, dueBefore, assignedToFilter]);
```

**e) Update `handleClearFilters` dan `hasActiveFilters`:**

```typescript
const handleClearFilters = () => {
  // ... yang sudah ada ...
  setAssignedToFilter('');   // ← TAMBAHKAN
};

const hasActiveFilters =
  Boolean(debouncedQuery) || Boolean(statusFilter) ||
  Boolean(dueAfter) || Boolean(dueBefore) ||
  Boolean(assignedToFilter);   // ← TAMBAHKAN
```

**f) Tambah UI filter staf** di toolbar filter (setelah filter Status):

```tsx
{staffList.length > 0 && (
  <div>
    <select
      value={assignedToFilter}
      onChange={(e) => {
        setAssignedToFilter(e.target.value);
        setMeta((prev) => ({ ...prev, page: 1 }));
      }}
      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      id="select-filter-assigned-to"
    >
      <option value="">All Staff</option>
      {staffList.map((u) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>
  </div>
)}
```

**g) Tampilkan assignee di tabel** — tambahkan kolom `Assigned To` di `<TableHead>` dan `<TableCell>` dengan nilai `order.assignedTo?.name ?? '—'`.

---

### STEP 9 — Update `plans/database/ERD.md`

Tambahkan field `assigned_to_id UUID FK NULL` di entitas `Order`, dan tambahkan relasi ke entitas `User`.

---

## Urutan Pengerjaan yang Disarankan

```
1. Prisma Schema → 2. Migration → 3. orders.schemas.ts
4. orders.service.ts (updateOrder + listOrders + getOrderById)
5. Frontend: types → api → AssignmentDropdown.tsx
6. OrderDetailPage.tsx → OrderListPage.tsx → ERD.md
7. Integration Tests
```

Selesaikan backend dulu dan uji manual via curl/Postman, baru lanjut ke frontend.

---

## Files / Modules

| File | Aksi |
|------|------|
| `backend/prisma/schema.prisma` | Modify — tambah `assignedToId` di Order + inverse di User |
| `backend/prisma/migrations/` | Auto-generate via `prisma migrate dev` |
| `backend/src/modules/orders/orders.schemas.ts` | Modify — tambah `assignedToId` di 2 schema |
| `backend/src/modules/orders/orders.service.ts` | Modify — validasi user aktif, filter, include `assignedTo` |
| `frontend/src/features/orders/types/orders.types.ts` | Modify — tambah field `assignedToId`, `assignedTo`, update input types |
| `frontend/src/features/orders/api/orders.api.ts` | Modify — tambah `assignedToId` ke query params |
| `frontend/src/features/orders/components/AssignmentDropdown.tsx` | **NEW** — dropdown pilih staf |
| `frontend/src/features/orders/pages/OrderDetailPage.tsx` | Modify — render `AssignmentDropdown` |
| `frontend/src/features/orders/pages/OrderListPage.tsx` | Modify — tambah filter staf |
| `plans/database/ERD.md` | Modify — update entitas Order |

---

## Validation (Manual Testing)

Setelah implementasi selesai, verifikasi semua skenario ini:

| Skenario | Expected |
|----------|----------|
| Assign order ke user **aktif** via `PATCH /api/orders/:id` | `200 OK`, respons mengandung `assignedTo: { id, name }` |
| Assign order ke user **tidak aktif** | `409 BUSINESS_RULE_VIOLATION` |
| Assign order ke user ID yang **tidak ada** | `404 Not Found` |
| Assign order status **`FITTING`** | `409 BUSINESS_RULE_VIOLATION` |
| Assign order status **`IN_PROGRESS`** | `200 OK` (diizinkan) |
| Unassign (`assignedToId: null`) | `200 OK`, respons mengandung `assignedTo: null` |
| `GET /api/orders?assignedToId=<uuid>` | Hanya order yang ditugaskan ke user tersebut |
| `GET /api/orders/:id` setelah assign | `assignedTo: { id, name }` ada di respons |
| Audit log setelah perubahan | Entri dengan `before.assignedToId` dan `after.assignedToId` |
| Dropdown di `OrderDetailPage` (status `IN_PROGRESS`) | Tampil, bisa dipilih |
| Dropdown di `OrderDetailPage` (status `READY`) | Tidak bisa diubah, hanya tampil nama staf |
| Filter staf di `OrderListPage` | Hanya order dengan assignee tersebut |

---

## Integration Tests

Ikuti pola yang sudah ada di `backend/src/modules/orders/orders.test.ts`. Tambahkan test suite baru atau buat file terpisah `orders.assignment.test.ts`.

Minimal test yang harus ada:

```typescript
// Test 1: Assign ke user aktif → 200 + assignedTo.id === userId
// Test 2: Assign ke user tidak aktif → 409
// Test 3: Assign ke order status FITTING → 409
// Test 4: Unassign (assignedToId: null) → 200 + assignedTo: null
// Test 5: GET /api/orders?assignedToId= → hanya order yang ditugaskan
// Test 6: Audit log mencatat perubahan (before/after assignedToId)
```

Jalankan dengan:

```bash
cd backend
npm test
```

---

## Acceptance Criteria

- [ ] Order bisa di-assign dan di-unassign via `OrderDetailPage`
- [ ] Filter staf di halaman daftar order berjalan dengan benar
- [ ] Hanya user aktif yang bisa di-assign
- [ ] Assign user tidak aktif → `409`
- [ ] Assign order status `FITTING`/`REVISION`/`READY` → `409`
- [ ] Audit log mencatat perubahan assignment

## Definition of Done

- [ ] Implementasi lengkap (backend + frontend)
- [ ] Migration dibuat dan sudah di-apply
- [ ] Integration tests: assign valid, assign user tidak aktif (409), assign status terlarang (409), unassign, filter
- [ ] `plans/database/ERD.md` diperbarui
- [ ] Semua test yang sudah ada tetap passing

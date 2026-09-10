# Panduan Desain & Standar UI Frontend (Shadcn UI First)

Dokumen ini adalah acuan baku dan wajib dipatuhi untuk seluruh pembuatan antarmuka (UI) pada aplikasi frontend butik.

---

## 1. Prinsip Utama (The Golden Rules)

1. **Strictly Shadcn UI — Dilarang Membuat UI Sendiri**
   - **TIDAK BOLEH** membuat komponen UI kustom dari nol (*scratch*) jika komponen tersebut sudah disediakan oleh shadcn UI.
   - Selalu cek ketersediaan komponen di katalog resmi shadcn UI sebelum mulai mendesain tampilan.

2. **Komponen As-Is (Tinggal Pakai, Jangan Diubah-Ubah)**
   - Komponen yang telah di-generate oleh CLI ke dalam `src/components/ui/` digunakan apa adanya (*as-is*).
   - **Dilarang** memodifikasi kode internal, styling default, atau varian bawaan komponen shadcn kecuali jika ada perbaikan bug teknis yang kritis.
   - Manfaatkan *props* dan *variant* bawaan yang telah disediakan (misal: `variant="default" | "outline" | "secondary" | "ghost"` pada Button).

3. **Warna & Font Terkunci (Preset `b84ofqjutM`)**
   - Proyek ini telah diinisialisasi menggunakan preset resmi:
     ```bash
     npx shadcn@latest init --preset b84ofqjutM --template vite
     ```
   - Seluruh variabel warna, radius, dan tipografi sudah dikonfigurasi secara lengkap di [`src/index.css`](file:///c:/Users/Muharits/programmer/butik/frontend/src/index.css).
   - **Dilarang keras** mengedit kembali palette warna di `src/index.css` atau melakukan hardcode warna kustom (seperti `bg-[#... ]` atau `text-blue-500`).
   - Cukup gunakan *semantic color tokens* Tailwind bawaan shadcn (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, dll.).

4. **Tugas Pengembang: Hanya Mengatur Peletakan Layout**
   - Fokus pekerjaan UI hanya pada **komposisi dan peletakan layout** (struktur Grid, Flexbox, Spacing, Padding, Alignment, dan Responsivitas).
   - Peletakan layout pun wajib mengacu pada pola layout standar shadcn (seperti Dashboard layout, Card grid, Standard Header, dan Sidebar).

---

## 2. Fondasi Desain & Token Sistem

### A. Tipografi
Konfigurasi font telah terpasang secara otomatis:
- **Body / Sans:** `'Inter Variable', sans-serif` (`font-sans`) — digunakan sebagai font default aplikasi.
- **Heading:** `'EB Garamond Variable', serif` (`font-heading`) — digunakan untuk aksen judul atau heading butik yang membutuhkan kesan elegan/premium.

### B. Semantic Color Tokens
Gunakan hanya semantic tokens berikut, tanpa perlu mendefinisikan warna baru:

| Token Tailwind | Fungsi / Penggunaan |
| :--- | :--- |
| `bg-background` / `text-foreground` | Latar belakang halaman utama & teks standar |
| `bg-card` / `text-card-foreground` | Latar belakang kartu kontainer (*Card*) |
| `bg-popover` / `text-popover-foreground` | Elemen melayang seperti dialog, popover, dropdown |
| `bg-primary` / `text-primary-foreground` | Aksi utama, tombol CTA, elemen penekanan |
| `bg-secondary` / `text-secondary-foreground` | Aksi sekunder, tombol alternatif |
| `bg-muted` / `text-muted-foreground` | Latar belakang redup, label sekunder, deskripsi bantuan |
| `bg-accent` / `text-accent-foreground` | Efek hover item, status terpilih |
| `bg-destructive` / `text-destructive` | Peringatan bahaya, aksi hapus, pesan galat |
| `border-border` / `border-input` | Garis batas (*border*) kontainer dan input |
| `ring-ring` | Garis fokus aksesibilitas (*focus ring*) |
| `bg-sidebar` / `text-sidebar-foreground` | Variabel khusus untuk layout navigasi sidebar |

*Catatan: Sistem tema telah mendukung Dark Mode secara otomatis via class `.dark` tanpa perlu menulis ulang styling warna.*

---

## 3. Workflow Pembuatan & Penambahan Komponen

Ketika membutuhkan elemen antarmuka baru pada halaman atau fitur:

1. **Cek Kebutuhan Komponen:**
   Identifikasi komponen apa yang dibutuhkan (misal: Card, Dialog, Table, Form, Input, Select, Sheet, Tabs, Avatar, Badge, DropdownMenu).

2. **Pasang via Shadcn CLI:**
   Jalankan perintah instalasi shadcn langsung dari direktori `frontend/`:
   ```bash
   npx shadcn@latest add <nama-komponen>
   ```
   *Contoh:*
   ```bash
   npx shadcn@latest add card dialog table input label select dropdown-menu
   ```

3. **Import & Gunakan Langsung:**
   Import komponen dari alias `@/components/ui/<nama-komponen>`:
   ```tsx
   import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
   import { Button } from "@/components/ui/button"
   ```

4. **Icons:**
   Gunakan icon dari pustaka **`lucide-react`** yang sudah terpasang.
   ```tsx
   import { Plus, Search, Trash2, Edit } from "lucide-react"
   ```

---

## 4. Checklist Kepatuhan UI (Compliance Checklist)

Sebelum memfinalisasi tampilan antarmuka, pastikan checklist ini terpenuhi:

- [ ] Tidak ada komponen UI umum yang dibuat secara manual (*re-inventing the wheel*).
- [ ] Komponen baru diinstal via `npx shadcn@latest add <nama>`.
- [ ] Komponen di `src/components/ui/` tidak dimodifikasi kode internalnya.
- [ ] Tidak ada hardcoded color hex (`#...`) atau arbitrary color Tailwind (`bg-amber-400`, `text-slate-800`, dll).
- [ ] Semua pewarnaan murni memanfaatkan variabel semantik (`primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `card`, dll).
- [ ] Layout menggunakan pola standar shadcn dengan flex/grid dan spacing yang konsisten.
- [ ] Ikon menggunakan `lucide-react`.

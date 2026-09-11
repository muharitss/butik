# JahitFlow — Deployment & Operations Guide

## 1. Overview & Architecture

JahitFlow is a modular monolith designed for a single boutique tailoring shop:
- **Backend**: Node.js + Express + Prisma ORM (Docker container or direct Node runtime).
- **Frontend**: Vite + React single-page application (static asset bundle hosted on CDN, Nginx, or static hosting service).
- **Database**: PostgreSQL 16+ with UUID primary keys and partial unique indexes.
- **Media Storage**: Cloudinary (direct client upload with backend signed signature).

---

## 2. Environment Configuration

Secrets and environment variables are never committed to version control (`.gitignore` enforces this).

### Backend (`backend/.env`)

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `PORT` | No | `4000` | HTTP port for Express server |
| `NODE_ENV` | Yes | `production` | Environment mode (`development`, `test`, `production`) |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/jahitflow?schema=public` | PostgreSQL connection string |
| `CORS_ORIGIN` | Yes | `https://jahitflow.yourdomain.com` | Allowed browser origins (comma-separated) |
| `RATE_LIMIT_MAX_WRITES` | No | `120` | Max mutating requests (POST/PATCH/PUT/DELETE) per IP per window |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` (15m) | Rate limiting window duration in ms |
| `CLOUDINARY_URL` | Yes | `cloudinary://<api_key>:<api_secret>@<cloud_name>` | Cloudinary API access credentials |
| `CLOUDINARY_CLOUD_NAME`| Optional | `screenshottugas` | Separate credential param |
| `CLOUDINARY_API_KEY` | Optional | `123456789` | Separate credential param |
| `CLOUDINARY_API_SECRET` | Optional | `your_secret` | Separate credential param |
| `CLOUDINARY_FOLDER_PREFIX`| No | `jahitflow` | Base folder path for order attachments |

### Frontend (`frontend/.env`)

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `/api` or `https://api.jahitflow.yourdomain.com/api` | Base URL for API requests |

---

## 3. Database Migration & Initialization

Prisma Migrate is the sole mechanism for database schema changes. Direct manual DDL is prohibited.

### 3.1 Fresh Database Deployment
1. Ensure the PostgreSQL instance is running and accessible.
2. Run database migrations to current schema:
   ```bash
   npm run migrate:deploy
   # or directly: npx prisma migrate deploy
   ```
3. Seed the initial operator account:
   ```bash
   npm run db:seed
   ```
4. Verify database constraints and tables:
   ```bash
   npm run db:check
   ```

### 3.2 Ongoing Schema Updates
When new migrations are created:
```bash
npx prisma migrate deploy
```
This applies pending migrations transactionally without prompting.

---

## 4. Automated Daily Backups

A disaster-recovery backup routine is required for boutique financial, customer, and order data.

### 4.1 Backup Scripts
Two automated backup scripts are provided in `scripts/`:
- `scripts/backup-db.sh` — Bash script for Linux/macOS/container environments.
- `scripts/backup-db.ps1` — PowerShell script for Windows Server environments.

Both scripts:
1. Generate timestamped, compressed PostgreSQL dumps: `jahitflow_backup_YYYYMMDD_HHMMSS.sql.gz`.
2. Clean up backups older than the retention threshold (default: 14 days).

### 4.2 Linux / Cron Setup
To schedule daily backups at 02:00 AM:
```bash
# Open crontab
crontab -e

# Add daily backup entry:
0 2 * * * cd /opt/jahitflow && DATABASE_URL="postgresql://user:pass@localhost:5432/jahitflow?schema=public" ./scripts/backup-db.sh >> /var/log/jahitflow-backup.log 2>&1
```

### 4.3 Windows Task Scheduler
```powershell
# Run once daily via Task Scheduler:
powershell.exe -ExecutionPolicy Bypass -File C:\jahitflow\scripts\backup-db.ps1 -BackupDir C:\jahitflow\backups -RetentionDays 14
```

### 4.4 Managed Hosting Alternative
If using managed PostgreSQL (e.g. AWS RDS, DigitalOcean Managed Databases, Supabase, Neon):
- Automated point-in-time recovery and daily snapshots are enabled in the hosting provider dashboard.
- The local backup script serves as a secondary off-site backup.

---

## 5. Deployment Options

### Option A: Docker Compose (Recommended for single VM / VPS)
From repository root:
```bash
docker compose up -d --build
```
This spins up:
1. `jahitflow-postgres`: PostgreSQL 16 container with persistent volume.
2. `jahitflow-backend`: Multi-stage built Node.js 22 runtime on port 4000.

### Option B: Direct Node.js Deployment (PaaS / Systemd)
1. **Backend**:
   ```bash
   cd backend
   npm ci --omit=dev
   npx prisma generate
   npm run build
   npm run migrate:deploy
   node dist/server.js
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm ci
   npm run build
   # Serve dist/ directory with Nginx, Cloudflare Pages, or Vercel
   ```

---

## 6. Security & Hardening Measures

- **Input Validation**: All 13 API modules strictly validate request query, parameters, and bodies via Zod schemas before processing.
- **CORS Protection**: Restricted to configured frontend origins; rejects unauthorized cross-origin requests.
- **Rate Limiting**: Write endpoints (`POST`, `PATCH`, `PUT`, `DELETE`) are throttled (120 req / 15 min per IP) with HTTP 429 responses.
- **PII & Secret Protection**: Structured JSON logger automatically redacts sensitive keys (`password`, `token`, `secret`, `apiKey`, `authorization`, `signature`) and suppresses raw request bodies at `info` level.
- **Attachment Constraints**: File uploads are validated for format (`jpg`, `jpeg`, `png`, `webp`) and capped at 10MB; assets are scoped to `jahitflow/orders/<orderId>/`.
- **Audit Logging**: Every mutation across all domains is transactionally recorded to `audit_logs` with before/after state.

---

## 7. Health & Verification

- **Health Check Endpoint**:
  ```bash
  curl http://localhost:4000/api/health
  # Response: {"data":{"status":"ok"}}
  ```
- **Automated Verification**:
  ```bash
  # Run full backend test suite (unit + integration + constraints + E2E):
  cd backend && npm test

  # Run full frontend check suite:
  cd frontend && npm test
  ```

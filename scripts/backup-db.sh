#!/usr/bin/env bash
# JahitFlow — Automated PostgreSQL Backup Script
# Creates a timestamped, gzip-compressed PostgreSQL database dump and rotates backups older than RETENTION_DAYS.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/jahitflow_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting PostgreSQL backup..."

# Extract DB credentials from DATABASE_URL if available, else use standard PG environment variables
if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump "${DATABASE_URL}" | gzip -c > "${BACKUP_FILE}"
else
  PGHOST="${PGHOST:-localhost}"
  PGPORT="${PGPORT:-5432}"
  PGUSER="${PGUSER:-postgres}"
  PGDATABASE="${PGDATABASE:-jahitflow}"

  pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" "${PGDATABASE}" | gzip -c > "${BACKUP_FILE}"
fi

FILESIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup completed successfully: ${BACKUP_FILE} (${FILESIZE})"

# Retention rotation: purge backups older than retention threshold
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "jahitflow_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup rotation finished."

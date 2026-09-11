# JahitFlow — Automated PostgreSQL Backup Script (PowerShell)
# Creates a timestamped PostgreSQL database dump and rotates backups older than $RetentionDays.

param(
  [string]$BackupDir = "./backups",
  [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "jahitflow_backup_$Timestamp.sql"

Write-Host "[$([DateTime]::UtcNow.ToString('s'))Z] Starting PostgreSQL backup to $BackupFile..."

if ($env:DATABASE_URL) {
  & pg_dump "$env:DATABASE_URL" -f $BackupFile
} else {
  $PgHost = if ($env:PGHOST) { $env:PGHOST } else { "localhost" }
  $PgPort = if ($env:PGPORT) { $env:PGPORT } else { "5432" }
  $PgUser = if ($env:PGUSER) { $env:PGUSER } else { "postgres" }
  $PgDb = if ($env:PGDATABASE) { $env:PGDATABASE } else { "jahitflow" }

  & pg_dump -h $PgHost -p $PgPort -U $PgUser -d $PgDb -f $BackupFile
}

if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile)) {
  $Size = (Get-Item $BackupFile).Length
  Write-Host "[$([DateTime]::UtcNow.ToString('s'))Z] Backup completed successfully: $BackupFile ($Size bytes)"

  # Retention cleanup
  $Threshold = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem -Path $BackupDir -Filter "jahitflow_backup_*.sql" | Where-Object { $_.LastWriteTime -lt $Threshold } | ForEach-Object {
    Write-Host "Removing expired backup: $($_.FullName)"
    Remove-Item $_.FullName -Force
  }
} else {
  Write-Error "Backup failed with exit code $LASTEXITCODE"
  exit 1
}

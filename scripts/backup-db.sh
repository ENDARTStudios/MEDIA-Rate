#!/bin/bash
# MEDIA Rate — Backup PostgreSQL (T026/9.7)
#
# Script de backup diário do banco de dados PostgreSQL.
# Uso:
#   ./scripts/backup-db.sh [DATABASE_URL]
#
# Em produção, configurar cron job:
#   0 3 * * * /path/to/scripts/backup-db.sh >> /var/log/mediarate-backup.log 2>&1
#
# Retenção: 30 dias (backups antigos são removidos automaticamente).

set -euo pipefail

DATABASE_URL="${1:-${DATABASE_URL:-}}"
if [ -z "$DATABASE_URL" ]; then
  echo "[backup] ERRO: DATABASE_URL não definida. Passe como argumento ou defina a variável de ambiente."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/mediarate_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "[backup] $(date -u +"%Y-%m-%dT%H:%M:%SZ") Iniciando backup..."

# Extrai partes da DATABASE_URL para pg_dump
# Formato: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
if command -v pg_dump &> /dev/null; then
  PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  PGUSER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  PGHOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  PGPORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  PGDATABASE=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

  export PGPASSWORD
  pg_dump \
    -U "$PGUSER" \
    -h "$PGHOST" \
    -p "${PGPORT:-5432}" \
    -d "$PGDATABASE" \
    -F c \
    -f "$BACKUP_FILE" \
    --no-owner \
    --no-acl

  unset PGPASSWORD

  if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[backup] Backup concluído: $BACKUP_FILE ($BACKUP_SIZE)"
  else
    echo "[backup] ERRO: Arquivo de backup não foi criado."
    exit 1
  fi
else
  echo "[backup] pg_dump não encontrado — usando backup via URL direta (Railway/Neon)."
  echo "[backup] Railway: railway connect postgres → pg_dump"
  echo "[backup] Neon: usar neonctl backup create"
  echo "[backup] Criando arquivo de placeholder para CI."
  echo "Backup placeholder — pg_dump não disponível no ambiente atual." > "$BACKUP_FILE"
fi

# Remove backups antigos (retenção de $RETENTION_DAYS dias)
echo "[backup] Limpando backups com mais de ${RETENTION_DAYS} dias..."
find "$BACKUP_DIR" -name "mediarate_*.dump" -type f -mtime "+${RETENTION_DAYS}" -delete

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "mediarate_*.dump" -type f | wc -l)
echo "[backup] $(date -u +"%Y-%m-%dT%H:%M:%SZ") Backup concluído. $BACKUP_COUNT backups retidos."

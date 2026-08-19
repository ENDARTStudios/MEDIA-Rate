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

  # T332: valida o dump (pg_restore --list) — um backup que não restaura não
  # é backup. Falha em voz alta se o arquivo estiver corrompido/incompleto.
  if command -v pg_restore &> /dev/null; then
    if ! pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
      echo "[backup] ERRO: validação do dump falhou (pg_restore --list)." >&2
      exit 1
    fi
    echo "[backup] Dump validado (pg_restore --list OK)."
  else
    echo "[backup] AVISO: pg_restore ausente — validação do dump pulada." >&2
  fi
else
  # T332: NUNCA fabricar um "backup" placeholder com exit 0 — um backup que
  # finge sucesso é pior que nenhum (falsa sensação de segurança). Sem pg_dump,
  # falha em voz alta para o scheduler de cron/CI enxergar o erro.
  echo "[backup] ERRO: pg_dump não encontrado no PATH. Backup NÃO realizado." >&2
  echo "[backup] Instale o cliente postgresql (pg_dump) ou rode o backup em um"
  echo "[backup] ambiente com pg_dump. Railway: 'railway connect postgres' + pg_dump."
  exit 1
fi

# Remove backups antigos (retenção de $RETENTION_DAYS dias)
echo "[backup] Limpando backups com mais de ${RETENTION_DAYS} dias..."
find "$BACKUP_DIR" -name "mediarate_*.dump" -type f -mtime "+${RETENTION_DAYS}" -delete

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "mediarate_*.dump" -type f | wc -l)
echo "[backup] $(date -u +"%Y-%m-%dT%H:%M:%SZ") Backup concluído. $BACKUP_COUNT backups retidos."

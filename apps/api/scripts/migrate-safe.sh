#!/bin/bash
# Script de migration segura com backup (T9.4)
#
# Fluxo:
# 1. Faz backup do banco (pg_dump)
# 2. Aplica migration (prisma migrate deploy)
# 3. Verifica status (prisma migrate status)
# 4. Se falhar, restaura backup
#
# Uso: ./scripts/migrate-safe.sh
#
# Requer: DATABASE_URL no .env, pg_dump instalado.

set -euo pipefail

echo "[migrate-safe] Iniciando migration segura..."

# Carrega .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[migrate-safe] ERRO: DATABASE_URL não definida."
  exit 1
fi

BACKUP_DIR="./backups"
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"
mkdir -p "$BACKUP_DIR"

# 1. Backup
echo "[migrate-safe] 1/3 — Fazendo backup..."
if command -v pg_dump &> /dev/null; then
  pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
  echo "[migrate-safe] Backup salvo em: $BACKUP_FILE"
else
  echo "[migrate-safe] pg_dump não disponível — pulando backup (NÃO RECOMENDADO em produção)."
  BACKUP_FILE=""
fi

# 2. Migration
echo "[migrate-safe] 2/3 — Aplicando migration..."
if npx prisma migrate deploy; then
  echo "[migrate-safe] Migration aplicada com sucesso."
else
  echo "[migrate-safe] ERRO: Migration falhou."
  if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
    echo "[migrate-safe] Restaurando backup..."
    psql "$DATABASE_URL" < "$BACKUP_FILE"
    echo "[migrate-safe] Backup restaurado."
  fi
  exit 1
fi

# 3. Verificação
echo "[migrate-safe] 3/3 — Verificando status..."
npx prisma migrate status

echo "[migrate-safe] Concluído com sucesso."
echo "[migrate-safe] Backup disponível em: $BACKUP_FILE"

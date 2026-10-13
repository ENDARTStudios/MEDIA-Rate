#!/bin/bash
# MEDIA Rate — Backup PostgreSQL (T026/9.7, endurecido na T226)
#
# Script de backup do banco de dados PostgreSQL.
# Uso:
#   ./scripts/backup-db.sh [DATABASE_URL]
#
# Em produção, rodar por um agendador NO AMBIENTE DA PLATAFORMA (com acesso à
# rede interna do banco de dados). NÃO usar runner externo/CI: o hostname
# interno do banco não é alcançável de fora (D-527).
#
# Variáveis:
#   DATABASE_URL         (arg 1 ou env) — conexão do banco. NUNCA é logada.
#   BACKUP_DIR           destino do dump (default ./backups). Precisa ser
#                        DURÁVEL (volume montado ou destino persistente).
#   RETENTION_DAYS       retenção local (default 30).
#   BACKUP_UPLOADER      (opcional) caminho de um EXECUTÁVEL chamado com o dump
#                        como $1, para enviar a um destino durável externo
#                        (ex.: um wrapper de `aws s3 cp`). Falha em voz alta se
#                        o upload falhar. Sem ela, o destino é o BACKUP_DIR.
#   BACKUP_STATUS_FILE   (opcional) caminho do arquivo de status SANITIZADO
#                        (JSON: ts/ok/bytes/retidos/uploaded). Consumível por um
#                        futuro alerta de falha (T227). Default: ao lado do dump.
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
BACKUP_UPLOADER="${BACKUP_UPLOADER:-}"
BACKUP_STATUS_FILE="${BACKUP_STATUS_FILE:-${BACKUP_DIR}/backup-status.json}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/mediarate_${TIMESTAMP}.dump"
UPLOADED="false"

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

# T226: envia o dump a um destino DURÁVEL externo, se configurado.
if [ -n "$BACKUP_UPLOADER" ]; then
  if [ ! -x "$BACKUP_UPLOADER" ]; then
    echo "[backup] ERRO: BACKUP_UPLOADER não é executável: $BACKUP_UPLOADER" >&2
    exit 1
  fi
  echo "[backup] Enviando dump ao destino durável (BACKUP_UPLOADER)..."
  if "$BACKUP_UPLOADER" "$BACKUP_FILE"; then
    UPLOADED="true"
    echo "[backup] Upload concluído."
  else
    echo "[backup] ERRO: upload do dump FALHOU — o backup NÃO está em destino durável." >&2
    exit 1
  fi
else
  echo "[backup] AVISO: BACKUP_UPLOADER não configurado — o dump fica apenas em $BACKUP_DIR." >&2
  echo "[backup] AVISO: se $BACKUP_DIR não for um volume DURÁVEL, o backup é PERDIDO em redeploy/restart." >&2
fi

# Remove backups antigos (retenção de $RETENTION_DAYS dias)
echo "[backup] Limpando backups com mais de ${RETENTION_DAYS} dias..."
find "$BACKUP_DIR" -name "mediarate_*.dump" -type f -mtime "+${RETENTION_DAYS}" -delete

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "mediarate_*.dump" -type f | wc -l)
BACKUP_BYTES=$(wc -c < "$BACKUP_FILE" | tr -d ' ')
STATUS_TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# T226: status SANITIZADO (sem conexão, sem credencial, sem PII) — base do
# alerta de falha de backup (T227). A AUSÊNCIA de um `ts` recente é, por si só,
# o sinal de falha (o script sai antes de escrever em qualquer erro).
if mkdir -p "$(dirname "$BACKUP_STATUS_FILE")" 2>/dev/null; then
  printf '{"ts":"%s","ok":true,"bytes":%s,"retidos":%s,"uploaded":%s,"retencaoDias":%s}\n' \
    "$STATUS_TS" "$BACKUP_BYTES" "$BACKUP_COUNT" "$UPLOADED" "$RETENTION_DAYS" \
    > "$BACKUP_STATUS_FILE" 2>/dev/null || true
fi

echo "[backup] $STATUS_TS Backup concluído. $BACKUP_COUNT backups retidos."

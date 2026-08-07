#!/usr/bin/env bash
# ============================================================
# T204 — valida o .env do backend (variáveis obrigatórias presentes).
# Uso: bash scripts/validate-env.sh [caminho-do-.env]   (default: apps/api/.env)
# SEGURANÇA: imprime APENAS nomes de variáveis — nunca valores.
# ============================================================
set -u

ENV_FILE="${1:-apps/api/.env}"

OBRIGATORIAS=(
  DATABASE_URL
  COOKIE_SECRET
  ADMIN_TOKEN
  TMDB_API_KEY
  TWITCH_CLIENT_ID
  TWITCH_CLIENT_SECRET
  COMICVINE_API_KEY
  COLUMN_ENCRYPTION_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  STRIPE_PRICE_PLUS_ID
  STRIPE_PRICE_PREMIUM_ID
)

RECOMENDADAS=(
  OMDB_API_KEY
  OPENCRITIC_API_KEY
  GOOGLE_BOOKS_API_KEY
  STEAMSPY_API_KEY
  TRAKT_CLIENT_ID
  REDIS_URL
  ALLOWED_ORIGINS
  CORS_ORIGIN
  SCRAPE_NUMERICO_ENABLED
  MEDIA_PREPARACAO_ENABLED
  MEDIA_SCORE_JOB_ENABLED
  LOG_LEVEL
  ANALYTICS_WRITE_KEY
  POSTHOG_HOST
)

if [ ! -f "$ENV_FILE" ]; then
  echo "AVISO: arquivo '$ENV_FILE' nao encontrado — listando obrigatorias como faltantes."
  echo "Crie a partir de apps/api/.env.example (cp apps/api/.env.example apps/api/.env)."
  echo ""
fi

FALTANDO_OBR=""
FALTANDO_REC=""

for var in "${OBRIGATORIAS[@]}"; do
  if ! grep -qE "^${var}=.+" "$ENV_FILE" 2>/dev/null; then
    FALTANDO_OBR="${FALTANDO_OBR}  - ${var}\n"
  fi
done

for var in "${RECOMENDADAS[@]}"; do
  if ! grep -qE "^${var}=.+" "$ENV_FILE" 2>/dev/null; then
    FALTANDO_REC="${FALTANDO_REC}  - ${var}\n"
  fi
done

if [ -n "$FALTANDO_OBR" ]; then
  echo "FALTANDO (obrigatorias) em '$ENV_FILE':"
  echo -e "$FALTANDO_OBR"
  echo "O backend nao funciona corretamente sem elas."
  exit 1
fi

if [ -n "$FALTANDO_REC" ]; then
  echo "AUSENTES (recomendadas) em '$ENV_FILE':"
  echo -e "$FALTANDO_REC"
  echo "(opcionais — nao bloqueiam o boot, mas limitam fontes/funcionalidades)"
fi

echo "OK: todas as variaveis obrigatorias presentes em '$ENV_FILE'."
exit 0

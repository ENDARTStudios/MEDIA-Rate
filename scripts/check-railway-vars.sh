#!/usr/bin/env bash
# ============================================================
# T204 — gera a lista exata de variáveis para adicionar no Railway.
# SEGURANÇA: imprime APENAS nomes e instruções — nunca valores reais.
# Uso: bash scripts/check-railway-vars.sh
# ============================================================
set -u

cat <<'EOF'
============================================================
MEDIA RATE — Checklist Railway (API)
Adicione no painel do Railway (Variables) — não use arquivo .env.
Valide depois com: bash scripts/validate-env.sh
============================================================

== OBRIGATORIAS (o backend nao funciona sem elas) ==
  DATABASE_URL            PostgreSQL da plataforma (banco anexado ao service)
  COOKIE_SECRET           openssl rand -hex 32          (boot falha sem ela)
  ADMIN_TOKEN             openssl rand -hex 32          (rotas admin)
  TMDB_API_KEY            https://www.themoviedb.org/settings/api
  TWITCH_CLIENT_ID        https://dev.twitch.tv/console/apps  (IGDB)
  TWITCH_CLIENT_SECRET    idem (IGDB)
  COMICVINE_API_KEY       https://comicvine.gamespot.com/api/
  COLUMN_ENCRYPTION_KEY   openssl rand -base64 32       (LGPD)
  STRIPE_SECRET_KEY       https://dashboard.stripe.com/apikeys
  STRIPE_WEBHOOK_SECRET   Stripe > Developers > Webhooks
  STRIPE_PRICE_PLUS_ID    Stripe > Products (Price ID)
  STRIPE_PRICE_PREMIUM_ID Stripe > Products (Price ID)
  ALLOWED_ORIGINS         URL do frontend (ou CORS_ORIGIN p/ origem unica)

== RECOMENDADAS (funcionalidade — nao bloqueiam o boot) ==
  OMDB_API_KEY / OPENCRITIC_API_KEY / GOOGLE_BOOKS_API_KEY
  STEAMSPY_API_KEY / TRAKT_CLIENT_ID
  REDIS_URL (ou REDIS_HOST / REDIS_PORT / REDIS_PASSWORD)
  MEDIA_SCORE_JOB_ENABLED / MEDIA_SCORE_JOB_TIME / MEDIA_SCORE_JOB_DELAY_MS
  RATE_LIMIT_API_PER_MIN / RATE_LIMIT_LOGIN_PER_MIN  (defaults 100/6)
  SCRAPE_NUMERICO_ENABLED / MEDIA_PREPARACAO_ENABLED
  CSP_TRUSTED_ORIGINS / LOG_LEVEL / ARGON2_SECRET_PEPPER / SESSION_TTL_HOURS
  ANALYTICS_WRITE_KEY / POSTHOG_HOST

== WEB (se o frontend for deploy separado — publicas, NEXT_PUBLIC_*) ==
  NEXT_PUBLIC_API_URL      URL publica da API
  NEXT_PUBLIC_SITE_URL     URL publica do site
  NEXT_PUBLIC_ANALYTICS_WRITE_KEY / NEXT_PUBLIC_POSTHOG_HOST

== NAO LIDAS pelo codigo — podem ser REMOVIDAS do Railway ==
  JWT_SECRET  IGDB_CLIENT_ID  IGDB_CLIENT_SECRET  SESSION_SECRET
  RAWG_API_KEY  STRIPE_PUBLISHABLE_KEY  STRIPE_PRICE_FREE_ID
  TRAKT_CLIENT_SECRET  TRAKT_REDIRECT_URI  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  VERCEL_OIDC_TOKEN

== Seguranca ==
  - Nunca coloque segredos no frontend (apenas NEXT_PUBLIC_* publicas).
  - Rotacione COOKIE_SECRET/ADMIN_TOKEN se ja circularam fora do Railway.
============================================================
EOF

exit 0

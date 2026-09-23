# SETUP — Ambiente de referência (completo)

Quick-start: [ONBOARDING](ONBOARDING.md). Aqui: **referência** de variáveis, portas,
contas e seeds. Tudo dev-local; produção vive em secrets do Railway/Vercel.

## Portas (convenção do projeto)

| Porta | Serviço |
|---|---|
| 3000 | web (Next dev) |
| 4000 | API (Nest/Fastify) — quirk: EACCES eventual no Windows, tentar de novo |
| 5434 | Postgres docker dev (`postgres:16`) |
| 3100/3001 | Loki/Grafana (opcional, `docker compose up -d loki grafana`) |

## Variáveis essenciais (dev)

**API (`apps/api/.env`)** — nomes (valores dev no `.env.example`):
`DATABASE_URL` (localhost:5434), `JWT_SECRET`, `COOKIE_SECRET` (obrigatório em
produção; dev tem fallback), `ALLOWED_ORIGINS`/`CORS_ORIGIN`, `ADMIN_TOKEN`,
`MAIL_PROVIDER`, `MAIL_FROM`, `RESEND_API_KEY` (e-mail real), chaves de catálogo
(`IGDB_*`, `OMDB_API_KEY`, `COMICVINE_API_KEY`, `GOOGLE_BOOKS_API_KEY`,
`MAL_CLIENT_*`, `OPENCRITIC_API_KEY`), opcionais: `SENTRY_DSN`, `LOKI_URL`,
`LOG_LEVEL`, `SWAGGER_ENABLED=true` (docs em `/api/docs`), `R2_*` (assets),
`OTEL_*`, `METRICS_ALLOW_IPS`.

**web (`apps/web/.env.local`)**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_POSTHOG_HOST`,
`NEXT_PUBLIC_ANALYTICS_WRITE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`.
**Dev com API local**: exportar `API_PROXY_TARGET=http://localhost:4000` — sem isso
o SSR valida sessão contra a API de PRODUÇÃO (armadilha histórica).

**E2E (raiz `.env`)**: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` (conta de smoke;
**nunca** em log/commit).

## Banco

```bash
docker run -d --name mediarate-pg -e POSTGRES_USER=mediarate \
  -e POSTGRES_PASSWORD=mediarate_dev -e POSTGRES_DB=mediarate -p 5434:5432 postgres:16
cd apps/api && npx prisma migrate deploy
npm run db:provision:test-users     # free/plus/premium/admin (ver package.json)
# fixture de evidência (5 mídias + interações):
node ../../scripts/evidence-local.mjs   # sobe/derruba tudo sozinho (D-530)
```

## Contas/ferramentas externas (acesso do Operador)

Stripe (billing) · Resend (e-mail) · Railway (API/Postgres) · Vercel (web) ·
PostHog (analytics/flags — CLI com scope `feature_flag:write`) · Sentry (erros) ·
Cloudflare (R2/canário) · Google OAuth console. Receitas de CLI:
`docs/RUNBOOK_OPERADOR_FINAL.md` + `MANUAL_DO_OPERADOR.md`.

## Verificação final do setup

```bash
curl http://localhost:4000/health          # {"status":"ok"}
cd apps/api && NODE_ENV=test npx vitest run # suíte verde = ambiente são
cd ../web && API_PROXY_TARGET=http://localhost:4000 npm run dev  # home 200 em :3000
```

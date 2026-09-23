# ARCHITECTURE — Arquitetura do MEDIA Rate

## Visão geral (monorepo npm)

```
apps/
├── web/   Next.js 16 (App Router, Turbopack, RSC) + next-intl v4  → Vercel
└── api/   NestJS 11 + Fastify 5 + Prisma (PostgreSQL)             → Railway
packages/domain/    (contratos compartilhados, se aplicável)
docs/, scripts/, .github/workflows/
```

## Web (Vercel)

- App Router + React Server Components; i18n por path (`/pt-BR`, `/en-US`, `/es-ES`)
  com `next-intl` v4 — paridade de chaves obrigatória nas 3 línguas (guard no CI).
- Auth no SSR valida sessão contra a API (`API_PROXY_TARGET`).
- OpenNext para build Cloudflare é **informativo** (job `Build OpenNext (CF)`); a
  migração CF é gated pela flag PostHog `cloudflare_migration` (rollout gradual D-507).
- `middleware.ts`: login preserva `pathname + search` no callbackUrl (deep links).
- `LimpezaServiceWorker` desregistra SW estranho da origem (o app NÃO tem SW próprio).

## API (Railway)

- NestJS + Fastify com **logger único** nestjs-pino (`AppLoggerModule`; D-531: NUNCA
  dois loggers de request). Redaction de authorization/cookie/x-csrf-token.
- **Auth**: tokens opacos SHA-256 em cookies httpOnly (`sess`, `csrf_token`, `refresh`);
  argon2id; verificação de e-mail real (Resend); lockout progressivo; Google OAuth.
- **RLS owner-only** no Postgres via `comContextoRls` (set_config por transação).
- **AuditLog** append-only com cadeia SHA-256 (`verificarIntegridade()`).
- **Máquina de estados de consumo**: `common/estados-consumo.ts` fonte única
  (D-528/D-529) — API, UI e E2E rejeitam CONCLUIDO → ABANDONADO.
- **Guards de entrada**: `ZodValidationPipe` (body/query), `UuidParamPipe` (params
  `@db.Uuid` → 404 pré-Prisma, D-531), rate limits por rota (`rate-limit.config.ts`).
- **Métricas**: Prometheus em `/metrics` (RBAC/IP allowlist); alertas T218 em
  `/admin/alerts/status`; Fastify logs → stdout → Railway (Loki opcional).

## Banco (PostgreSQL — Railway)

- Prisma migrations versionadas; **entrypoint do container aplica `migrate deploy` no
  boot de TODO deploy** (D-527). Guarda pré-merge: job `Migration Safety (B1)`
  **required** na ruleset `protect-main` (D-532/D-535) — label `migration-review` +
  plano de rollback + declaração (`docs/b1-prod-guards.md`).
- Soft delete (`Midia.deleted_at`), índices trgm GIN na busca, audit_log append-only.

## Deploy (verdade operacional — D-527)

`main` = produção. Push em `main` dispara **duas** coisas independentes:

1. **Railway (API)**: build + deploy nativo; entrypoint roda migrations.
2. **Vercel (web)**: deploy de produção pela integração Git.

GitHub `deploy.yml` = validação + health check pós-promoção (com retries). Migration
manual = `migrate-production.yml` (workflow_dispatch; caminho de rede é pendência do
Operador — `docs/b1-prod-guards.md` §3). Rollback: `git revert` do merge commit
(nunca force push/reset — D-457 proíbe push direto com bypass em `main`).

## Integrações externas

Stripe (billing) · Resend (e-mail) · Google OAuth · PostHog (analytics/flags, consent) ·
Sentry (erros/tracing, sourcemaps) · Cloudflare R2 (assets) · Catálogos: IGDB, OMDB,
ComicVine, Google Books, MAL, OpenCritic. Detalhes: [INTEGRATIONS](INTEGRATIONS.md).

## Diagrama de fluxo de request (resumo)

```
Browser ──HTTPS──▶ Vercel (web/RSC) ──SSR proxy──▶ Railway API (NestJS)
     └────────────── direto: /api/v1/* (cookies + CSRF double-submit)
Railway API ──▶ Postgres (RLS) · Redis (cache 30-60s) · R2 (assets) · Sentry/PostHog
```

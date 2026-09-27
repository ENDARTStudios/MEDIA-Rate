# API — Contrato REST (v1)

Aprofundamento por módulo: `docs/api/` (auth.md). Swagger local:
`SWAGGER_ENABLED=true` → `http://localhost:4000/api/docs` (+ `/api/docs-json`).
Em produção o Swagger fica **desligado**.

## Base e convenções

- Base: `/api/v1` · JSON · respostas snake_case nas entidades (contrato estável).
- 29 módulos em `apps/api/src/modules/`: admin, auth, consent, curadoria, dashboard,
  diagnostics, discover, discovery, flags, fontes, historico, interacoes, invite,
  lgpd, listas, mailer, media, media-score, metrics, notificacoes, payment, perfil,
  premium, quota, recommendations, relacoes, upload, waitlist-notify, watchlist.

## Autenticação e CSRF

- Cookies httpOnly: `sess` (access opaco 15min sliding), `refresh` (rotativo 30d com
  reuse detection), `csrf_token`.
- **CSRF double-submit**: mutações exigem header `x-csrf-token` = valor do cookie
  `csrf_token` (comparação em tempo constante). Sem isso → 403 CSRF.
- Login exige e-mail verificado (403 `EMAIL_NOT_VERIFIED` até verificar).
- Registro exige `aceitouTermos: true` (422 `TERMS_NOT_ACCEPTED`).

## Endpoints centrais (referência rápida)

| Rota | Método | Notas |
|---|---|---|
| `/health` | GET | Público, sem log (monitor uptime) |
| `/metrics` | GET | Prometheus; IP allowlist OU sessão ADMIN OU `X-Admin-Token` |
| `/api/v1/auth/*` | — | register/login/logout/me/refresh/verify-email/resend-verification/forgot/reset/google/callback |
| `/api/v1/midias` | GET | cursor, filtro tipo, sort; POST/PUT/DELETE admin |
| `/api/v1/search` · `/discover` · `/trending` · `/catalog` | GET | tsquery sanitizada, trgm GIN, cache 30s anônimo (discover) |
| `/api/v1/watchlist` | CRUD | Kanban; `PATCH /:id/move` valida máquina D-528 (inválida → 400) |
| `/api/v1/interacoes` | GET | Envelope `{items, total, porStatus, nextCursor}`; `limit` 1-50; cursor opaco base64url (inválido → 400) |
| `/api/v1/interacoes/:midiaId` | GET/PUT | upsert status+reação; valida D-528 |
| `/api/v1/listas` · `/historico` · `/perfil` · `/quota` · `/notificacoes` | — | CRUDs auxiliares |
| `/api/v1/premium/*` · `/recommendations` | GET | inteligência pessoal (gated por plano) |
| `/api/v1/consent` · LGPD | — | consentimento granular, export/exclusão do titular |
| `/api/v1/payment/*` | — | Stripe checkout (Idempotency-Key) + webhook |

## Validação e erros

- Query/body: `ZodValidationPipe` → 400 com detalhe.
- Params UUID (`:id` da watchlist, `:midiaId` das interações): `UuidParamPipe` →
  **404 pré-Prisma** para formato inválido (nunca 500/P2023) — D-531.
- Envelope de erro: `{statusCode, error, message, correlationId, timestamp}`
  (ver [ERROR_HANDLING](ERROR_HANDLING.md)).

## Rate limits (por rota/usuário)

login 6/min · refresh 10/min · watchlist 30/min · interações PUT 60/min ·
discover/search/recommendations 30/min · upload 10/min. Global do gateway além disso.

## Regras para endpoints novos

1. Zod no body E na query (pipe no parâmetro).
2. Param que mapeia coluna `@db.Uuid` → `UuidParamPipe`.
3. Swagger: `@ApiOperation` + respostas `@Api*Response` **coerentes com o real**
   (lição T028: 404 novo exigia `@ApiNotFoundResponse`).
4. RLS owner-only via `comContextoRls`; nunca expor `tenant_id` (T289).
5. Rate limit no `rate-limit.config.ts` + teste de `JSON.stringify` da resposta.

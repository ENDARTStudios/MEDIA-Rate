# API — Contrato REST (v1)

Aprofundamento por módulo: `docs/04-api-integrations/api/` (auth.md). Swagger local:
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
| `/api/v1/search` · `/discover` · `/trending` · `/catalog` | GET | `q` (≥3 = tsvector `to_tsquery` prefixo; <3 = pg_trgm), `tipo`/`genero` (allowlist), `cursor` keyset, `limit` ≤50; **rate limit 30/min** por rota/IP; resultado retorna o **`slug` canônico** do servidor (link `/media/{slug}` correto). `/search` (legado) delega ao `/discover`. Cache 30s anônimo. |
| `/api/v1/watchlist` | CRUD | Kanban; `PATCH /:id/move` valida máquina D-528 (inválida → 400) |
| `/api/v1/interacoes` | GET | Envelope `{items, total, porStatus, nextCursor}`; `limit` 1-50; cursor opaco base64url (inválido → 400) |
| `/api/v1/interacoes/:midiaId` | GET/PUT | upsert status+reação; valida D-528 |
| `/api/v1/midias/:id/relacoes` | GET/POST/DELETE | Grafo bidirecional de obras relacionadas (ADAPTACAO_DE/SEQUENCIA_DE/PREQUELA_DE/SPINOFF_DE/MESMO_UNIVERSO/MESMA_HISTORIA_REAL); GET público retorna o **slug canônico** de cada obra relacionada (link correto); POST/DELETE `@Roles('ADMIN')` |
| `/api/v1/listas` · `/historico` · `/perfil` · `/quota` · `/notificacoes` | — | CRUDs auxiliares |
| `/api/v1/premium/*` · `/recommendations` | GET | inteligência pessoal (gated por plano) |
| `/api/v1/consent` · LGPD | — | consentimento granular, export/exclusão do titular |
| `/api/v1/payment/*` | — | Stripe checkout (Idempotency-Key) + webhook |

## Estado atual vs. histórico (BETA-GAP-02 / T118)

- `GET /api/v1/user/stats` (dashboard) expõe **métricas de estado atual**:
  `total`, `tipos`, `generos` e `streak` consideram apenas os status
  `QUERO_CONSUMIR`, `CONSUMINDO` e `CONCLUIDO`. `ABANDONADO` **não** entra
  nessas métricas (é estado reclassificável — D-528; a UI o usa como
  "remover do estado atual"). `concluidos`, `evolucao` e `histograma` mantêm a
  semântica anterior.
- `GET /api/v1/interacoes` (`porStatus` / Biblioteca) **preserva** `ABANDONADO`
  como histórico reclassificável — não sofre o filtro do dashboard.

**Como verificar (sem credencial real — usar fixture/usuário de teste):**

1. autenticar um usuário de teste;
2. criar/atualizar uma interação para `ABANDONADO`
   (`PUT /api/v1/interacoes/:midiaId` com `{"status":"ABANDONADO"}`);
3. `GET /api/v1/user/stats` → afirmar que `total`, `tipos`, `generos` e `streak`
   **excluem** o item abandonado;
4. `GET /api/v1/interacoes` → afirmar que `porStatus.ABANDONADO` **continua**
   contando o item (visível/reclassificável na Biblioteca);
5. regressão automatizada: `apps/api/test/dashboard-reactivity.spec.ts`.

## RBAC / Admin (BETA-GAP-03 / T119)

- Acesso admin é por **papel** (`@Roles('ADMIN')` + `RolesGuard` global), **não**
  por plano: `FREE` com papel `ADMIN` acessa; `PREMIUM` sem papel recebe **403**;
  anônimo recebe **401** (AuthGuard). Plano é eixo separado (`PlanGuard` → 402).
- Endpoints admin: `GET /api/v1/admin/stats`, `GET /api/v1/admin/diagnostics`
  (somente leitura; contagens agregadas, sem PII).
- **Sem endpoint público de autopromoção**: papéis são atribuídos por CLI interna
  (`npm run db:set-role` em `apps/api`) — ver
  `docs/05-security-compliance/RBAC.md` e
  `docs/06-devops-deployment/runbooks/admin-role.md`.

**Como verificar:**

1. `cd apps/api && NODE_ENV=test npx vitest run test/admin-rbac.spec.ts`;
2. sessão de usuário comum → `GET /api/v1/admin/stats` = **403**;
3. sessão `FREE`+`ADMIN` → **200**; sessão `PREMIUM` sem `ADMIN` → **403**.

## Validação e erros

- Query/body: `ZodValidationPipe` → 400 com detalhe.
- Params UUID (`:id` da watchlist, `:midiaId` das interações): `UuidParamPipe` →
  **404 pré-Prisma** para formato inválido (nunca 500/P2023) — D-531.
- Envelope de erro: `{statusCode, error, message, correlationId, timestamp}`
  (ver [ERROR_HANDLING](../07-operations-marketing/ERROR_HANDLING.md)).

## Rate limits (por rota/usuário)

register 5/min · login/forgot/reset/resend 6/min · refresh 10/min · watchlist 30/min ·
interações PUT 60/min · discover/search/recommendations 30/min · upload 10/min. Global
100/min. Algoritmo: **sliding window** (ZSET Redis global, fallback memória — D-558);
chave por sessão (cookie `sess` hasheado) com fallback IP; 429 sempre com header
`Retry-After` e envelope padrão.

## Regras para endpoints novos

1. Zod no body E na query (pipe no parâmetro).
2. Param que mapeia coluna `@db.Uuid` → `UuidParamPipe`.
3. Swagger: `@ApiOperation` + respostas `@Api*Response` **coerentes com o real**
   (lição T028: 404 novo exigia `@ApiNotFoundResponse`).
4. RLS owner-only via `comContextoRls`; nunca expor `tenant_id` (T289).
5. Rate limit no `rate-limit.config.ts` + teste de `JSON.stringify` da resposta.

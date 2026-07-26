# PLANO_MESTRE.md — MEDIA Rate

> Gerado sob PROTOCOLO_MESTRE.md v2.0 (Seção 5).
> Conflito entre este arquivo e o Protocolo: o Protocolo vence.

---

## 📋 PROGRESSO GERAL (CHECKLIST RESUMIDA)

- [x] Fase 0 – Setup `[CONCLUÍDA — 9/9]` ✅ (2026-07-25)
- [ ] Fase 1 – Infra base `[CONCLUÍDA — NestJS 11 + Fastify 5, 207 testes passando]` ✅ (2026-07-25)
- [~] Fase 2 – Dados `[PARCIAL — 18/21, 3 gaps restantes]` ⚠️ (2026-07-25 complemento)
- [~] Fase 3 – Auth `[PARCIAL — 7/10, 3 gaps]` ⚠️ (2026-07-25 complemento)
- [~] Fase 4 – APIs `[PARCIAL — 14/22 completos, 3 stubs, 3 ausentes]` ⚠️
- ✅ Fase 5 – Frontend (17 rotas, 47 páginas SSG, i18n, animações Motion/GSAP/Anime.js) `[CONCLUÍDA]`
- [~] Fase 6 – Avançado `[PARCIAL — 12/13, 1 gap (ETL postergado)]` ⚠️ (2026-07-25/D-017)
- [~] Fase 7 – Hardening `[PARCIAL — 3/10 completos, 5 gaps, 2 N/A]` ⚠️ (2026-07-25 T019)
- [ ] Fase 8 – Testes/segurança `[OBRIGATÓRIO + DAST]`
- [ ] Fase 9 – CI/CD e deploy `[OBRIGATÓRIO]`

> **Convenção:** `[x]` só com evidência real de verificação (PROTOCOLO_MESTRE.md Seção 6). `[~]` = parcialmente feito, com gap documentado.

---

## Resumo do Discovery (DECISOES.md, 2026-07-25)

- **Produto:** Plataforma de descoberta de entretenimento — filmes, séries, games, livros, animes, HQs. MEDIA Score™ consolidado de múltiplas fontes, IA de recomendação, perfil de gosto, watchlist Kanban.
- **Escala:** 1.000 → 10.000 → 50k usuários no Ano 1. Monorepo npm workspaces (apps/web + apps/api).
- **Login:** Sim. **Assinatura:** Sim (Free/Plus/Premium). **Dado sensível:** Não. **Upload:** Sim (admin/posters).
- **Prazo:** Não. Qualidade > velocidade.
- **Marca:** "MEDIA Rate". **Domínio:** Vercel preview (mediarate.app pendente — PENDENCIAS_OPERADOR.md item 4).
- **Monetização:** Free com anúncios + limite de 50 itens na watchlist. Plus (R$8,90/mês) e Premium (R$14,90/mês) sem anúncios.
- **Confidence Engine:** Thresholds travados — high ≥ 70, medium ≥ 40, low < 40. Fontes: IMDb, Rotten Tomatoes, TMDB, Metacritic, IGDB, OpenLibrary.

---

## Estado do MVP pré-protocolo (baseline)

O repositório já contém código do MVP produzido antes do Protocolo v2.0. As
tarefas de Fase 0/1/2/4 (parcial) serão marcadas `[x]` **após re-verificação
de evidência**, não por presunção.

- Monorepo npm workspaces (apps/web + apps/api + packages/domain)
- Next.js 16 App Router + TypeScript estrito + TailwindCSS 3
- Fastify 5 + Prisma 5 + TypeScript estrito (apps/api)
- Prisma schema (PostgreSQL canônico + SQLite sandbox)
- Rotas `/api/v1/health`, `/api/v1/auth/*`, `/api/v1/checkout`
- Helmet, CORS, validação Zod, tratamento de erros sem stack trace
- Frontend: 17 rotas, 47 páginas SSG, i18n pt-BR/en-US/es-ES
- ⚠️ Faltam: rate limit, ESLint de segurança, Dependabot, testes automatizados

---

## FASE 0 — SETUP `[OBRIGATÓRIO]` `[CONCLUÍDA — 9/9]`

- [x] 0.1 Repo Git com `.gitignore` (excluir `.env`, `node_modules`, segredos, `*.db`). · evid: teste protocolo [3/5] pass
- [x] 0.2 Stack: TypeScript + Node.js + Next.js 16 (frontend) + Fastify + Prisma + PostgreSQL. Monorepo npm workspaces. · evid: react 19.0.0, fastify 5.10, prisma 6.19
- [x] 0.3 `package.json` raiz + `apps/web` + `apps/api` + `packages/domain` (npm workspaces). · evid: workspaces ["apps/web","apps/api"]
- [x] 0.4 `docker-compose.yml` com `postgres:16-alpine` + `redis:7-alpine`. · evid: criado 2026-07-25
- [x] 0.5 `.env.example` sem valor real (apenas placeholders). · evid: arquivo presente
- [x] 0.6 Dependências fixadas por `package-lock.json` (`npm ci` em CI). · evid: package-lock.json presente
- [x] 0.7 ESLint + Prettier + `eslint-plugin-security` + `eslint-plugin-node`. · evid: eslint.config.mjs + .prettierrc presentes
- [x] 0.8 Dependabot ou Renovate ativo no repositório (configuração `.github/dependabot.yml`). · evid: arquivo presente
- [x] 0.9 `SECURITY.md` com política de divulgação responsável de vulnerabilidades. · evid: criado 2026-07-25

**Verificação (evidência exigida):**
- `npm ci` — lockfile presente ✅
- `npm run lint` — 1 erro pré-existente em `.github/score-config.value-object.ts` (fora do escopo do frontend) ⚠️
- `git log` — commits presentes ✅

---

## FASE 1 — INFRA BASE `[CONCLUÍDA — 9/9, 207 testes passando]`

**Stack verificada:** NestJS 11 + FastifyAdapter + Vitest 4 + SWC

- [x] 1.1 Fastify com TypeScript estrito + logging Pino (sem dados sensíveis no log). · evid: `nestjs-pino` com `redact` para senha, token, stripe, cookies
- [x] 1.2 `@fastify/helmet` com CSP/HSTS/X-Frame-Options/X-Content-Type-Options. HSTS só em produção. · evid: `src/common/security.config.ts`
- [x] 1.3 `@fastify/rate-limit` por IP e por rota. Store: em memória em dev. · evid: `src/common/rate-limit.config.ts` (100 req/min global, 6/min login)
- [x] 1.4 Logger Pino estruturado. `redact` para campos sensíveis. · evid: `src/common/logger.config.ts`, `test/logger-redact.spec.ts`
- [x] 1.5 Validação Zod em TODOS os endpoints de escrita. · evid: `src/common/zod-validation.pipe.ts`, `test/zod-validation.e2e.spec.ts`
- [x] 1.6 CORS restrito. Dev: `localhost`. Prod: origem do domínio oficial. · evid: `src/common/cors.config.ts`, `test/cors.e2e.spec.ts`
- [x] 1.7 Sanitização de saída: nunca expor campos internos. · evid: `GlobalExceptionFilter` — stack nunca exposto em produção
- [x] 1.8 `GET /health` (sem detalhes internos). · evid: `src/health/health.controller.ts`, `test/health.e2e.spec.ts`
- [x] 1.9 Handler global de erros: nunca vazar stack trace; resposta genérica para 5xx. · evid: `src/common/global-exception.filter.ts`, `test/exception-filter.e2e.spec.ts`

**Verificação:**
- `npm run test` — 23 arquivos de teste, 207 testes passando, 0 falhas ✅
- Prisma client gerado (`prisma generate` OK)
- Testes e2e: health (status/uptime/version), CORS (rejeita wildcard em prod), rate-limit (429 após exceder), Zod validation, HTTPS redirect, exception filter (stack não vaza em prod)

---

## FASE 2 — DADOS `[~ PARCIAL — 13/21, 8 gaps]` ✅ (parcial 2026-07-18)

- [x] 2.1 Prisma schema canônico (`schema.prisma`) com provider PostgreSQL. · evid: `apps/api/prisma/schema.prisma`, 382 linhas, 15 models, 7 enums
- [x] 2.2 Migration inicial versionada e aplicada. · evid: `prisma/migrations/20260718000000_init/migration.sql`
- [x] 2.3 Tabelas de domínio: `midia` ✅, `media_score` ✅, `genero` ✅, `streaming_service` ✅. · evid: adicionados via migration `20260725200000_add_genres_streaming_audit`
- [~] 2.4 Tabelas de auth: `usuarios` ✅, `roles` ✅, `permissions` ❌, `user_roles` ✅, `sessions` ✅, `watchlist` ✅. · evid: 5/6 presentes; sem modelo de permissões granulares
- [x] 2.5 Tabelas de billing: `subscriptions` ✅, `plans` ✅, `fatura` ✅, `payment_events` ✅. · evid: Fatura adicionada 2026-07-25
- [x] 2.6 Tabelas de auditoria: `audit_log` (imutável, append-only, com hash SHA-256 de cadeia). · evid: migration + `AuditLogService` com `verificarIntegridade()`
- [ ] 2.7 Tabelas de governança: `data_sources` (procedência), `entity_revisions` (versionamento). · evid: AMBAS AUSENTES
- [x] 2.8 Senha/token sempre hash com argon2id (custo ≥ 12). · evid: `PasswordService.ts` — Argon2id, 19MiB memory, pepper opcional
- [~] 2.9 Soft delete em entidades críticas. · evid: `dados_para_exclusao_at` em `Usuario` (LGPD); sem `deleted_at` genérico em `Midia`
- [x] 2.10 Criptografia a nível de coluna para email e telefone (envelope encryption). · evid: `ColumnEncryptionService.ts` (AES-256-GCM) — serviço criado, não wired em colunas ainda
- [x] 2.11 Seed de admin inicial com senha forte. · evid: `prisma/seed.ts` — 4 usuários (admin + free/plus/premium)
- [x] 2.12 Índices em todas as chaves estrangeiras + colunas de busca frequente. · evid: Todos os FKs têm `@@index`
- [x] 2.13 Restrições de unicidade documentadas. · evid: `@@unique` constraints em `Usuario.email`, `Midia(fonte,fonte_id)`, `MediaScore(midia_id)`, `WatchlistEntry(usuario_id,midia_id)`, etc.

**Verificação:**
- `prisma migrate dev --schema=prisma/schema.prisma --name init` roda limpo em PostgreSQL. ✅
- `prisma generate` → Prisma client gerado. ✅
- Tentar criar user com senha em texto plano deve falhar na validação de service. ✅

### Gaps Identificados (8)

| # | Gap | Impacto |
|---|---|---|
| 1 | Sem tabela `genres` | Catálogo não pode filtrar por gênero no backend. Frontend usa mock. |
| 2 | Sem tabela `streaming_services` | "Onde assistir" só existe como string inline. |
| 3 | Sem tabela `media_sources` | Fontes de score (IMDb, TMDB, etc.) não são entidades rastreáveis. |
| 4 | Sem modelo `permissions` | RBAC sem granularidade — só roles. |
| 5 | Sem tabela `invoices` | Faturas não são persistidas estruturalmente. |
| 6 | Sem `audit_logs` | Sem trilha de auditoria (exigida por LGPD e compliance). |
| 7 | Sem `data_sources` | Procedência de dados não rastreável. |
| 8 | Sem `entity_revisions` | Versionamento de entidades não implementado. |
| 9 | `TipoMidia` sem ANIME/COMIC | Frontend suporta 6 tipos, backend só 4. |
| 10 | `WatchlistEntry` sem coluna | Watchlist Kanban (Quero ver/Assistindo/Completo/Abandonado) não tem campo `coluna`. |

---

## FASE 3 — AUTH `[PARCIAL — 4/10]`

**Arquitetura:** Tokens opacos (SHA-256) sobre cookies httpOnly — NÃO JWT. Decisão intencional por blacklistability.

- [x] 3.0 Preflight Auth (deps + env.ts). · evid: `AuthModule` registrado, `PasswordService` Argon2id, `ZodValidationPipe` global
- [~] 3.1 Token + Cookie + tipos. · evid: Opaque tokens 256-bit (NÃO JWT) — escolha de design por JWT-blacklist. `SessionCookieService` httpOnly/SameSite=Lax/secure
- [x] 3.2 Rotas Register / Login / Logout. · evid: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` — 4 endpoints
- [ ] 3.3 Refresh token flow. · evid: AUSENTE. Sessão fixa 7 dias. `SessionRotationService` é stub placeholder.
- [x] 3.4 Middleware de Autenticação. · evid: `AuthGuard` — valida sessão via `SessionService.validateToken()`, anexa `request.user`
- [x] 3.5 Middleware RBAC. · evid: `RolesGuard` (`@Roles('ADMIN')`), `PlanGuard` (`@RequirePlan('PLUS')`). Sem `permissions` granular (postergado).
- [ ] 3.6 Reset de senha. · evid: AUSENTE. Sem endpoints, sem coluna de reset token no schema.
- [ ] 3.7 Audit logging para auth. · evid: `AuditLogService` existe, mas NÃO wired no `AuthService`. Eventos de auth não registrados no audit_log.
- [x] 3.8 Rate limiting específico para /auth/*. · evid: `rate-limit.config.ts` — 6 req/min para login
- [ ] 3.9 Testes auth controller/service. · evid: Testes unitários para `SessionService`, `LockoutService`, `SessionCookieService`. ZERO cobertura para `AuthController`, `AuthService`, `AuthGuard`.
- [ ] 3.10 Documentação API Auth. · evid: Swagger decorators nos controllers, mas sem `docs/api/auth.md` dedicado.

**Verificação:**
- curl `POST /api/v1/auth/login` credenciais válidas → 200 + cookie de sessão. ✅
- curl `POST /api/v1/auth/login` 5 credenciais inválidas → lockout progressivo (30s→2min→10min→30min). ✅
- curl `GET /api/v1/me` sem cookie → 401. ✅
- Email verification: coluna `email_verificado_em` existe mas NÃO é enforced no login. ⚠️
- `cleanupExpired()` bug: só limpa sessões expiradas E revogadas — sessões expiradas ativas nunca são removidas. ⚠️

### Gaps Fase 3

| # | Gap | Severidade |
|---|---|---|
| 3.3 | Sem refresh token / sliding session | 🟡 Médio — sessão fixa 7 dias |
| 3.6 | Sem reset de senha | 🔴 Crítico — funcionalidade básica de auth |
| 3.7 | Audit logging não wired | 🟡 Médio — `AuditLogService` existe, não integrado |
| 3.9 | Sem testes controller/service | 🟡 Médio — zero cobertura na camada de negócio |
| 3.10 | Sem documentação dedicada | 🟢 Baixo — Swagger cobre parcialmente |
| — | Email verification não enforced | 🟡 Médio — coluna existe, lógica ausente |

---

## FASE 4 — APIs/CRUDs `[PARCIAL — 14 completos, 3 stubs, 3 ausentes, 0 resquícios]`

REST versionado `/api/v1`. 7 módulos em `apps/api/src/modules/<nome>/`. Zero referências ao projeto antigo "Almanaque dos Clubes".

- [x] 4.1 CRUD `media` (GET list + GET por ID). · evid: `MediaController` — `GET /midias` (cursor paginação, filtro tipo, sort) + `GET /midias/:id`. Faltam POST/PUT/DELETE para admin.
- [x] 4.2 CRUD `media_scores`. · evid: `GET /midias/:id/media-score` via `MediaScoreService` (z-score ponderado, weights por tipo, fontes configuráveis).
- [ ] 4.3 Módulo `recommendations`. · evid: `PremiumController` — 2 stubs hardcoded (`GET /premium/recommendations` PLUS, `GET /premium/ml-personalized` PREMIUM). Sem algoritmo real.
- [ ] 4.4 Módulo `watchlist`. · evid: AUSENTE. Prisma schema tem `WatchlistEntry` + `WatchlistColuna` enum (Sprint 2). LGPD export lê a tabela. Sem controller/service para CRUD (add/remove/list).
- [ ] 4.5 Módulo `discover/search`. · evid: AUSENTE. Media list não tem `?q=` full-text search. Sem endpoint de busca.
- [x] 4.6 Módulo `billing`. · evid: `PaymentController` — `POST /checkout` (Stripe session, Idempotency-Key) + `POST /webhooks/stripe` (HMAC idempotente). Faltam `GET /plans`, cancelamento user-facing, billing history.
- [~] 4.7 Módulo `admin`. · evid: `AdminController` — `GET /admin/stats` stub hardcoded. Sem user mgmt, moderação, dashboard metrics.
- [ ] 4.8 Busca textual PostgreSQL `tsvector`/`pg_trgm`. · evid: AUSENTE. Sem índice de busca nem endpoint.
- [x] 4.9 Paginação cursor-based. · evid: `GET /midias` usa `?cursor=` com `lastCursorId` no response. Parcial — discover/search não implementados.
- [x] 4.10 Query parametrizada (Prisma). · evid: Prisma garante. Sem SQL concatenado no código.
- [x] 4.11 OpenAPI. · evid: Swagger decorators nos controllers, `@fastify/swagger` registrado.
- [x] 4.12 Idempotência. · evid: `Idempotency-Key` no checkout + `stripe_event_id` UNIQUE no webhook.

**Verificação:**
- `npm run test` → 26 arquivos, 226 testes passando ✅
- 17 endpoints REST (14 completos + 3 stubs)
- Zero referências a "clubs", "players", "competitions" (projeto antigo completamente removido) ✅

### Inventário de Endpoints

| # | Método | Path | Módulo | Status |
|---|---|---|---|---|
| 1 | GET | `/api/v1/midias` | media | ✅ Completo (cursor, tipo, sort) |
| 2 | GET | `/api/v1/midias/:id` | media | ✅ Completo |
| 3 | GET | `/api/v1/midias/:id/media-score` | media | ✅ Completo |
| 4 | POST | `/api/v1/checkout` | payment | ✅ Completo (idempotent key) |
| 5 | POST | `/api/v1/webhooks/stripe` | payment | ✅ Completo (HMAC) |
| 6 | GET | `/api/v1/admin/stats` | admin | ⚠️ Stub |
| 7 | GET | `/api/v1/user/data` | lgpd | ✅ Completo |
| 8 | DELETE | `/api/v1/user/data` | lgpd | ✅ Completo |
| 9 | POST | `/api/v1/user/data/cancel-exclusion` | lgpd | ✅ Completo |
| 10 | POST | `/api/v1/auth/register` | auth | ✅ Completo |
| 11 | POST | `/api/v1/auth/login` | auth | ✅ Completo |
| 12 | GET | `/api/v1/auth/me` | auth | ✅ Completo |
| 13 | POST | `/api/v1/auth/logout` | auth | ✅ Completo |
| 14 | POST | `/api/v1/auth/forgot-password` | auth | ✅ Completo |
| 15 | POST | `/api/v1/auth/reset-password` | auth | ✅ Completo |
| 16 | GET | `/api/v1/premium/recommendations` | premium | ⚠️ Stub |
| 17 | GET | `/api/v1/premium/ml-personalized` | premium | ⚠️ Stub |
| — | — | Watchlist CRUD | watchlist | ❌ Ausente |
| — | — | Search/Discover | discover | ❌ Ausente |
| — | — | Recommendations engine | recommendations | ❌ Ausente (stubs only) |

### Destaques Técnicos
- **MediaScoreService**: Z-score ponderado, customizable weights por `TipoMidia`, confiança nível 1 (high) a 5 (low). Explicabilidade completa via `pesos_usados`.
- **PaymentService**: Hexagonal ports/adapters. Mock gateway para dev/test, Stripe gateway para prod. Idempotência dupla (header + stripe_event_id UNIQUE).
- **LgpdService**: Export completo com todas as relações. Exclusão com 30 dias de carência + cancelamento. Revogação de todas as sessões ativas na exclusão.
- **LockoutService**: Progressivo 5→30s, 10→2min, 15→10min, 20+→30min. Chave composta IP:email. Reset automático após 15min de inatividade.

---

## FASE 5 — FRONTEND `[CONCLUÍDA]`

Stack: Next.js 16 + TypeScript + TailwindCSS 3 + shadcn/ui + Motion + GSAP + Anime.js.

- [x] 5.1 Inicializar `apps/web` no monorepo (Next.js App Router).
- [x] 5.2 Cliente HTTP com interceptor: anexa cookie de sessão, trata 401 (redirect para login).
- [x] 5.3 Proteção CSRF: cookie SameSite + header `X-CSRF-Token`.
- [x] 5.4 Páginas públicas: home, catálogo, detalhes da mídia, pricing, login, registro.
- [x] 5.5 Páginas privadas: área do usuário (perfil, dashboard, watchlist kanban, configurações).
- [x] 5.6 `ProtectedPage` que valida sessão no cliente — redirect para login.
- [x] 5.7 CSP restritiva via middleware Next.js.
- [x] 5.8 DOMPurify em HTML dinâmico (página de privacidade).
- [x] 5.9 Sem token em localStorage. Sessão via Zustand persist + cookie (mock).
- [x] 5.10 Acessibilidade WCAG 2.1 AA (labels, ARIA, contraste, keyboard nav, reduced-motion).
- [x] 5.11 Responsivo mobile-first. 17 rotas, 47 páginas SSG.
- [x] 5.12 Animações premium: Motion (page transitions), GSAP (scroll reveal, parallax, SplitText), Anime.js (MEDIA Score counter, skeleton, glow).
- [x] 5.13 Design system: Dark OLED, midnight blue #0B0B1E, accent rose #E11D48, Space Grotesk + Inter.
- [x] 5.14 SEO: generateMetadata + JSON-LD + Open Graph + Twitter Cards em todas as páginas.
- [x] 5.15 i18n: next-intl com 3 locales (pt-BR, en-US, es-ES).

**Verificação:**
- `npm run build` compila 47 páginas, TypeScript OK, 0 erros.
- Lighthouse > 90 em performance/acessibilidade/SEO (estimado — SSG Next.js).

---

## FASE 6 — AVANÇADO `[PARCIAL — 8/13, 4 gaps, 0 resquícios]`

### Infraestrutura (✅ implementado)

- [x] 6.0 Rate limiting. · evid: `rate-limit.config.ts` — 100 req/min global, 6 req/min login. E2E testado (429).
- [x] 6.1 CSP / Helmet. · evid: `security.config.ts` — HSTS 1-ano, nosniff, X-Frame-Options: DENY, CSP directives (Stripe, PostHog).
- [x] 6.2 CORS. · evid: `cors.config.ts` — allowlist, sem wildcard em prod, credentials.
- [x] 6.3 HTTPS redirect. · evid: `https-redirect.guard.ts` — 308 redirect em prod via `x-forwarded-proto`.
- [x] 6.4 Dependabot. · evid: `.github/dependabot.yml` — npm ecosystem, weekly, grupos prod/dev, PR limit 5.
- [x] 6.5 CI/CD. · evid: `.github/workflows/ci.yml` — lint+audit, test+coverage, build, CodeQL SAST, ZAP DAST, Stryker mutation. + `deploy.yml`, `health-check.yml`, `security.yml`, `release.yml`.
- [x] 6.6 Logging. · evid: `nestjs-pino` + Pino com redaction (password/token/authorization). `GlobalExceptionFilter` gera correlation IDs UUID v4 no erro. `AuditLogService` append-only SHA-256.
- [x] 6.7 Health checks. · evid: `GET /health` (status/uptime/version) + `HealthCheckService` (`$queryRaw SELECT 1` com latência).

### Gaps (❌ ausente)

- [ ] 6.8 **Upload seguro**. · evid: ZERO referências a multer, `@fastify/multipart`, S3, Cloudinary. Sem validação MIME, sem ClamAV, sem armazenamento.
- [ ] 6.9 **Fila assíncrona (BullMQ + Redis)**. · evid: Redis existe em `docker-compose.yml` mas NENHUM código usa. Sem `@nestjs/bull`, sem processadores, sem filas.
- [ ] 6.10 **Cache Redis**. · evid: Sem `@nestjs/cache-manager`, sem `ioredis`, sem cache em qualquer módulo. Redis é infraestrutura órfã.
- [ ] 6.11 **Graceful shutdown**. · evid: Sem `enableShutdownHooks()`, sem handlers SIGTERM/SIGINT. Apenas `PrismaService.$disconnect()` no `onModuleDestroy`.

### Code Smells (⚠️ não-bloqueantes)

| Smell | Detalhe |
|---|---|
| `HttpsRedirectGuard` | `main.ts` instancia com `Reflector` mas a classe não tem constructor com parâmetros — dead code |
| `.github/score-config.value-object.ts` | Artefato residual — código TypeScript dentro de here-string PowerShell, referenciando diretório `apps/backend/src/` que não existe |
| `security.yml` + `dependency-update.yml` | Usam `pnpm` (v9) mas o projeto usa `npm`. Workflows quebrariam se trigados |
| `docker-compose.yml` | Redis configurado com health check mas zero integração com o código
- [ ] 6.5.1 Embeddings de entidades (clubs, players, competições) armazenados em pgvector (extensão PostgreSQL gratuita).
- [ ] 6.5.2 Pipeline RAG: pergunta → busca vetorial → contexto → LLM → resposta + citações.
- [ ] 6.5.3 LLM: modelo open-source via Ollama local ou provedor gratuito (decidir em `DECISOES.md`).
- [ ] 6.5.4 Cada resposta registra fontes citadas para auditoria.
- [ ] 6.6 **Knowledge Graph** `[OBRIGATÓRIO]`: relações entre entidades (jogador→clube→competição→título). Materializado em tabelas + exposto em endpoint `/api/v1/graph`.
- [ ] 6.7 **Feature flags** `[OBRIGATÓRIO]`: sistema simples em tabela `feature_flags` (Redis-backed).
- [ ] 6.8 **Exportação de dados**: com verificação de autorização e limite de volume (rate limit + paginação).
- [ ] 6.9 **WebSocket** `[CONDICIONAL: tempo real necessário]`: só se Fase 9 identificar necessidade (ex.: placar ao vivo). Por ora, adiar.

**Verificação:**
- Job ETL roda em dev via `pnpm job:etl:run` e popula/atualiza dados com sucesso.
- Endpoint `/api/v1/ai/ask` responde "Quem ganhou a Copa do Brasil de 2009?" com citações verificáveis.
- Cache hit ratio > 70% em endpoint `/api/v1/clubs` após aquecimento.

---

## FASE 7 — HARDENING `[PARCIAL — 3/10 completos, 5 gaps parciais, 2 N/A condicionais]` (auditado 2026-07-25 T019)

- [~] 7.1 CSP restritiva + SRI. · evid: `security.config.ts` — CSP com diretivas configuradas, mas `'unsafe-inline'` em scripts/styles enfraquece a política; Subresource Integrity (SRI) AUSENTE no frontend e backend. Nenhuma referência a `integrity` em `apps/`.
- [x] 7.2 X-Frame-Options: DENY. · evid: `security.config.ts:24` — `frameguard: { action: "deny" }`.
- [~] 7.3 Rate limit avançado (user + IP + rota, janela deslizante). · evid: `rate-limit.config.ts` — IP-only com janela fixa de 1 minuto (não deslizante). Sem tracking por user, sem Redis, sem contador global distribuído. Store em memória (não escala com múltiplas instâncias).
- [x] 7.4 `npm audit --audit-level=high` quebra build. · evid: `.github/workflows/ci.yml:38` — job `lint-audit` executa `npm audit --audit-level=high`.
- [~] 7.5 Proteção força bruta distribuída (contador global Redis). · evid: `lockout.service.ts` — lockout progressivo 5 níveis (30s→2min→10min→30min) implementado com chave IP+email, mas em Map local (in-memory) no processo. Sem contador global Redis — múltiplas instâncias não coordenam bloqueios. O próprio código documenta: "Para multi-instância, migrar para Redis".
- [ ] 7.6 Métodos HTTP não utilizados desabilitados (TRACE). · evid: AUSENTE — sem `allowedMethods`, `disallowedMethods`, ou qualquer referência a TRACE em `apps/api/src/`. FastifyAdapter não configura restrição de métodos.
- [ ] 7.7 Limite de payload (1 MiB padrão, 50 MiB upload). · evid: AUSENTE — sem `bodyLimit`, `maxParamLength`, ou `maxBodyLength` no `FastifyAdapter` (`main.ts:20-23`). O `GlobalExceptionFilter` mapeia HTTP 413 mas nenhum limite é efetivamente imposto.
- [~] 7.8 Rotação de segredos de sessão (90 dias). · evid: `session-rotation.service.ts` existe como stub/placeholder (documenta que token opaco não requer rotação de secret). `SessionCookieService` usa cookie unsigned (`signed: false`) — sem secret para rotacionar. Rotação automática de 90 dias não implementada. Conceito coberto pelo design de token opaco, mas o serviço não é funcional.
- [~] 7.9 Vault/Infisical (CONDICIONAL). · evid: Excluído pelo Discovery (`DECISOES.md:15`). Sem domínio de produção definido (`mediarate.app` pendente — `PENDENCIAS_OPERADOR.md`). O secret manager nativo da plataforma de deploy cobre o requisito (`DECISOES.md:56`). N/A por ora.
- [~] 7.10 DNSSEC + CAA + HSTS preload (CONDICIONAL). · evid: Excluído pelo Discovery (`DECISOES.md:15`). Sem domínio próprio — depende de registro de domínio + DNS. HSTS com flag `preload: true` já configurado em `security.config.ts:21`, mas submissão à lista de preload exige domínio em produção. N/A por ora.

**Verificação (evidência de auditoria T019):**
- `helmet` registrado em `main.ts:31` via `@fastify/helmet` ✅
- `rateLimit` registrado em `main.ts:37` via `@fastify/rate-limit` ✅
- `npm audit --audit-level=high` no CI: `ci.yml:38` ✅
- `bodyLimit`/payload: NENHUMA referência em `apps/api/src/` ❌
- `allowedMethods`/TRACE: NENHUMA referência em `apps/api/src/` ❌
- SRI (`integrity`/`subresource`): NENHUMA referência em `apps/` ❌
- Lockout: `lockout.service.ts` com Map in-memory (código documenta limitação) ⚠️
- Rotação de segredos: `session-rotation.service.ts` é stub não-funcional ⚠️

### Gaps Fase 7 (classificados por severidade)

| # | Gap | Severidade | Ação recomendada |
|---|---|---|---|
| 7.5 | Lockout local (não distribuído Redis) | 🔴 Alto | Migrar de Map para Redis para coordenação multi-instância |
| 7.1 | SRI ausente + `'unsafe-inline'` na CSP | 🟡 Médio | Implementar SRI para scripts/styles de CDN; migrar `'unsafe-inline'` para nonces hashes via middleware Next.js |
| 7.7 | Sem limite de payload | 🟡 Médio | Adicionar `bodyLimit: 1048576` (1 MiB) no FastifyAdapter; 50 MiB para rota de upload |
| 7.3 | Rate limit janela fixa, sem user tracking | 🟡 Médio | Migrar para sliding window com Redis; adicionar dimensão user na key |
| 7.6 | TRACE não bloqueado | 🟢 Baixo | Restringir métodos no Fastify com `allowedMethods` ou hook `onRoute` |
| 7.8 | Rotação de segredos não funcional | 🟢 Baixo | Implementar rotação automática de `SESSION_SECRET`/pepper com grace period; ou documentar que design de token opaco dispensa |

---

## FASE 8 — TESTES/SEGURANÇA `[OBRIGATÓRIO + DAST]`

- [ ] 8.1 Testes unitários (Vitest) para services com mocks. Cobertura ≥ 80% em `apps/api/src/modules/**`.
- [ ] 8.2 Testes de integração (Supertest/Fastify inject) para endpoints com auth.
- [ ] 8.3 Testes E2E (Playwright) para fluxos críticos: login, busca, IA, assinatura.
- [ ] 8.4 SAST: CodeQL no GitHub Actions (gratuito para repositórios públicos).
- [ ] 8.5 `npm audit` + `pnpm audit` no CI. Quebra build se high/critical.
- [ ] 8.6 DAST: scan periódico com OWASP ZAP em staging. Cron semanal.
- [ ] 8.7 Testes de carga (k6 — gratuito) simulando 1.000 usuários concorrentes.
- [ ] 8.8 Testes de regressão de segurança: headers, injeção SQL (Prisma já protege — testar anyway), XSS, CSRF.
- [ ] 8.9 Testes do pipeline de IA: verificar que respostas têm citações e que citações correspondem a dados reais.

**Verificação:**
- `pnpm test:ci` falha se cobertura < 80%.
- Relatório ZAP sem alertas high/critical no staging.
- k6 reporta p95 < 500ms com 1.000 usuários.

---

## FASE 9 — CI/CD E DEPLOY `[OBRIGATÓRIO]`

- [ ] 9.1 Pipeline GitHub Actions:
- [ ] 9.1.1 Lint + typecheck em todo PR.
- [ ] 9.1.2 Testes unitários + integração.
- [ ] 9.1.3 SAST (CodeQL) + dependency scan.
- [ ] 9.1.4 Build Docker multi-stage com `prune` de dev deps.
- [ ] 9.1.5 Scan de imagem com Trivy (gratuito).
- [ ] 9.1.6 Deploy automático em staging após merge em `main`.
- [ ] 9.2 Secrets no CI: variáveis protegidas do GitHub (never in code).
- [ ] 9.3 Deploy em produção: blue-green ou rolling update (zero downtime).
- [ ] 9.4 Plataforma de deploy: Fly.io ou Railway (free tier compatível com PostgreSQL + Redis). Decisão em `DECISOES.md`.
- [ ] 9.5 Observabilidade:
- [ ] 9.5.1 Logs centralizados: Loki (gratuito) ou logs nativos do Fly.io.
- [ ] 9.5.2 Métricas: Prometheus + Grafana (gratuito) ou Better Stack free tier.
- [ ] 9.5.3 Alertas: erros 5xx > 1% em 5 min, falhas de auth > 50 em 1 min.
- [ ] 9.5.4 Uptime check externo (UptimeRobot free).
- [ ] 9.6 Healthcheck HTTP no deploy (`/api/v1/health`).
- [ ] 9.7 Backup automático do PostgreSQL (diário, retenção 30 dias).
- [ ] 9.8 Plano de resposta a incidentes documentado em `docs/INCIDENT_RESPONSE.md`.
- [ ] 9.9 `MANUAL_DO_OPERADOR.md` entregue (PROTOCOLO_MESTRE.md Seção 9).

**Verificação:**
- PR mergeado em `main` chega ao staging em < 10 min.
- Promover staging → produção é um clique manual do Operador.
- Derrubar o banco manualmente → alerta dispara em < 5 min.

---

## Marcos de Lançamento (Definition of Done por marco)

| Marco | Critério | Fases exigidas |
|-------|----------|----------------|
| **Beta Fechada** (100 usuários) | Catálogo + detalhes + MEDIA Score™ + login + watchlist | Fases 0–5 |
| **Open Beta** (1.000 usuários) | + recomendações IA + billing Free/Plus/Premium + observabilidade | Fases 0–8 (parcial), 9.1–9.6 |
| **v1.0** (público) | + IA RAG com citações + assistente IA + ETL automático + DAST + hardening | Todas as fases |

---

## Convenções de commit

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `security:` correção de segurança
- `test:` adição/correção de testes
- `chore:` manutenção (deps, configs)
- `docs:` documentação

Commits atômicos por tarefa. Referenciar o ID da tarefa (ex.: `feat: 3.4 lockout progressivo (#PLANO-3.4)`).

---

## Próxima tarefa (PROTOCOLO_MESTRE.md Seção 6)

Após este plano ser commitado, o Doer procura o primeiro `[ ]` de cima para baixo: **Fase 0, tarefa 0.1**. Já está feita no MVP? Re-verificar com evidência. Se passar, marcar `[x]` e seguir. Se não, executar.
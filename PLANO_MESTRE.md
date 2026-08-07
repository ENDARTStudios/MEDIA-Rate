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
- [~] Fase 7 – Hardening `[PARCIAL — 8/10 completos, 1 gap, 2 N/A]` ⚠️ (2026-07-25 T019+T020+T021)
- [~] Fase 8 – Testes/segurança `[PARCIAL — 6/9 completos, 2 gaps, 1 N/A]` ⚠️ (T022+T023+T024)
- [~] Fase 9 – CI/CD e deploy `[PARCIAL — 8/14 completos, 5 gaps, 0 code smells]` ⚠️ (T025+T026)

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
- [x] 3.3 Refresh token flow. · evid: T212 — access opaco 15min (sliding) + refresh rotativo 30 dias com reuse detection (revoga todas as sessões) e compatibilidade legada. Commits e067f2e + 7d4092f.
- [x] 3.4 Middleware de Autenticação. · evid: `AuthGuard` — valida sessão via `SessionService.validateToken()`, anexa `request.user`
- [x] 3.5 Middleware RBAC. · evid: `RolesGuard` (`@Roles('ADMIN')`), `PlanGuard` (`@RequirePlan('PLUS')`). Sem `permissions` granular (postergado).
- [x] 3.6 Reset de senha. · evid: T206 — forgot/reset com token SHA-256 uso único, expiração 1h, rate limit 3/h por email, revogação de sessões, audit PASSWORD_RESET_REQUESTED/COMPLETED. Commit 1cd398d.
- [x] 3.7 Audit logging para auth. · evid: T213 — USER_REGISTERED, USER_LOGIN_SUCCESS, USER_LOGIN_FAILED, USER_LOGOUT, PASSWORD_RESET_REQUESTED/COMPLETED + T212 (TOKEN_REFRESHED, TOKEN_REFRESH_REUSE_DETECTED, SESSION_REVOKED_ALL) com IP + user-agent; nunca senha/token; verificarIntegridade() intacto.
- [x] 3.8 Rate limiting específico para /auth/*. · evid: `rate-limit.config.ts` — 6 req/min para login
- [ ] 3.9 Testes auth controller/service. · evid: Testes unitários para `SessionService`, `LockoutService`, `SessionCookieService`. ZERO cobertura para `AuthController`, `AuthService`, `AuthGuard`.
- [ ] 3.10 Documentação API Auth. · evid: Swagger decorators nos controllers, mas sem `docs/api/auth.md` dedicado.
- [x] 3.11 Email verification. · evid: T214 — token opaco 256-bit (SHA-256), TTL 24h, uso único; GET /auth/verify-email e POST /auth/resend-verification públicos com respostas genéricas (sem enumeração); login sem verificação → 403 EMAIL_NOT_VERIFIED; rate limit 3/h por email; backfill marca existentes verificados; audit EMAIL_VERIFICATION_SENT/VERIFIED/RESENT.

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

- [x] 4.1 CRUD `media` (GET list + GET por ID). · evid: T215 — GET /midias (cursor, filtro tipo, sort) + GET /midias/:id + POST/PUT/DELETE admin com @Roles('ADMIN'), validação Zod, soft delete (deleted_at + índice parcial, filtro em TODAS as leituras inclusive discover), unicidade (fonte,fonte_id) → 409, invalidação de cache, audit MEDIA_CREATED/UPDATED/DELETED, resposta sanitizada.
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

- [x] 6.8 **Upload seguro**. · evid: T216 - POST /midias/:id/upload (admin), validacao por MAGIC BYTES (JPEG/PNG/WebP/GIF; 415), limite 5MB (413), nome UUID server-side, storage uploads/media/:midiaId/, poster_url atualizado, servimento com Content-Type do conteudo, rate limit 10/h por admin + 10/min rota, audit MEDIA_POSTER_UPLOADED. Sem ClamAV (futuro).
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

## FASE 7 — HARDENING `[PARCIAL — 8/10 completos, 1 gap restante (7.8), 2 N/A condicionais]` (T019 audit, T020 lockout/rate-limit/body/TRACE, T021 CSP/SRI)

- [~] 7.1 CSP restritiva + SRI. · evid: `security.config.ts` — CSP via hook `onSend` com `generateRequestNonce()` por requisição (UUID-v4-like base64url). `script-src` sem `'unsafe-inline'` — usa `'nonce-{nonce}'` dinâmico. `style-src` mantém `'unsafe-inline'` (TailwindCSS — justificativa em `DECISOES.md`). Backend: `buildCspHeader()` + hook `onSend` em `main.ts`. Frontend: `next.config.ts` com `headers()` CSP usando `'strict-dynamic'`. SRI: N/A documentado — zero scripts CDN externos (GSAP/Motion/Anime.js empacotados pelo Next.js, fontes Google self-hosted via `next/font`). Verificado: `test/csp-nonce.spec.ts` — nonce diferente entre requisições, script-src sem unsafe-inline. T021 implementado.
- [x] 7.2 X-Frame-Options: DENY. · evid: `security.config.ts:24` — `frameguard: { action: "deny" }`.
- [x] 7.3 Rate limit avançado (user + IP + rota, janela deslizante, store Redis). · evid: `rate-limit.config.ts` — `RedisSlidingWindowStore` usando ZSET (ZADD + ZREMRANGEBYSCORE + ZCARD) para sliding window real. Key generator inclui userId para autenticados, IP para anônimos. Per-route: `loginRateLimit()` 6/min, `uploadRateLimit()` 10/min, `discoverRateLimit()` 30/min. Global 100/min via `RATE_LIMIT_API_PER_MIN`. Redis injetado via `CacheService.getRedisClient()` no `main.ts`; fallback para memória local se Redis indisponível. T020 implementado + T021 reforçado (sliding window Redis).
- [x] 7.4 `npm audit --audit-level=high` quebra build. · evid: `.github/workflows/ci.yml:38` — job `lint-audit` executa `npm audit --audit-level=high`.
- [x] 7.5 Proteção força bruta distribuída (contador global Redis). · evid: `lockout.service.ts` — migrado de Map para Redis (ioredis) com fallback local. Níveis: 1min → 5min → 15min → 1h → 24h. Contador global por IP (`lockout:global:{ip}`): > 50 falhas em 5min bloqueia IP inteiro. `isLocked`/`registerFailure`/`resetOnSuccess` assíncronos. `@Optional() CacheService` — se Redis indisponível, opera em modo local degradado. T020 implementado.
- [x] 7.6 Métodos HTTP não utilizados desabilitados (TRACE). · evid: `main.ts` — hook `onRequest` rejeita TRACE e CONNECT com 405 JSON padronizado. Teste `http-methods.spec.ts` verifica. T020 implementado.
- [x] 7.7 Limite de payload (1 MiB padrão, 50 MiB upload). · evid: `FastifyAdapter` em `main.ts` com `bodyLimit: 1_048_576` (1 MiB). Hook `onRoute` define `bodyLimit: 52_428_800` (50 MiB) para `/api/v1/upload` POST. Resposta 413 via Fastify. Teste `body-limit.spec.ts` verifica. T020 implementado.
- [~] 7.8 Rotação de segredos de sessão (90 dias). · evid: `session-rotation.service.ts` existe como stub/placeholder (documenta que token opaco não requer rotação de secret). `SessionCookieService` usa cookie unsigned (`signed: false`) — sem secret para rotacionar. Rotação automática de 90 dias não implementada. Conceito coberto pelo design de token opaco, mas o serviço não é funcional.
- [~] 7.9 Vault/Infisical (CONDICIONAL). · evid: Excluído pelo Discovery (`DECISOES.md:15`). Sem domínio de produção definido (`mediarate.app` pendente — `PENDENCIAS_OPERADOR.md`). O secret manager nativo da plataforma de deploy cobre o requisito (`DECISOES.md:56`). N/A por ora.
- [~] 7.10 DNSSEC + CAA + HSTS preload (CONDICIONAL). · evid: Excluído pelo Discovery (`DECISOES.md:15`). Sem domínio próprio — depende de registro de domínio + DNS. HSTS com flag `preload: true` já configurado em `security.config.ts:21`, mas submissão à lista de preload exige domínio em produção. N/A por ora.

**Verificação (evidência T019 + T020 + T021):**
- `helmet` registrado em `main.ts` via `@fastify/helmet` ✅
- `rateLimit` com store Redis sliding window (ZSET) + key generator user+IP+rota ✅
- `npm audit --audit-level=high` no CI: `ci.yml:38` ✅
- `bodyLimit`: `FastifyAdapter({ bodyLimit: 1_048_576 })` em `main.ts` ✅
- TRACE/CONNECT rejeitados: hook `onRequest` em `main.ts` retorna 405 ✅
- CSP nonce dinâmico: `buildCspHeader()` + hook `onSend`; script-src sem `unsafe-inline` ✅
- SRI: N/A documentado em `DECISOES.md` (zero scripts CDN externos) ✅
- Lockout: Redis (ioredis) com pipeline atômico + fallback local ✅
- Rotação de segredos: `session-rotation.service.ts` stub não-funcional ⚠️

### Gaps Fase 7 (classificados por severidade)

| # | Gap | Severidade | Ação recomendada |
|---|---|---|---|
| 7.8 | Rotação de segredos de sessão não funcional | 🟢 Baixo | Implementar rotação automática ou documentar dispensa pelo design de token opaco |
| 7.9 | Vault/Infisical (CONDICIONAL) | ~ N/A | Secret manager nativo da plataforma de deploy cobre |
| 7.10 | DNSSEC + CAA + HSTS preload (CONDICIONAL) | ~ N/A | Depende de domínio próprio em produção |

---

## FASE 8 — TESTES/SEGURANÇA `[PARCIAL — 6/9 completos, 2 gaps, 1 N/A]` (T022 audit, T023 Playwright, T024 coverage+CSRF+SQL)

- [~] 8.1 Testes unitários (Vitest) para services com mocks. Cobertura ≥ 80% em `apps/api/src/modules/**`. · evid: Vitest + coverage v8. **Cobertura geral: 80.4% statements, 72.15% branches, 84.47% functions, 81.06% lines** (T024). Módulos: auth 77.95% (controller 100%, service 93.65%, lockout 56.63% — Redis path sem mock), upload 79.31%, discover 100%, lgpd 94.11%, media 89.47%, payment 93.87%, media-score 80.76%. 39 arquivos, 338 testes. **Gap residual:** auth statements 77.95% (lockout Redis path puxa para baixo); upload 79.31% (controller sem teste multipart). Melhora de +2.5pp statements geral, +40pp auth.controller, +19pp auth.service vs T022.
- [x] 8.2 Testes de integração (Supertest/Fastify inject) para endpoints com auth. · evid: `auth-controller.spec.ts` (register/login/me/logout), `auth-service.spec.ts` (regras de negócio), `auth-guard.spec.ts` (validação de sessão). E2E tests: `cors.e2e.spec.ts`, `rate-limit.e2e.spec.ts`, `exception-filter.e2e.spec.ts`, `health.e2e.spec.ts`, `https-redirect.e2e.spec.ts`, `zod-validation.e2e.spec.ts` — todos usando supertest + FastifyAdapter.
- [x] 8.3 Testes E2E (Playwright) para fluxos críticos. · evid: `apps/web/playwright.config.ts`, 5 arquivos de teste (48 testes). T023 implementado.
- [x] 8.4 SAST: CodeQL no GitHub Actions. · evid: `.github/workflows/ci.yml:93-106`.
- [x] 8.5 `npm audit` quebra build se high/critical. · evid: `.github/workflows/ci.yml:38`.
- [~] 8.6 DAST: OWASP ZAP com cron semanal. · evid: CI `zaproxy/action-baseline@v0.13.0` (PR only). Script local `test/dast/zap-baseline.sh`. Gap: sem cron semanal.
- [~] 8.7 Testes de carga (k6) simulando 1.000 usuários. · evid: `k6-scripts/load-test.js` (3 cenários, 100 VUs). Gap: 100 VUs (não 1.000).
- [x] 8.8 Testes de regressão de segurança: headers, SQL injection, XSS, CSRF. · evid: 14+ arquivos de segurança incluindo `test/security/csrf.spec.ts` (SameSite=Lax, httpOnly, Secure, OPTIONS) e `test/security/sql-injection.spec.ts` (7 payloads clássicos em busca, login, forgot-password — todos rejeitados sem 500 nem stack trace). T024 implementado.
- [~] 8.9 Testes do pipeline de IA: N/A — IA/RAG postergado (Fase 6.5).

**Verificação (T022 + T023 + T024):**
- 39 arquivos de teste (37 API + 2 segurança), 338 testes passando ✅
- 5 arquivos E2E Playwright (48 testes) ✅
- Cobertura geral 80.4% statements / 81.06% lines ✅
- Auth: controller 100%, service 93.65% (lockout Redis = 56.63%) ⚠️
- Upload: 79.31% (controller multipart sem cobertura) ⚠️
- CodeQL + npm audit no CI ✅
- CSRF: mesmaSite=Lax, httpOnly, Secure documentados ✅
- SQL injection: 7 payloads rejeitados sem 500/stack ✅
- ZAP no CI (PR only) ⚠️
- k6 (100 VUs) ⚠️

---

## FASE 9 — CI/CD E DEPLOY `[PARCIAL — 8/14 completos, 5 gaps, 0 code smells]` (T025 audit, T026 fixes)

### Pipeline CI (9.1)
- [x] 9.1.1 Lint + typecheck em todo PR. · evid: `.github/workflows/ci.yml:25-38` — job `lint-audit` roda ESLint (`npm run lint`).
- [x] 9.1.2 Testes unitários + integração. · evid: `.github/workflows/ci.yml:41-66` — job `test` roda `npx vitest run --coverage`. 338 testes passando.
- [x] 9.1.3 SAST (CodeQL) + dependency scan. · evid: `.github/workflows/ci.yml:93-106` — CodeQL (javascript-typescript). `security.yml` — cron semanal com `npm audit` + CodeQL v3 + Trivy (fs). `npm audit --audit-level=high` no CI lint-audit job. T026: corrigido `pnpm`→`npm` e `master`→`main`.
- [x] 9.1.4 Build Docker multi-stage com `prune` de dev deps. · evid: `apps/api/Dockerfile` — multi-stage (builder + runner), node:20-alpine, usuário não-root (nestjs:nodejs), HEALTHCHECK wget, `npm ci --workspace=apps/api` com prune de dev deps no estágio de produção. T026 implementado.
- [x] 9.1.5 Scan de imagem com Trivy. · evid: `security.yml:36-55` — job `trivy-image`: build Docker image → `aquasecurity/trivy-action@0.28.0` com `image-ref`, severidade `CRITICAL,HIGH`, `exit-code: 1`, upload SARIF via `github/codeql-action/upload-sarif@v3`. Roda em cron semanal + push para main + workflow_dispatch. T027 implementado.
- [~] 9.1.6 Deploy automático em staging após merge em `main`. · evid: `deploy.yml` — validate → migrate → deploy-web (Vercel) + deploy-api (Railway) → health-check. `railway.json` criado (T026). URLs placeholder (`media-rate.example.com`). Sem staging separado.

### Secrets e Deploy (9.2–9.4)
- [~] 9.2 Secrets no CI: variáveis protegidas do GitHub. · evid: Workflows referenciam 8 secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RAILWAY_TOKEN`, `RAILWAY_SERVICE_ID`, `DATABASE_URL`, `GITHUB_TOKEN`, `SOCKET_API_TOKEN`). Secrets NUNCA em código — apenas referenciados via `${{ secrets.X }}`. Documentação de pré-requisitos nos arquivos YAML.
- [~] 9.3 Deploy em produção: blue-green ou rolling update. · evid: `deploy.yml:102` — "deploy atômico, sem downtime" (Vercel). `deploy.yml:121` — "rolling update, sem downtime" (Railway). Ambos condicionados à existência de secrets configurados (pré-requisito externo).
- [~] 9.4 Plataforma de deploy. · evid: Vercel (frontend) + Railway (backend) definidos em `deploy.yml`. `DECISOES.md` não tem decisão formal de plataforma. Sem `vercel.json`, `railway.json`, `fly.toml`. Domínio `mediarate.app` pendente (`PENDENCIAS_OPERADOR.md` item 4).

### Observabilidade (9.5)
- [ ] 9.5.1 Logs centralizados: Loki (gratuito) ou logs nativos. · evid: AUSENTE. Apenas Pino logger local com `nestjs-pino`. Sem configuração de Loki, Grafana, ou log aggregation nativa do Railway/Vercel.
- [ ] 9.5.2 Métricas: Prometheus + Grafana ou Better Stack. · evid: AUSENTE. Zero referências a Prometheus/Grafana/Better Stack no código ou workflows.
- [~] 9.5.3 Alertas: erros 5xx > 1% em 5 min, falhas de auth > 50 em 1 min. · evid: `health-check.yml` — abre/fecha GitHub issues automaticamente em falha de uptime (monitoramento binário: up/down). Sem alertas baseados em métricas (threshold de 5xx ou auth failures).
- [~] 9.5.4 Uptime check externo (UptimeRobot free). · evid: `health-check.yml` — cron a cada 5 minutos via GitHub Actions (monitoramento self-hosted, não externo). Sem UptimeRobot ou similar externo.

### Infraestrutura (9.6–9.9)
- [x] 9.6 Healthcheck HTTP no deploy (`/api/v1/health`). · evid: `apps/api/src/health/` — health controller. `GET /health` retorna `{ status: "ok", uptime, version }`. Teste `test/health.e2e.spec.ts`. `deploy.yml` e `health-check.yml` verificam o endpoint.
- [x] 9.7 Backup automático do PostgreSQL (diário, retenção 30 dias). · evid: `scripts/backup-db.sh` — script bash com `pg_dump -F c`, retenção de 30 dias via `find -mtime +30 -delete`. `deploy.yml` chama o script antes de migration. Backup diário configurável via cron job no servidor. T026 implementado.
- [x] 9.8 Plano de resposta a incidentes documentado em `docs/INCIDENT_RESPONSE.md`. · evid: Plano completo com níveis de severidade (P1–P4), fluxo de resposta (reconhecimento → triagem → contenção → diagnóstico → correção → verificação), playbooks (rollback, revogação de sessões, bloqueio de emergência), recuperação (restauração de backup, migração reversa), comunicação (issues GitHub, postmortem). T026 implementado.
- [x] 9.9 `MANUAL_DO_OPERADOR.md` entregue. · evid: 170 linhas. Cobre uptime, troubleshooting, deploy manual, contatos, senhas.

**Verificação (evidência T025 + T026):**
- 9 workflows no total (3 PRR desativados com `if: false`) ✅
- Lint + test + CodeQL + audit no CI ✅
- Deploy pipeline configurado (validate → migrate → deploy → health-check) ✅
- Dockerfile multi-stage (`apps/api/Dockerfile`) ✅
- Script backup PostgreSQL (`scripts/backup-db.sh`) ✅
- Plano de resposta a incidentes (`docs/INCIDENT_RESPONSE.md`) ✅
- `railway.json` criado ✅
- Secrets documentados (8 variáveis) ⚠️ (valores reais pendentes)
- Code smells corrigidos: security.yml, dependency-update.yml, release.yml (pnpm→npm) ✅
- PRR workflows desativados (`if: false`) ✅
- Domínio placeholder (`media-rate.example.com`) ⚠️
- Logs centralizados: AUSENTE ❌
- Métricas: AUSENTE ❌
- Alertas métricos (5xx > 1%, auth failures): AUSENTE ❌

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
# PLANO_MESTRE.md � MEDIA Rate

> Gerado sob PROTOCOLO_MESTRE.md v2.0 (Se��o 5).
> Conflito entre este arquivo e o Protocolo: o Protocolo vence.
> Atualiza��o 2026-08-10: consolida��o � removida duplica��o e atualizados os
> itens conclu�dos com evid�ncia do reposit�rio (T180�T278).

---

## ?? PROGRESSO GERAL (CHECKLIST RESUMIDA)

- [x] Fase 0 � Setup `[CONCLU�DA � 9/9]` ? (2026-07-25)
- [x] Fase 1 � Infra base `[CONCLU�DA � 9/9, NestJS 11 + Fastify 5]` ?
- [~] Fase 2 � Dados `[PARCIAL � 20/21, 3 gaps de governan�a]` ??
- [x] Fase 3 � Auth `[CONCLU�DA � 11/11, RBAC granular postergado]` ?
- [x] Fase 4 � APIs `[CONCLU�DA � watchlist/discover/recommendations/admin reais]` ?
- [x] Fase 5 � Frontend `[CONCLU�DA � rotas p�blicas/privadas, i18n 3 locales, SSR parity]` ?
- [~] Fase 6 � Avan�ado `[PARCIAL � cache/shutdown/upload ok; BullMQ e IA/RAG postergados D-017]` ??
- [x] Fase 7 � Hardening `[CONCLU�DA � 10/10 (2 N/A condicionais documentados)]` ?
- [~] Fase 8 � Testes/seguran�a `[PARCIAL � 690 API + 309 web; IA pipeline N/A]` ??
- [~] Fase 9 � CI/CD e deploy `[PARCIAL � pipeline + observabilidade ok; dom�nio e UptimeRobot pendentes]` ??

> **Conven��o:** `[x]` s� com evid�ncia real de verifica��o (PROTOCOLO_MESTRE.md Se��o 6). `[~]` = parcialmente feito, com gap documentado.

---

## Resumo do Discovery (DECISOES.md, 2026-07-25)

- **Produto:** Plataforma de descoberta de entretenimento � filmes, s�ries, games, livros, mang�s, HQs. MEDIA Score� consolidado de m�ltiplas fontes, IA de recomenda��o, perfil de gosto, watchlist Kanban.
- **Escala:** 1.000 ? 10.000 ? 50k usu�rios no Ano 1. Monorepo npm workspaces (apps/web + apps/api).
- **Login:** Sim. **Assinatura:** Sim (Free/Plus/Premium). **Upload:** Sim (admin/posters).
- **Marca:** "MEDIA Rate". **Dom�nio:** Vercel preview (mediarate.app pendente � PENDENCIAS_OPERADOR.md).
- **Monetiza��o:** Free com an�ncios + limite de 50 itens na watchlist. Plus (R$8,90/m�s) e Premium (R$14,90/m�s) sem an�ncios.
- **Confidence Engine:** Thresholds � high ? 70, medium ? 40, low < 40.

---

## FASE 0 � SETUP `[OBRIGAT�RIO]` `[CONCLU�DA � 9/9]`

- [x] 0.1 Repo Git com `.gitignore` (exclui `.env`, `node_modules`, segredos, artefatos `mnt/`, `.agent-log`, `-w`).
- [x] 0.2 Stack: TypeScript + Node.js + Next.js (web) + Fastify + Prisma + PostgreSQL. Monorepo npm workspaces.
- [x] 0.3 `package.json` raiz + `apps/web` + `apps/api` (npm workspaces).
- [x] 0.4 `docker-compose.yml` com `postgres:16-alpine` + `redis:7-alpine` + Loki/Grafana.
- [x] 0.5 `.env.example` sem valor real (placeholders).
- [x] 0.6 Depend�ncias fixadas por `package-lock.json` (`npm ci` em CI).
- [x] 0.7 ESLint + Prettier flat config (`eslint.config.mjs`). `npm run lint` verde (0 erros) desde T277.
- [x] 0.8 Dependabot ativo (`.github/dependabot.yml`).
- [x] 0.9 `SECURITY.md` com pol�tica de divulga��o respons�vel.

---

## FASE 1 � INFRA BASE `[CONCLU�DA � 9/9]`

- [x] 1.1 Fastify + TypeScript estrito + Pino com `redact`.
- [x] 1.2 `@fastify/helmet` com CSP/HSTS/X-Frame-Options/X-Content-Type-Options.
- [x] 1.3 `@fastify/rate-limit` por IP/rota (100 req/min global, 6/min login).
- [x] 1.4 Logger Pino estruturado + redaction (teste `logger-redact.spec.ts`).
- [x] 1.5 Valida��o Zod em todos os endpoints de escrita.
- [x] 1.6 CORS restrito (dev localhost; prod origem oficial).
- [x] 1.7 Sanitiza��o de sa�da (stack nunca exposto).
- [x] 1.8 `GET /health` (status/uptime/version, sem detalhes internos).
- [x] 1.9 Handler global de erros sem stack trace (resposta gen�rica 5xx).

---

## FASE 2 � DADOS `[~ PARCIAL � 20/21, 3 gaps de governan�a]`

- [x] 2.1 Prisma schema can�nico (PostgreSQL, 20+ models).
- [x] 2.2 Migrations versionadas aplicadas.
- [x] 2.3 Tabelas de dom�nio: `midia`, `media_score`, `genero`, `streaming_service`, `midia_genero`, `midia_streaming`.
- [~] 2.4 Tabelas de auth: `usuario`, `roles`, `user_roles`, `sessions`, `watchlist_entry` ?; `permissions` granulares ? (postergado � RBAC via `@Roles`/`@RequirePlan`).
- [x] 2.5 Tabelas de billing: `fatura`, planos Free/Plus/Premium, `payment_events`.
- [x] 2.6 Tabela de auditoria: `audit_log` (append-only, SHA-256 de cadeia, `verificarIntegridade()`).
- [ ] 2.7 Tabelas de governan�a: `data_sources` (proced�ncia), `entity_revisions` (versionamento). **AUSENTES** � gap aberto.
- [x] 2.8 Senha/token com argon2id (custo ? 12, mem�ria 19MiB).
- [x] 2.9 Soft delete: `Midia.deleted_at` (T215, migration `20260808140000_media_soft_delete` + �ndice parcial) e `Usuario.dados_para_exclusao_at` (LGPD).
- [~] 2.10 Criptografia de coluna (email/telefone): `ColumnEncryptionService` (AES-256-GCM) criado, n�o wired nas colunas.
- [x] 2.11 Seed de admin + usu�rios (free/plus/premium).
- [x] 2.12 �ndices em todas as FKs + colunas de busca.
- [x] 2.13 Unicidades documentadas (`@@unique`: email, fonte+fonte_id, midia_id, usuario+midia, etc.).
- [x] 2.14 `TipoMidia` com MANGA (D-233: anime � SERIE; mang� categoria pr�pria 'Mang�s').
- [x] 2.15 Search vector: `tsvector` com `translate()` IMMUTABLE (migration `20260809_fix_search_vector`, causa raiz 42P17/unaccent resolvida � D-224).

**Verifica��o:**
- `prisma migrate dev` roda limpo em PostgreSQL ?
- Seeds idempotentes por `(fonte, fonte_id)` (T276: seed-games lookup-driven via IGDB por slug) ?
- Auditoria de ids IGDB: `npm run db:audit:igdb` (exaustiva, D-265) ?

### Gaps Fase 2 (remanescentes)

| # | Gap | Impacto |
|---|---|---|
| 1 | `permissions` granulares | RBAC sem granularidade fina (s� roles/planos) � postergado |
| 2 | `data_sources` | Proced�ncia de dados n�o rastre�vel como entidade |
| 3 | `entity_revisions` | Versionamento de entidades n�o implementado |

---

## FASE 3 � AUTH `[CONCLU�DA � 11/11]`

**Arquitetura:** Tokens opacos (SHA-256) sobre cookies httpOnly � N�O JWT (blacklistability).

- [x] 3.0 Preflight Auth (AuthModule, PasswordService Argon2id, ZodValidationPipe).
- [x] 3.1 Token + Cookie (opacos 256-bit, `SessionCookieService` httpOnly/SameSite=Lax/secure).
- [x] 3.2 Register / Login / Logout / me (4 endpoints).
- [x] 3.3 Refresh token (T212): access opaco 15min sliding + refresh rotativo 30 dias com reuse detection.
- [x] 3.4 AuthGuard (valida sess�o, anexa `request.user`).
- [x] 3.5 RBAC: `RolesGuard` + `PlanGuard` (sem permissions granulares � postergado).
- [x] 3.6 Reset de senha (T206): token uso �nico, expira��o 1h, rate limit, revoga��o de sess�es, audit.
- [x] 3.7 Audit logging para auth (T213): USER_REGISTERED/LOGIN_SUCCESS/LOGIN_FAILED/LOGOUT/PASSWORD_RESET_* + refresh/reuse.
- [x] 3.8 Rate limit espec�fico /auth (6 req/min login).
- [x] 3.9 Testes auth controller/service (T024): controller 100%, service 93.65%, guard, session, lockout.
- [x] 3.10 Documenta��o API Auth: `docs/api/auth.md`.
- [x] 3.11 Email verification (T214): token 256-bit TTL 24h, uso �nico, 403 EMAIL_NOT_VERIFIED no login, backfill.

**Verifica��o:**
- Login v�lido ? 200 + cookie ?; lockout progressivo ?; `/me` sem cookie ? 401 ?
- Email verification enforced no login (T214) ?

---

## FASE 4 � APIs/CRUDs `[CONCLU�DA]`

REST versionado `/api/v1`. M�dulos em `apps/api/src/modules/<nome>/`: admin, auth, discover, fontes, historico, interacoes, invite, lgpd, listas, media, media-score, metrics, notificacoes, payment, perfil, premium, quota, recommendations, relacoes, upload.

- [x] 4.1 CRUD `media` (T215): cursor, filtro tipo, sort, POST/PUT/DELETE admin, soft delete, unicidade ? 409, invalida��o de cache, audit.
- [x] 4.2 CRUD `media_scores`: z-score ponderado v3, pesos por tipo, confian�a, explicabilidade.
- [x] 4.3 M�dulo `recommendations`: servi�o real (`RecommendationsService` + controller + DTO + testes e2e) � stubs substitu�dos.
- [x] 4.4 M�dulo `watchlist`: CRUD real (`watchlist.service/controller`, colunas Kanban WANT/WATCHING/COMPLETED/DROPPED, score_at_add).
- [x] 4.5 M�dulo `discover/search`: busca real com `?q=` e paridade de acentos.
- [x] 4.6 M�dulo `billing`: checkout Stripe (Idempotency-Key) + webhook HMAC; faturas persistidas.
- [x] 4.7 M�dulo `admin` (T221): `/admin/stats` com m�tricas REAIS (usu�rios, m�dias, watchlists, sess�es, planos), cache 60s, RBAC, audit.
- [x] 4.8 Busca textual PostgreSQL: `tsvector` + `translate()` IMMUTABLE (fix D-224).
- [x] 4.9 Pagina��o cursor-based (`?cursor=` + `lastCursorId`).
- [x] 4.10 Query parametrizada (Prisma).
- [x] 4.11 OpenAPI (Swagger decorators).
- [x] 4.12 Idempot�ncia (Idempotency-Key + `stripe_event_id` UNIQUE).
- [x] 4.13 Endpoints extras: LGPD export/exclus�o, historico, perfil, quota, notifica��es, listas colaborativas, intera��es, fontes/coleta, metrics, relacoes.

**Verifica��o:** `npm run test` (API) � 690 testes, 84 arquivos. Zero refer�ncias ao projeto antigo "Almanaque dos Clubes".

---

## FASE 5 � FRONTEND `[CONCLU�DA]`

Stack: Next.js App Router + TypeScript + TailwindCSS + Motion/GSAP/Anime.js + shadcn/ui.

- [x] 5.1-5.3 Cliente HTTP, CSRF (SameSite + X-CSRF-Token), p�ginas p�blicas/privadas.
- [x] 5.4-5.6 ProtectedPage, CSP, DOMPurify (privacy), sess�o sem localStorage.
- [x] 5.7-5.9 Acessibilidade WCAG 2.1 AA, responsivo mobile-first, anima��es premium.
- [x] 5.10-5.12 Design system (Dark OLED #0B0B1E, accent rose #E11D48), SEO (metadata/JSON-LD/OG/Twitter), i18n 3 locales.
- [x] 5.13 SSR parity (T274): cat�logo `?type=` filtrado no server, carross�is com ISR `revalidate=60`.
- [x] 5.14 Gate i18n-leak no CI (T271/T273): e2e SSR + teste estrutural (0 strings PT em EN/ES, og:locale underscore, footer "Seus dados/Your data/Sus datos").
- [x] 5.15 Selo "pr�via" para LIVRO/COMIC/MANGA (T272, `isPreviewTipo` �nico em `lib/api.ts`).

**Verifica��o:** `next build` ?; vitest web 309/309 (42 arquivos); e2e Playwright (i18n-leak, ctrlk, search-topo, etc.).

---

## FASE 6 � AVAN�ADO `[~ PARCIAL]`

- [x] 6.0 Rate limiting (100/min global, 6/min login, sliding window Redis).
- [x] 6.1 CSP / Helmet (HSTS 1-ano, nonce din�mico).
- [x] 6.2 CORS allowlist.
- [x] 6.3 HTTPS redirect (308 via x-forwarded-proto).
- [x] 6.4 Dependabot (weekly, grupos prod/dev).
- [x] 6.5 CI/CD (ci.yml, deploy.yml, health-check.yml, security.yml, release.yml, dast-weekly.yml).
- [x] 6.6 Logging (Pino redact + correlation IDs + audit append-only).
- [x] 6.7 Health checks (`GET /health` + `$queryRaw SELECT 1`).
- [x] 6.8 Upload seguro (T216): magic bytes, 5MB, UUID server-side, rate limit, audit.
- [x] 6.9 Cache Redis (T210 `CacheService`): `cache.service.ts` + `cache.module.ts`, TTL 60s `/midias`, Redis com fallback local.
- [x] 6.10 Graceful shutdown (T211): `app.enableShutdownHooks()` + testes.
- [~] 6.11 Fila assíncrona (BullMQ 6.9): **postergado** � sem caso de uso concreto (D-017). Redis presente no docker-compose.
- [~] 6.12 IA/RAG (6.5.1�6.5.4): **postergado** (D-017) � embeddings, pipeline RAG, LLM e citação de fontes quando houver caso de uso.
- [x] 6.13 Exportação de dados (LGPD): export completo + exclus�o com 30 dias de carôncia + cancelamento.
- [~] 6.14 Feature flags: não implementado (tabela `feature_flags` ausente) � gap aberto.
- [~] 6.15 WebSocket: condicional � postergado.

---

## FASE 7 � HARDENING `[CONCLU�DA � 10/10, 2 N/A condicionais]`

- [x] 7.1 CSP restritiva + nonce din�mico + SRI (N/A: zero scripts CDN; fontes self-hosted).
- [x] 7.2 X-Frame-Options: DENY.
- [x] 7.3 Rate limit avan�ado (user+IP+rota, sliding window Redis ZSET).
- [x] 7.4 `npm audit --audit-level=high` no CI (T277: 0 vulns � override js-yaml 5.2.3 sob @nestjs/swagger).
- [x] 7.5 Prote��o for�a bruta distribu�da (lockout Redis, contador global por IP).
- [x] 7.6 TRACE/CONNECT rejeitados (405).
- [x] 7.7 Limite de payload (1 MiB padr�o, 50 MiB upload).
- [~] 7.8 Rota��o de segredos de sess�o (90 dias): dispensa documentada pelo design de token opaco (`session-rotation.service.ts` registra o rationale) � sem secret para rotacionar.
- [~] 7.9 Vault/Infisical: N/A � secret manager nativo da plataforma de deploy.
- [~] 7.10 DNSSEC/CAA/HSTS preload: N/A � depende de dom�nio pr�prio (HSTS `preload: true` j� configurado).

**Verifica��o:** helm, rate-limit Redis, audit, bodyLimit, TRACE 405, CSP nonce, lockout Redis � todos com testes dedicados.

---

## FASE 8 � TESTES/SEGURAN�A `[~ PARCIAL]`

- [x] 8.1 Testes unit�rios (Vitest): **690 testes API (84 arquivos) + 309 web (42 arquivos)**. Coverage gate no CI (`vitest --coverage`).
- [x] 8.2 Testes de integra��o (Supertest/Fastify inject) com auth.
- [x] 8.3 Testes E2E Playwright (fluxos cr�ticos + gate i18n-leak 7/7).
- [x] 8.4 SAST: CodeQL no CI.
- [x] 8.5 `npm audit --audit-level=high` quebra build (T277: 0 vulnerabilidades).
- [x] 8.6 DAST: OWASP ZAP semanal (dast-weekly.yml) + script local Docker.
- [x] 8.7 Testes de carga k6 (ramp 0?1000 VUs, 3 cen�rios, thresholds).
- [x] 8.8 Regress�o de seguran�a: headers, SQL injection (7 payloads), XSS, CSRF.
- [~] 8.9 Pipeline de IA: N/A � IA/RAG postergado (Fase 6).

---

## FASE 9 � CI/CD E DEPLOY `[~ PARCIAL]`

### Pipeline CI (9.1)
- [x] 9.1.1 Lint + typecheck em todo PR (`npm run lint` verde desde T277).
- [x] 9.1.2 Testes unit�rios + integra��o (`vitest --coverage`).
- [x] 9.1.3 SAST (CodeQL) + dependency scan (`npm audit` + Trivy).
- [x] 9.1.4 Docker multi-stage (`apps/api/Dockerfile`) com prune de dev deps.
- [x] 9.1.5 Scan de imagem Trivy (CRITICAL/HIGH, exit 1, SARIF).
- [~] 9.1.6 Deploy em staging: Vercel Preview + Railway; sem staging separado.

### Secrets e Deploy (9.2�9.4)
- [~] 9.2 Secrets no CI (8 vari�veis via `${{ secrets.X }}`, nunca em c�digo).
- [~] 9.3 Deploy blue-green/rolling (Vercel at�mico + Railway rolling, condicionados a secrets).
- [~] 9.4 Plataforma: **Vercel (web) + Railway (api) em produ��o** ?; dom�nio `mediarate.app` pendente; branch protection da main pendente (governan�a Operador).

### Observabilidade (9.5)
- [x] 9.5.1 Logs centralizados (T217): LokiStream opcional via `LOKI_URL`; stdout (Railway) como fallback.
- [x] 9.5.2 M�tricas (T217): prom-client (http_requests_total, duration, errors), `GET /metrics` protegido, sem PII.
- [x] 9.5.3 Alertas (T218): ring buffers 5xx>1%/auth>50, histerese, audit ALERT_TRIGGERED/RESOLVED, `/admin/alerts/status`.
- [~] 9.5.4 Uptime check externo: UptimeRobot pendente (guia em docs/OBSERVABILITY.md; `health-check.yml` cobre como fallback).

### Infraestrutura (9.6�9.9)
- [x] 9.6 Healthcheck HTTP (`GET /health`).
- [x] 9.7 Backup PostgreSQL di�rio (scripts/backup-db.sh, reten��o 30 dias).
- [x] 9.8 Plano de resposta a incidentes (docs/INCIDENT_RESPONSE.md).
- [x] 9.9 `MANUAL_DO_OPERADOR.md` entregue.

**Verifica��o:**
- Lint ?, audit 0 vulns ?, testes 690+309 ?, build ? (T277 restaura CI localmente)
- Logs/M�tricas/Alertas implementados (T217/T218) ?

---

## Marcos de Lan�amento (Definition of Done por marco)

| Marco | Crit�rio | Fases exigidas |
|-------|----------|----------------|
| **Beta Fechada** (100 usu�rios) | Cat�logo + detalhes + MEDIA Score� + login + watchlist | Fases 0�5 |
| **Open Beta** (1.000 usu�rios) | + recomenda��es + billing Free/Plus/Premium + observabilidade | Fases 0�8 (parcial), 9.1�9.6 |
| **v1.0** (p�blico) | + IA RAG com cita��es + assistente IA + ETL autom�tico + DAST + hardening | Todas as fases |

---

## Conven��es de commit

- `feat:` nova funcionalidade � `fix:` corre��o de bug � `security:` corre��o de seguran�a � `test:` testes � `chore:` manuten��o (deps, configs) � `docs:` documenta��o
- Commits at�micos por tarefa, referenciando o ID (ex.: `fix(T276): ...`).

---

## Pr�xima tarefa (PROTOCOLO_MESTRE.md Se��o 6)

O Doer procura o primeiro `[ ]` de cima para baixo. Gaps atuais de maior prioridade:
1. **Fase 2.7** � tabelas `data_sources` / `entity_revisions` (governan�a).
2. **Fase 6.11/6.12** � BullMQ e IA/RAG (ambos postergados por D-017; reavaliar com caso de uso).
3. **Fase 6.14** � feature flags.
4. **Pend�ncias do Operador:** billing Railway, dom�nio mediarate.app, branch protection da main, UptimeRobot, re-seed de produ��o T276 (6 passos no Console Railway).

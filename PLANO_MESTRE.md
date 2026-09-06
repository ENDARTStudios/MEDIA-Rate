# PLANO_MESTRE.md — MEDIA Rate

> Gerado sob PROTOCOLO_MESTRE.md v2.0 (Seção 5).
> Conflito entre este arquivo e o Protocolo: o Protocolo vence.
> Atualização 2026-08-10: consolidação — removida duplicação e atualizados os
> itens concluídos com evidência do repositório (T180–T278). F11 (D-279)
> registrada em 2026-08-10.

---

## 📋 PROGRESSO GERAL (CHECKLIST RESUMIDA)

- [x] Fase 0 – Setup `[CONCLUÍDA — 9/9]` ✅ (2026-07-25)
- [x] Fase 1 – Infra base `[CONCLUÍDA — 9/9, NestJS 11 + Fastify 5]` ✅
- [~] Fase 2 – Dados `[PARCIAL — 20/21, 3 gaps de governança]` ⚠️
- [x] Fase 3 – Auth `[CONCLUÍDA — 11/11, RBAC granular postergado]` ✅
- [x] Fase 4 – APIs `[CONCLUÍDA — watchlist/discover/recommendations/admin reais]` ✅
- [x] Fase 5 – Frontend `[CONCLUÍDA — rotas públicas/privadas, i18n 3 locales, SSR parity]` ✅
- [~] Fase 6 – Avançado `[PARCIAL — cache/shutdown/upload ok; BullMQ e IA/RAG postergados D-017]` ⚠️
- [x] Fase 7 – Hardening `[CONCLUÍDA — 10/10 (2 N/A condicionais documentados)]` ✅
- [~] Fase 8 – Testes/segurança `[PARCIAL — 700+ API + 309 web; IA pipeline N/A]` ⚠️
- [~] Fase 9 – CI/CD e deploy `[PARCIAL — pipeline + observabilidade ok; domínio e UptimeRobot pendentes]` ⚠️
- [~] Fase 10 – Image Optimization `[EM ANDAMENTO — T029 concluída (D-439); T030–T033 abertas]` ⚠️
- [~] Fase 11 – PRD + Addenda + Arquitetura `[EM ANDAMENTO — T279/T280 concluídas; T285/T286 em curso]` ⚠️
- [x] Fase 14 – Polimento final `[CONCLUÍDA — D-369…D-397]` ✅
- [x] Fase 15 – Melhoria contínua `[CONCLUÍDA — T405 perf 46→63; D-402/D-403]` ✅

> **Convenção:** `[x]` só com evidência real de verificação (PROTOCOLO_MESTRE.md Seção 6). `[~]` = parcialmente feito, com gap documentado.

---

## Resumo do Discovery (DECISOES.md, 2026-07-25)

- **Produto:** Plataforma de descoberta de entretenimento — filmes, séries, games, livros, mangás, HQs. MEDIA Score™ consolidado de múltiplas fontes, IA de recomendação, perfil de gosto, watchlist Kanban.
- **Escala:** 1.000 → 10.000 → 50k usuários no Ano 1. Monorepo npm workspaces (apps/web + apps/api).
- **Login:** Sim. **Assinatura:** Sim (Free/Plus/Premium). **Upload:** Sim (admin/posters).
- **Marca:** "MEDIA Rate". **Domínio:** Vercel preview (mediarate.app pendente — PENDENCIAS_OPERADOR.md).
- **Monetização:** Free com anúncios + limite de 50 itens na watchlist. Plus (R$8,90/mês) e Premium (R$14,90/mês) sem anúncios.
- **Confidence Engine:** Thresholds — high ≥ 70, medium ≥ 40, low < 40.

---

## FASE 0 — SETUP `[OBRIGATÓRIO]` `[CONCLUÍDA — 9/9]`

- [x] 0.1 Repo Git com `.gitignore` (exclui `.env`, `node_modules`, segredos, artefatos `mnt/`, `.agent-log`, `-w`).
- [x] 0.2 Stack: TypeScript + Node.js + Next.js (web) + Fastify + Prisma + PostgreSQL. Monorepo npm workspaces.
- [x] 0.3 `package.json` raiz + `apps/web` + `apps/api` (npm workspaces).
- [x] 0.4 `docker-compose.yml` com `postgres:16-alpine` + `redis:7-alpine` + Loki/Grafana.
- [x] 0.5 `.env.example` sem valor real (placeholders).
- [x] 0.6 Dependências fixadas por `package-lock.json` (`npm ci` em CI).
- [x] 0.7 ESLint + Prettier flat config (`eslint.config.mjs`). `npm run lint` verde (0 erros) desde T277.
- [x] 0.8 Dependabot ativo (`.github/dependabot.yml`).
- [x] 0.9 `SECURITY.md` com política de divulgação responsável.

---

## FASE 1 — INFRA BASE `[CONCLUÍDA — 9/9]`

- [x] 1.1 Fastify + TypeScript estrito + Pino com `redact`.
- [x] 1.2 `@fastify/helmet` com CSP/HSTS/X-Frame-Options/X-Content-Type-Options.
- [x] 1.3 `@fastify/rate-limit` por IP/rota (100 req/min global, 6/min login).
- [x] 1.4 Logger Pino estruturado + redaction (teste `logger-redact.spec.ts`).
- [x] 1.5 Validação Zod em todos os endpoints de escrita.
- [x] 1.6 CORS restrito (dev localhost; prod origem oficial).
- [x] 1.7 Sanitização de saída (stack nunca exposto).
- [x] 1.8 `GET /health` (status/uptime/version, sem detalhes internos).
- [x] 1.9 Handler global de erros sem stack trace (resposta genérica 5xx).

---

## FASE 2 — DADOS `[~ PARCIAL — 20/21, 3 gaps de governança]`

- [x] 2.1 Prisma schema canônico (PostgreSQL, 20+ models).
- [x] 2.2 Migrations versionadas aplicadas.
- [x] 2.3 Tabelas de domínio: `midia`, `media_score`, `genero`, `streaming_service`, `midia_genero`, `midia_streaming`.
- [~] 2.4 Tabelas de auth: `usuario`, `roles`, `user_roles`, `sessions`, `watchlist_entry` ✅; `permissions` granulares ❌ (postergado — RBAC via `@Roles`/`@RequirePlan`).
- [x] 2.5 Tabelas de billing: `fatura`, planos Free/Plus/Premium, `payment_events`.
- [x] 2.6 Tabela de auditoria: `audit_log` (append-only, SHA-256 de cadeia, `verificarIntegridade()`).
- [ ] 2.7 Tabelas de governança: `data_sources` (procedência), `entity_revisions` (versionamento). **AUSENTES** — gap aberto.
- [x] 2.8 Senha/token com argon2id (custo ≥ 12, memória 19MiB).
- [x] 2.9 Soft delete: `Midia.deleted_at` (T215) + índice parcial + filtro em todas as leituras (T280: recommendations/relacoes/slug).
- [~] 2.10 Criptografia de coluna (email/telefone): `ColumnEncryptionService` (AES-256-GCM) criado, não wired nas colunas.
- [x] 2.11 Seed de admin + usuários (free/plus/premium).
- [x] 2.12 Índices em todas as FKs + colunas de busca.
- [x] 2.13 Unicidades documentadas (`@@unique`: email, fonte+fonte_id, midia_id, usuario+midia, etc.).
- [x] 2.14 `TipoMidia` com MANGA (D-233: anime é SERIE; mangá categoria própria 'Mangás').
- [x] 2.15 Search vector: `tsvector` com `translate()` IMMUTABLE (migration `20260809_fix_search_vector`, D-224).

**Verificação:**
- `prisma migrate dev` roda limpo em PostgreSQL ✅
- Seeds idempotentes por `(fonte, fonte_id)` (T276: seed-games lookup-driven via IGDB por slug) ✅
- Auditoria de ids IGDB: `npm run db:audit:igdb` (exaustiva, D-265/T283 com classificação por nome) ✅

### Gaps Fase 2 (remanescentes)

| # | Gap | Impacto |
|---|---|---|
| 1 | `permissions` granulares | RBAC sem granularidade fina (só roles/planos) — postergado |
| 2 | `data_sources` | Procedência de dados não rastreável como entidade |
| 3 | `entity_revisions` | Versionamento de entidades não implementado |

---

## FASE 3 — AUTH `[CONCLUÍDA — 11/11]`

**Arquitetura:** Tokens opacos (SHA-256) sobre cookies httpOnly — NÃO JWT (blacklistability).

- [x] 3.0 Preflight Auth (AuthModule, PasswordService Argon2id, ZodValidationPipe).
- [x] 3.1 Token + Cookie (opacos 256-bit, `SessionCookieService` httpOnly/SameSite=Lax/secure).
- [x] 3.2 Register / Login / Logout / me (4 endpoints).
- [x] 3.3 Refresh token (T212): access opaco 15min sliding + refresh rotativo 30 dias com reuse detection.
- [x] 3.4 AuthGuard (valida sessão, anexa `request.user`).
- [x] 3.5 RBAC: `RolesGuard` + `PlanGuard` (sem permissions granulares — postergado).
- [x] 3.6 Reset de senha (T206): token uso único, expiração 1h, rate limit, revogação de sessões, audit.
- [x] 3.7 Audit logging para auth (T213): USER_REGISTERED/LOGIN_SUCCESS/LOGIN_FAILED/LOGOUT/PASSWORD_RESET_* + refresh/reuse.
- [x] 3.8 Rate limit específico /auth (6 req/min login).
- [x] 3.9 Testes auth controller/service (T024): controller 100%, service 93.65%, guard, session, lockout.
- [x] 3.10 Documentação API Auth: `docs/api/auth.md`.
- [x] 3.11 Email verification (T214): token 256-bit TTL 24h, uso único, 403 EMAIL_NOT_VERIFIED no login, backfill.

**Verificação:**
- Login válido → 200 + cookie ✅; lockout progressivo ✅; `/me` sem cookie → 401 ✅
- Email verification enforced no login (T214) ✅

---

## FASE 4 — APIs/CRUDs `[CONCLUÍDA]`

REST versionado `/api/v1`. Módulos em `apps/api/src/modules/<nome>/`: admin, auth, discover, fontes, historico, interacoes, invite, lgpd, listas, media, media-score, metrics, notificacoes, payment, perfil, premium, quota, recommendations, relacoes, upload.

- [x] 4.1 CRUD `media` (T215): cursor, filtro tipo, sort, POST/PUT/DELETE admin, soft delete, unicidade → 409, invalidação de cache, audit.
- [x] 4.2 CRUD `media_scores`: z-score ponderado v3, pesos por tipo, confiança, explicabilidade.
- [x] 4.3 Módulo `recommendations`: serviço real (`RecommendationsService` + controller + DTO + testes e2e) — stubs substituídos.
- [x] 4.4 Módulo `watchlist`: CRUD real (`watchlist.service/controller`, colunas Kanban WANT/WATCHING/COMPLETED/DROPPED, score_at_add).
- [x] 4.5 Módulo `discover/search`: busca real com `?q=` e paridade de acentos (T279: `::uuid` no na_watchlist).
- [x] 4.6 Módulo `billing`: checkout Stripe (Idempotency-Key) + webhook HMAC; faturas persistidas.
- [x] 4.7 Módulo `admin` (T221): `/admin/stats` com métricas REAIS, cache 60s, RBAC, audit.
- [x] 4.8 Busca textual PostgreSQL: `tsvector` + `translate()` IMMUTABLE (fix D-224).
- [x] 4.9 Paginação cursor-based (`?cursor=` + `lastCursorId`).
- [x] 4.10 Query parametrizada (Prisma).
- [x] 4.11 OpenAPI (Swagger decorators).
- [x] 4.12 Idempotência (Idempotency-Key + `stripe_event_id` UNIQUE).
- [x] 4.13 Endpoints extras: LGPD export/exclusão, historico, perfil, quota, notificações, listas colaborativas, interações, fontes/coleta, metrics, relacoes.

**Verificação:** `npm run test` (API) — 703 testes, 84+ arquivos. Zero referências ao projeto antigo "Almanaque dos Clubes".

---

## FASE 5 — FRONTEND `[CONCLUÍDA]`

Stack: Next.js App Router + TypeScript + TailwindCSS + Motion/GSAP/Anime.js + shadcn/ui.

- [x] 5.1-5.3 Cliente HTTP, CSRF (SameSite + X-CSRF-Token), páginas públicas/privadas.
- [x] 5.4-5.6 ProtectedPage, CSP, DOMPurify (privacy), sessão sem localStorage.
- [x] 5.7-5.9 Acessibilidade WCAG 2.1 AA, responsivo mobile-first, animações premium.
- [x] 5.10-5.12 Design system (Dark OLED #0B0B1E, accent rose #E11D48), SEO (metadata/JSON-LD/OG/Twitter), i18n 3 locales.
- [x] 5.13 SSR parity (T274): catálogo `?type=` filtrado no server, carrosséis com ISR `revalidate=60`. Correção D-439/R031: build T030 mostra 98 páginas, todas dinâmicas (mídia não-SSG; multiplicador de varredura = sitemap × 3 locales).
- [x] 5.14 Gate i18n-leak no CI (T271/T273): e2e SSR + teste estrutural.
- [x] 5.15 Selo "prévia" para LIVRO/COMIC/MANGA (T272, `isPreviewTipo` único em `lib/api.ts`).

**Verificação:** `next build` ✅; vitest web 309/309; e2e Playwright (i18n-leak, ctrlk, search-topo, etc.).

---

## FASE 6 — AVANÇADO `[~ PARCIAL]`

- [x] 6.0 Rate limiting (100/min global, 6/min login, sliding window Redis).
- [x] 6.1 CSP / Helmet (HSTS 1-ano, nonce dinâmico).
- [x] 6.2 CORS allowlist.
- [x] 6.3 HTTPS redirect (308 via x-forwarded-proto).
- [x] 6.4 Dependabot (weekly, grupos prod/dev).
- [x] 6.5 CI/CD (ci.yml, deploy.yml, health-check.yml, security.yml, release.yml, dast-weekly.yml).
- [x] 6.6 Logging (Pino redact + correlation IDs + audit append-only).
- [x] 6.7 Health checks (`GET /health` + `$queryRaw SELECT 1`).
- [x] 6.8 Upload seguro (T216): magic bytes, 5MB, UUID server-side, rate limit, audit.
- [x] 6.9 Cache Redis (T210 `CacheService`): TTL 60s `/midias`, Redis com fallback local.
- [x] 6.10 Graceful shutdown (T211): `enableShutdownHooks()` + testes.
- [~] 6.11 Fila assíncrona (BullMQ): **postergado** — sem caso de uso concreto (D-017).
- [~] 6.12 IA/RAG: **postergado** (D-017).
- [x] 6.13 Exportação de dados (LGPD): export + exclusão com 30 dias de carência + cancelamento.
- [~] 6.14 Feature flags: não implementado — gap aberto (F11/T292 planejada).
- [~] 6.15 WebSocket: condicional — postergado.

---

## FASE 7 — HARDENING `[CONCLUÍDA — 10/10, 2 N/A condicionais]`

- [x] 7.1 CSP restritiva + nonce dinâmico + SRI (N/A: zero scripts CDN).
- [x] 7.2 X-Frame-Options: DENY.
- [x] 7.3 Rate limit avançado (user+IP+rota, sliding window Redis ZSET).
- [x] 7.4 `npm audit --audit-level=high` no CI (T277: 0 vulns — override js-yaml 5.2.3 sob @nestjs/swagger).
- [x] 7.5 Proteção força bruta distribuída (lockout Redis, contador global por IP).
- [x] 7.6 TRACE/CONNECT rejeitados (405).
- [x] 7.7 Limite de payload (1 MiB padrão, 50 MiB upload).
- [~] 7.8 Rotação de segredos de sessão: dispensa documentada pelo design de token opaco.
- [~] 7.9 Vault/Infisical: N/A — secret manager nativo da plataforma.
- [~] 7.10 DNSSEC/CAA/HSTS preload: N/A — depende de domínio próprio (HSTS `preload: true` configurado).

---

## FASE 8 — TESTES/SEGURANÇA `[~ PARCIAL]`

- [x] 8.1 Testes unitários (Vitest): **703 API + 309 web**. Coverage gate no CI.
- [x] 8.2 Testes de integração (Supertest/Fastify inject) com auth.
- [x] 8.3 Testes E2E Playwright (fluxos críticos + gate i18n-leak 7/7).
- [x] 8.4 SAST: CodeQL no CI.
- [x] 8.5 `npm audit --audit-level=high` quebra build (T277: 0 vulnerabilidades).
- [x] 8.6 DAST: OWASP ZAP semanal (dast-weekly.yml) + script local Docker.
- [x] 8.7 Testes de carga k6 (ramp 0→1000 VUs, 3 cenários, thresholds).
- [x] 8.8 Regressão de segurança: headers, SQL injection (7 payloads), XSS, CSRF.
- [~] 8.9 Pipeline de IA: N/A — IA/RAG postergado (Fase 6).

---

## FASE 9 — CI/CD E DEPLOY `[~ PARCIAL]`

- [x] 9.1.1 Lint + typecheck em todo PR (`npm run lint` verde desde T277).
- [x] 9.1.2 Testes unitários + integração (`vitest --coverage`).
- [x] 9.1.3 SAST (CodeQL) + dependency scan (`npm audit` + Trivy).
- [x] 9.1.4 Docker multi-stage (`apps/api/Dockerfile`) com prune de dev deps.
- [x] 9.1.5 Scan de imagem Trivy (CRITICAL/HIGH, exit 1, SARIF).
- [~] 9.1.6 Deploy em staging: Vercel Preview + Railway; sem staging separado.
- [~] 9.2 Secrets no CI (8 variáveis via `${{ secrets.X }}`).
- [~] 9.3 Deploy blue-green/rolling (Vercel atômico + Railway rolling).
- [~] 9.4 Plataforma: **Vercel (web) + Railway (api) em produção** ✅; domínio mediarate.app pendente; branch protection da main pendente.
- [x] 9.5.1 Logs centralizados (T217): LokiStream opcional via `LOKI_URL`.
- [x] 9.5.2 Métricas (T217): prom-client, `GET /metrics` protegido, sem PII.
- [x] 9.5.3 Alertas (T218): ring buffers, histerese, `/admin/alerts/status`.
- [~] 9.5.4 Uptime check externo: UptimeRobot pendente.
- [x] 9.6 Healthcheck HTTP (`GET /health`).
- [x] 9.7 Backup PostgreSQL diário (scripts/backup-db.sh, retenção 30 dias).
- [x] 9.8 Plano de resposta a incidentes (docs/INCIDENT_RESPONSE.md).
- [x] 9.9 `MANUAL_DO_OPERADOR.md` entregue.

---

## FASE 10 — IMAGE OPTIMIZATION `[~ EM ANDAMENTO]` (D-439, 2026-09-06)

Motivo: Image Transformations em ~99% da cota Hobby (4.969/5.000/mês, baseline ~165/dia). Co-causas: crawlers (H1) + variantes de runtime sem tokens (H2).

- [x] T029 — auditoria image optimization (robots aberto, defaults Next, sem sharp, unoptimized inconsistente, H3 refutada) · evid: D-439
- [x] T030 — robots por bot (grupos A/B) + noindex em previews via VERCEL_ENV · SEO preservado · evid: test 4/4 + build OK
- [x] T034 — conformidade de handoffs (schema oneOf D-442 + validator alinhado) · evid: integrity 7/7
- [x] T031 — variantes no upload via sharp (com backfill do acervo remoto) · evid: upload 89.6% + builds OK
- [x] T032 — tokens deviceSizes/imageSizes + padronizar unoptimized/quality · evid: test 6/6 + build OK + srcset 11→8
- [ ] T033 — runbook semanal de uso (MANUAL_DO_OPERADOR.md)

---

## FASE 11 — PRD + ADDENDA + ARQUITETURA/GOVERNANÇA `[~ EM ANDAMENTO]` (D-279, 2026-08-10)

Fonte: `MEDIA_Rate_PRD.md` + `MEDIA_Rate_Arquitetura_Governanca.md` (anexados pelo Operador).
Ordem fatiada por valor/risco (D-279). Já existe e NÃO será refeito: grafo RelacaoObra (T225-T229),
watchlist Kanban com status de consumo (T238/T249), i18n 3 locales, `?type=` SSR (T274), selo prévia (T272).

- [x] P0 T279 — discover autenticado em produção (`::uuid` em na_watchlist — erro 42883) + credentials no searchMedia
- [x] P0 T280 — filtro soft-delete nas leituras que vazavam (recommendations, relacoes/grafo, candidatos de slug)
- [x] T324 — sprint: votos reais nos adapters OpenCritic/AniList/Kitsu (commit `56f3884`) — pull Bayesiano do MEDIA Score v3 ganha massa nas categorias games/anime/mangá; lições D-312 (votos = contagem real, nunca popularity; Number() na fronteira do adapter)
- [x] T322 — reparo de órfãos curtidos (commit `065550c`): script `db:reparo:orfaos` + endpoint `PATCH /watchlist/:id/relink` + CTA "Buscar substituta"; run em produção pendente do Operador
- [x] T323 — triagem da revisão externa (15 HIGH confirmados) em `docs/REVISAO_EXTERNA_TRIAGEM.md` · tarefas T325–T341 priorizadas
- [x] T325 — correção HIGH #1: CsrfGuard global em métodos mutantes (commit `0917a41`) + cookie csrf persistente + checkout envia X-CSRF-Token
- [x] T326 — correção HIGH #2: IdempotencyInterceptor global (mutante+autenticado+Idempotency-Key, commit `5b56f5d`) com `IdempotencyStore` (hash + TTL 24h)
- [x] T327 — correção HIGH #3: trial único por usuário (`trial_used_at`, commit `b7b4db2`) — gate 409 no checkout PLUS + marca idempotente na ativação
- [x] T341 — mailer transacional provider-agnostic p/ eventos de pagamento (commit `73ee2cd`): MailerService + MailTemplateService (escape HTML) + MockMailTransport + dedupe 24h
- [x] T343 — escritas de billing sob `comContextoRls` (role SERVICE, commit `1742cbc`) — prepara FORCE RLS em `usuario_plano` (T344/T345 aguardam Postgres de teste)
- [x] T329 — painel de diagnóstico interno read-only (commit `c00d075`): `GET /api/v1/admin/diagnostics` @Roles(ADMIN) + página `/admin/diagnostics`
- [x] T346 — perf HIGH original: DiagPanel web dispara chamadas só quando ativo `?diag=1` (commit `f0b5c87`) — eliminado 2 requests por pageview
- [x] T342 — mailer transacional nos fluxos de auth (verificação/reset, commit `3aaad1d`): MockMailService vira facade do MailerService + templates com escape + dedupe off
- [x] T347 — runbook único do Operador (commit `f8778a7`): `docs/RUNBOOK_OPERADOR_FINAL.md` (6 passos: Postgres teste → migrate → reparo T322 → deploys → mailer real → verificação)
- [x] T349 — infra: portas parametrizadas no compose + Postgres de teste em 5434 (commit `19c9b02`) — desbloqueia T344/T345
- [x] T344/T345 — RLS FORCE em `usuario_plano` (owner+SERVICE+ADMIN) + isolamento A≠B (commit `a893f64`): leitores sob `comContextoRls`, teste e2e real `rls-usuario-plano.e2e.spec.ts` 5/5
- [x] T348 — transport real do mailer (Resend, commit `b7f913a`): `ResendMailTransport` (fetch nativo) + `criarTransport()` (resend se `MAIL_PROVIDER=resend`+`RESEND_API_KEY`, senão mock) — entrega real gateada só na chave do Operador
- [x] 1. T285 — reações (Gostei/Não gostei), motivo de abandono e progresso (Addendum 4): migration aditiva + PATCH + prompt i18n + hook onReacaoRegistrada · evid: R285
- [x] 2. T286 — DiscoveryEvent + feed Descobertas (Addenda 3/4): eventos idempotentes + GET /discoveries + página + métrica no admin · evid: R286
- [x] 3. T287 — classificação indicativa + prêmios + origem (Addendum 2) com seed TMDB/IGDB · evid: R287
- [x] 4. T288 — notas por temporada/episódio + remoção do mock `/tv` (fecha residual D-267) · evid: R288
- [x] 5. T289 — `tenant_id` aditivo (coluna + default, sem mudar queries) — Arquitetura §4 · evid: R289
- [x] 6. T290 — RLS (EXIGE aprovação do Operador + premortem + teste usuário A≠B) — Arquitetura §5 · evid: R290
- [x] 7. T291 — role CURATOR + endpoints de curadoria — Arquitetura §3 · evid: R291
- [x] 8. T292 — feature flags (tabela + 1 flag real: rollout do feed) — Arquitetura §7 · evid: R292
- [x] 9. T293 — Sentry (após conta free do Operador) — Arquitetura §8 · evid: R293
- [x] 10. T294 — gate de segurança CI completo (checklist Parte 10, incluindo scan NEXT_PUBLIC) · evid: R294
- [x] 11. T295 — dashboard de métricas pessoais (Addendum 1) · evid: R295
- [x] 12. T296 — hero/ícones 3D (polish, por último) · evid: R296

**Pendências do Operador para F11:** billing Railway; aprovação específica para T290 (RLS) e T293 (Sentry);
WAF/Cloudflare + domínio próprio.

---

## Marcos de Lançamento (Definition of Done por marco)

| Marco | Critério | Fases exigidas |
|-------|----------|----------------|
| **Beta Fechada** (100 usuários) | Catálogo + detalhes + MEDIA Score™ + login + watchlist | Fases 0–5 |
| **Open Beta** (1.000 usuários) | + recomendações + billing Free/Plus/Premium + observabilidade | Fases 0–8 (parcial), 9.1–9.6 |
| **v1.0** (público) | + IA RAG com citações + assistente IA + ETL automático + DAST + hardening | Todas as fases |

---

## Convenções de commit

- `feat:` nova funcionalidade · `fix:` correção de bug · `security:` correção de segurança · `test:` testes · `chore:` manutenção (deps, configs) · `docs:` documentação
- Commits atômicos por tarefa, referenciando o ID (ex.: `fix(T276): ...`).

---

## Próxima tarefa (PROTOCOLO_MESTRE.md Seção 6)

O Doer procura o primeiro `[ ]` de cima para baixo. Gaps atuais de maior prioridade:
1. **Fase 2.7** — tabelas `data_sources` / `entity_revisions` (governança).
2. **Fase 6.11/6.12** — BullMQ e IA/RAG (postergados por D-017).
3. **Fase 6.14** — feature flags (planejada em F11/T292).
4. **F11 em andamento** — T285 → T286 → T287... (ordem D-279).
5. **Pendências do Operador:** billing Railway, domínio mediarate.app, branch protection da main, UptimeRobot.

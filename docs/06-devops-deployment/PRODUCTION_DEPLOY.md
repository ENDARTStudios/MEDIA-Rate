# PRODUCTION_DEPLOY — Deploy de produção e rollback

Verdade operacional: **D-527** (resumo em [ARCHITECTURE](../02-architecture-design/ARCHITECTURE.md)).
Runbooks completos: `docs/BOAS_PRATICAS_DEPLOY.md` · `docs/RUNBOOK_PRODUCAO.md`.

## O que dispara produção

Apenas **merge em `main`** (merge commit — nunca squash: o revert cirúrgico depende
da forma do merge). Duas pontas INDEPENDENTES disparam juntas:

1. **Railway (API)**: build+deploy nativo; o **entrypoint aplica `prisma migrate
   deploy` no boot** — migrations vão junto com o código, SEM estágio prévio.
2. **Vercel (web)**: deploy de produção pela integração Git.

O workflow `deploy.yml` do GitHub é **validação + health check pós-promoção**
(com retries) — não é gate pré-deploy (staging = P012, pendência do Operador).

## Passo a passo (merge condicional autorizado)

1. **Pré**: CI verde no head final; auditoria de diff; scan de segredos; PRs abertas
   checadas para novos required checks (lição P011/D-533).
2. `gh pr merge N --merge --subject "Merge pull request #N from …"`.
3. **Monitorar** (os três sinais):
   ```bash
   gh run list --workflow=deploy.yml --branch=main --limit 1   # deploy.yml
   railway deployment list --service "MEDIA Rate" --environment production
   vercel ls                                                   # web Ready
   ```
4. **Smoke obrigatório** ([QA_TESTING](QA_TESTING.md)) — mínimo + específico da mudança.
5. **Evidência**: comentário no PR + worklog (+ DECISOES se mudou regra).
6. Branch deletada **só depois do smoke verde**.

## Rollback

- **Deploy ruim**: `git revert -m 1 <merge-commit>` → PR do revert → merge → as duas
  pontas reimplantam o estado anterior. Fora incidente registrado, nada de force
  push/reset em `main` (D-457).
- **Migration ruim**: revert do merge + `prisma migrate resolve --rolled-back <nome>`
   no caminho manual decidido (P013) — o plano específico DEVE estar na seção
   `## Rollback` do PR (contrato B1) e o backup diário existe (9.7).

## Proibições (regra dura)

- `migrate-production.yml` NÃO executar (workflow manual existe, mas o caminho de
  rede ao banco é decisão pendente do Operador — P013/`docs/06-devops-deployment/b1-prod-guards.md` §3).
- `--prod` flags, force push, reset em `main`, deploy direto por CLI fora de incidente.
- Merge de PR com check vermelho ou "Expected" pendente.


---

> **Fundido de:** `docs/BOAS_PRATICAS_DEPLOY.md` (Fase 3, T112 - conteudo preservado na integra abaixo)

# Boas práticas — Deploy (Vercel)

> Registro permanente do incidente P0 de 2026-08 (D-385/D-386): um `vercel deploy`
> a partir de `apps/web` usou um vínculo local órfão e sobrescreveu a produção de
> OUTRO projeto (`almanaque-dos-clubes`). O projeto foi recuperado promovendo o
> deploy anterior via `vercel promote`.

## Regra (obrigatória)

1. **NUNCA** executar `vercel deploy` sem antes confirmar o projeto alvo:
   - `vercel link` mostra o projeto vinculado ao diretório atual, ou
   - `vercel inspect <url-do-deploy>` mostra o projeto de um deploy, ou
   - `Get-Content .vercel/project.json` (raiz do monorepo deve ser `media-rate`).
2. Em caso de dúvida, **sempre** rodar `vercel deploy --prod` a partir da **raiz do monorepo**
   (`media-rate` está corretamente vinculado lá), nunca de dentro de `apps/web`.
3. `apps/web/.vercel/project.json` deve apontar para `media-rate`
   (`prj_4cS36A1QBOiM7iInnwPAhSTSAOFm`). Se apontar para outro `projectId`, corrigir.

## Por quê

O repositório teve dois vínculos Vercel simultâneos (raiz → `media-rate`, e
`apps/web/.vercel` → `almanaque-dos-clubes`). O CLI usa o vínculo mais próximo
do diretório corrente — e um `.vercel` órfão em `apps/web` fez o deploy ir para
o projeto errado. `.vercel/` é gitignored (não vai em commit); a proteção é o
**hábito de validar o alvo**, não um arquivo versionado.

## Rollback (se ocorrer de novo)

- `vercel ls` (no diretório do projeto errado) lista o histórico.
- `vercel promote <deployment-url-anterior>` devolve o alias de produção ao
  deploy anterior. Ex.: `vercel promote almanaque-dos-clubes-lsg926irg-end-art-studios.vercel.app`.

## Checklist rápido antes de deploy manual

- [ ] `vercel link` aponta para `media-rate`?
- [ ] `Get-Content .vercel/project.json` mostra `prj_4cS36A1QBOiM7iInnwPAhSTSAOFm`?
- [ ] Rodando a partir da raiz do monorepo?


---

> **Fundido de:** `docs/RUNBOOK_PRODUCAO.md` (Fase 3, T112 - conteudo preservado na integra abaixo)

# Runbook de Produção — MEDIA Rate

Procedimentos operacionais validados para o ambiente de produção.

## Origens (web ≠ API)

Existem **duas** origens em produção e não é a mesma coisa:

- **API** (Railway): `https://media-rate-production.up.railway.app` — só JSON
  (`/health`, `/api/v1/*`). Não serve páginas (ex.: `/pt-BR/register` → 404 JSON).
- **Web** (Vercel): `https://media-rate-end-art-studios.vercel.app` — Next.js com
  as páginas (`/register`, `/dashboard`, Ctrl+K). Em produção o front usa URL
  **relativa** para `/api/*` (rewrite same-origin → Railway, http.ts `getBaseUrl`).

Ao rodar spot-checks de UI use a origem **web** (Vercel). A origem Railway só
serve a API.

> Regra D-275: scripts executáveis em produção vivem em pastas copiadas pela
> imagem (`prisma/`) ou são compilados para `dist/`. Nunca alterar o Dockerfile
> só para hospedar um script novo.

## Conteúdo

1. [Spot-checks autenticados](#spot-checks-autenticados)

---

## Spot-checks autenticados

Validação end-to-end dos fluxos autenticados em produção: gating do dashboard
por plano, Ctrl+K logado, isolamento RLS A≠B e stats de admin.

### Arquivo

- Spec: `apps/web/e2e/authenticated-spotchecks.spec.ts`
- Screenshots: `apps/web/e2e/screenshots/t305-*.png`

### Fluxos cobertos

| # | Fluxo | Asserção |
|---|-------|----------|
| a | Free → `/dashboard` | prompt de upgrade ("Dashboard é Plus/Premium") e **sem** `svg[aria-label="Radar"]` |
| b | Plus → `/dashboard` | radar `svg[aria-label="Radar"]` visível e **sem** `svg[aria-label="Temporal"]` |
| c | Premium → `/dashboard` | radar + `svg[aria-label="Temporal"]` visíveis |
| d | Ctrl+K logado | digita "duna" na paleta → ≥1 resultado (`[role="dialog"] button`) |
| e | RLS A≠B | B tenta `PATCH /api/v1/watchlist/:id` de A → 404/403/401 |
| f | Admin | `GET /api/v1/admin/stats` → contagem agregada não-zero |

### Pré-condição: contas de plano verificadas

Os fluxos (a/b/c/f) dependem de usuários de teste **verificados** (o login de
quem não verificou retorna `403 EMAIL_NOT_VERIFIED`, auth.service.ts) e com o
**plano correto**. As credenciais são lidas de env — nunca hardcode:

- `TEST_USER_FREE_EMAIL` / `TEST_USER_FREE_PASSWORD`
- `TEST_USER_PLUS_EMAIL` / `TEST_USER_PLUS_PASSWORD`
- `TEST_USER_PREMIUM_EMAIL` / `TEST_USER_PREMIUM_PASSWORD`
- `TEST_USER_ADMIN_EMAIL` / `TEST_USER_ADMIN_PASSWORD`

Quando uma credencial está ausente, o teste correspondente é **skipado** (o spec
continua rodando os demais). Os fluxos (d) e (e) reusam as contas provisionadas
(free/plus) — **não** usam registro via UI (que loopa em produção, ver abaixo).

> ⚠️ **NUNCA** usar `npm run db:seed` em produção para criar os usuários: o seed
> principal **apaga todas as tabelas** (midia, temporada, episodio, watchlist,
> usuario…). O provisionamento de contas de teste em produção deve ser um
> upsert pontual e idempotente, com consentimento explícito do Operador.

### Provisionar contas (upsert não-destrutivo)

```bash
# apps/api — via tunel (railway connect postgres --tunnel-only) apontando
# DATABASE_URL para 127.0.0.1:PORT/railway. NUNCA via db:seed (destrutivo).
TEST_USERS_PASSWORD="Senha@123" npm run db:provision:test-users
```

Cria/atualiza `free@/plus@/premium@/admin@mediarate.test` (verificados, plano
correto; admin com papel ADMIN) e adiciona interações de consumo para Plus/Premium
— o radar só renderiza com dados de `usuario_midia_interacao` (DashboardClient) e
o sparkline temporal exige `CONCLUIDO`/`CONSUMINDO`.

### Como rodar localmente

```bash
# apps/web — Origem WEB (Vercel). A origem Railway é só API.
# Use --workers=1: o submit do form de login é estável sem paralelismo.
PLAYWRIGHT_BASE_URL="https://media-rate-end-art-studios.vercel.app/pt-BR" \
TEST_USER_FREE_EMAIL="..." TEST_USER_FREE_PASSWORD="..." \
TEST_USER_PLUS_EMAIL="..." TEST_USER_PLUS_PASSWORD="..." \
TEST_USER_PREMIUM_EMAIL="..." TEST_USER_PREMIUM_PASSWORD="..." \
TEST_USER_ADMIN_EMAIL="..." TEST_USER_ADMIN_PASSWORD="..." \
npx playwright test e2e/authenticated-spotchecks.spec.ts --project=chromium --workers=1
```

### Observação: registro → /dashboard em produção (T303)

Ao registrar um usuário novo via UI na origem web, o fluxo pós-registro cai em
`ERR_TOO_MANY_REDIRECTS`: `/dashboard` exige o cookie de sessão `sess`
(middleware.ts) e, sem ele, redireciona para `/login` — que redireciona de volta —
formando o loop. Investigação pertence a **T303** (CI diagnóstico / HEAD vermelho).
Até lá, fluxos autenticados dependem de contas provisionadas com sessão válida
(login direto), não de registro via UI.

### Verificação

- `/health` → 200.
- Output do Playwright: `passed`/`failed` por teste.
- Screenshots em `apps/web/e2e/screenshots/` (um por fluxo a–f).


---

> **Fundido de:** `docs/DEPLOY_CLOUDFLARE.md` (Fase 3, T112 - conteudo preservado na integra abaixo)

# DEPLOY_CLOUDFLARE.md — migração do web para Cloudflare (T454/T463)

> **FASE A COMMITADA (wiring completo); ainda sem deploy.** O runbook sai de
> DRAFT quando o rollout atingir ≥10% sem regressão de métricas (criterio de
> pronto da T454). Nenhum deploy Cloudflare antes de PR mergeado com CI verde
> (D-457/D-459 — sem bypass).

## Estado (T454 Fase A, 2026-09-15)

- `@opennextjs/cloudflare` ^1.20.6 + `wrangler` ^4.132.0 em devDependencies.
- `npm run build:cf` (`opennextjs-cloudflare build`) **provado localmente**:
  gera `.open-next/worker.js` sem credenciais.
- `wrangler.jsonc` commitado com **account_id + nome do projeto apenas**
  (D-507: tokens via CI/secrets, nunca no repo).
- `open-next.config.ts`: cache incremental **KV** (`NEXT_INC_CACHE_KV`) +
  tag cache **KV** (`NEXT_TAG_CACHE_KV`) — ISR `revalidate = 3600` (T447)
  durável entre isolates e `/api/revalidate` on-demand purgando além do
  isolate local.
- **Hook de roteamento no middleware** (`src/middleware.ts` +
  `src/lib/platform-routing.ts`): busca a flag `cloudflare_migration`
  (PostHog `local_evaluation`, cache 5 min, fallback **OFF**) e decide via
  `decidirPlataforma()` (bucket FNV-1a estável por distinctId) → header
  `x-mr-platform` + cookie anônimo `x-mr-uid`. **Não redireciona** — o
  destino por usuário é roteado na camada de proxy/CDN; o middleware
  instrumenta a decisão por request.
- `WEB_REVALIDATE_URL` (API) aceita **lista separada por vírgulas** — no
  dual-deploy o `/api/revalidate` dispara para Vercel E Cloudflare.
- **Worker de assets** (D-495): `apps/web/workers/assets/` — serve o bucket
  com `Cache-Control: immutable` (chave content-addressed), content-type do
  objeto, sem listagem. Deploy manual pelo Operador (wrangler deploy).
- CI: job **Build OpenNext (CF, informativo)** com `continue-on-error` —
  prova continuamente que o artefato worker é gerado; promoção a requerido
  só por decisão registrada (após rollout ≥50%).

## Matriz de compatibilidade (Next.js 16 App Router × Workers/OpenNext)

| # | Item | Uso atual | Veredito | Plano |
|---|------|-----------|----------|-------|
| 1 | Middleware (locale via next-intl + guard de rotas privadas) | `src/middleware.ts` — `NextRequest/NextResponse` puro | **ok** | OpenNext executa middleware no worker; testar redirects/cookies no preview (T454) |
| 2 | ISR `revalidate = 3600` (home, T447) + `POST /api/revalidate` on-demand | `src/app/[locale]/page.tsx`, `src/app/api/revalidate/route.ts` | **rework concluído na Fase A** | Cache incremental KV (`NEXT_INC_CACHE_KV`) + tag cache KV (`NEXT_TAG_CACHE_KV`) wired no `open-next.config.ts`; namespaces criadas pelo Operador no deploy |
| 3 | `next/image` + variantes (D-445, `unoptimized` helper em `MediaCardShell`) | otimização na Vercel hoje | **rework (médio)** | Loader de Cloudflare Images (ou `unoptimized` como ponte); medir transformações antes/depois |
| 4 | APIs `node:` em runtime server | `node:crypto` (timingSafeEqual) em `src/lib/revalidate-auth.ts` (T447) | **ok** | `nodejs_compat` já habilitada no `wrangler.jsonc` |
| 5 | `force-dynamic` + `revalidate = 0` (dashboard, watchlist — T412/D-390) | rotas autenticadas nunca em cache | **ok** | OpenNext respeita `dynamic`; revalidar no preview |
| 6 | Fontes (`next/font` — Space_Grotesk etc.) | self-hosted pelo Next | **ok** | Assets estáticos via binding ASSETS |
| 7 | Headers de segurança/CSP (`next.config.ts` headers) | aplicados no edge Vercel hoje | **ok** | OpenNext aplica headers do next.config; conferir no preview |
| 8 | Client-only (Stripe.js, PostHog, Sentry browser) | bundle do browser | **ok** | Inalterado — roda no cliente |
| 9 | Server actions/routes com segredo (`REVALIDATE_SECRET`, cookies CSRF) | `process.env` server-side | **ok** | Variáveis entram como secrets do Worker (Operador, T454) |
| 10 | Suíte E2E (allowlist T461) | `next dev` no CI | **ok** | Rodar allowlist contra o preview Cloudflare na T454 |

**Bloqueantes: nenhum.** Reworks: itens 2 e 3 (ambos com caminho conhecido).

## Rollout (T454 — gate de métricas por etapa)

`decidirPlataforma()` lê a flag `cloudflare_migration` (PostHog, id 886344)
no middleware e expõe `x-mr-platform` por request. Etapas:

| Etapa | Ação do Operador | Gate para avançar |
|---|---|---|
| 0% (atual) | flag em 0% | — |
| 10% | subir flag p/ 10 | **≥24h** + LCP/CLS/error-rate sem regressão vs baseline |
| 50% | subir p/ 50 | idem |
| 100% | subir p/ 100 + descomissionar Vercel | idem + decidir promover job `build:cf` a requerido |

- **Rollback**: flag → 0 (instantâneo; Vercel permanece canônica até 100%).
- Métricas comparadas via Sentry (error-rate) + PostHog/RUM (LCP, CLS)
  contra o baseline capturado antes da primeira elevação.
- `CNAME cf.mediarate.app` no provedor DNS quando a T454 solicitar (zona só
  migra no fim).

## Provisionamento pendente do Operador (bloqueiam DEPLOY, não a Fase A)

0. **Ativar os produtos na conta Cloudflare** (D-510/S0): Workers, R2 e KV —
   em 2026-09-16 o deploy do canário retornou `7003 Could not route` para
   `/workers/services`, `/r2/buckets` e `/storage/kv/namespaces` (produtos
   não ativados/rooteados para a conta). R2: dash.cloudflare.com → R2 →
   ativar (plano free, 10 GB). Workers/KV: aceitar termos no primeiro
   deploy/dashboard. **Status 2026-09-16T23:3xZ**: R2 ativado (billing +
   bucket visível) e API S3 funcional da rede local (PUT/GET/LIST 200), MAS
   o endpoint S3 rejeita TLS do egress Railway → **ticket de suporte
   pronto**:
   ```
   Subject: R2 S3 endpoint serves TLS alert 40 to Railway egress IPs; works from residential IP
   Account ID: eceaf501758d87a2bcdf7f2ce2238bc

   The R2 S3 API endpoint eceaf501758d87a2bcdf7f2ce2238bc
   .r2.cloudflarestorage.com rejects the TLS handshake (alert 40, no
   certificate served) for requests originating from Railway.com egress IP
   ranges — while the SAME SDK, credentials, bucket and key succeed from a
   residential connection (PUT/HEAD/GET/LIST all 200). Control test from
   the same Railway container to api.cloudflare.com negotiates TLS 1.3
   normally (HTTP 301). Forcing TLS 1.2 and widening cipher suites does not
   change the result. This blocks production uploads (R2 PutObject from our
   Railway-hosted API).

   Request: check IP-level security/filtering for this account's
   r2.cloudflarestorage.com SNI route against Railway egress ranges, or
   advise the supported path.
   ```
   (Operador abre em dash.cloudflare.com → Support; se o suporte não
   resolver, alternativa de engenharia: Worker de upload com binding R2
   nativo — decisão do Thinker.)
1. Criar as **2 namespaces KV** (T468): o token atual (R2 item-write) NÃO
   cobre KV — duas opções:
   - **Dashboard** (2 cliques): Workers & Pages → KV → Create Namespace →
     `media-rate-NEXT_INC_CACHE_KV` e `media-rate-NEXT_TAG_CACHE_KV`;
   - **CLI** com token que tenha `Workers KV Storage:Edit`:
     ```bash
     npx wrangler kv namespace create MEDIA_RATE_NEXT_INC_CACHE
     npx wrangler kv namespace create MEDIA_RATE_NEXT_TAG_CACHE
     ```
   Depois preencher os `id` reais em `wrangler.jsonc`:
   ```jsonc
   "kv_namespaces": [
     { "binding": "NEXT_INC_CACHE_KV", "id": "<namespace-id-1>" },
     { "binding": "NEXT_TAG_CACHE_KV", "id": "<namespace-id-2>" }
   ]
   ```
   **KV free tier ≈1.000 writes/dia — métrica de gate no canário** (D-514):
   aproximação do limite = decisão de custo do Operador (nunca auto-upgrade).
2. Token Cloudflare escopado (Pages:Edit, R2 rw, Images:Edit) como secret
   do CI/deploy — **nunca no repo**.
3. `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` como secrets do
   deploy (middleware lê a flag server-side; sem eles → fallback OFF).
4. `R2_*` confirmadas no Railway (upload sai do 503 fail-closed).
5. Deploy do Worker de assets: `cd apps/web/workers/assets && npx wrangler deploy`.
6. `CNAME cf.mediarate.app` quando a T454 solicitar.
7. `DATABASE_URL` (GitHub secret) → URL pública proxy **ou** acesso via
   `railway run` (incidente migrate, D-491/T461).

## Procedimento de rollback (T454)

Flag `cloudflare_migration` → 0% no PostHog (dashboard ou CLI — ver
docs/OBSERVABILITY.md). Vercel permanece ativa durante todo o dual-deploy.

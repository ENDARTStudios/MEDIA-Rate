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
   deploy/dashboard.
1. Criar as **2 namespaces KV** e preencher os `id` em `wrangler.jsonc`
   (`NEXT_INC_CACHE_KV`, `NEXT_TAG_CACHE_KV`) — snippet:
   ```jsonc
   "kv_namespaces": [
     { "binding": "NEXT_INC_CACHE_KV", "id": "<namespace-id-1>" },
     { "binding": "NEXT_TAG_CACHE_KV", "id": "<namespace-id-2>" }
   ]
   ```
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

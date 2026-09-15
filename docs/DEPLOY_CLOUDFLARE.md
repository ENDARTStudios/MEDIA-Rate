# DEPLOY_CLOUDFLARE.md — migração do web para Cloudflare (T454/T463)

> **DRAFT-PENDING-PROVISIONING** — nenhum deploy foi feito; nenhum
> account ID/token existe neste repositório. Este doc registra o que é
> sabido e **provado localmente** (T463/D-493) para que a T454 — quando o
> Operador entregar o provisioning — seja execução, não descoberta.

## Estado (T463, 2026-09-15)

- `@opennextjs/cloudflare` ^1.20.6 + `wrangler` ^4.132.0 em devDependencies.
- `npm run build:cf` (`opennextjs-cloudflare build`) **provado localmente**:
  gera `.open-next/worker.js` (~2,3 KB + assets) sem credenciais.
  `wrangler.jsonc` commitado contém APENAS nome/entrypoint/compat-date
  (nenhum ID) — provisioning real completa account_id/routes/bindings.
- `decidirPlataforma()` (`apps/web/src/lib/cf-routing.ts`): função pura de
  rollout (bucket FNV-1a determinístico por distinctId, default OFF),
  10 testes unitários. **Não wireada** no middleware — isso é T454.

## Matriz de compatibilidade (Next.js 16 App Router × Workers/OpenNext)

| # | Item | Uso atual | Veredito | Plano |
|---|------|-----------|----------|-------|
| 1 | Middleware (locale via next-intl + guard de rotas privadas) | `src/middleware.ts` — `NextRequest/NextResponse` puro | **ok** | OpenNext executa middleware no worker; testar redirects/cookies no preview (T454) |
| 2 | ISR `revalidate = 3600` (home, T447) + `POST /api/revalidate` on-demand | `src/app/[locale]/page.tsx`, `src/app/api/revalidate/route.ts` | **rework (médio)** | Cache incremental DURÁVEL: `defineCloudflareConfig` com KV incremental cache (sem isso, cache é por-isolate e o on-demand não purga globalmente). Gate no `open-next.config.ts` na T454 |
| 3 | `next/image` + variantes (D-445, `unoptimized` helper em `MediaCardShell`) | otimização na Vercel hoje | **rework (médio)** | Loader de Cloudflare Images (ou `unoptimized` como ponte); medir transformações antes/depois |
| 4 | APIs `node:` em runtime server | `node:crypto` (timingSafeEqual) em `src/lib/revalidate-auth.ts` (T447) | **ok** | `nodejs_compat` já habilitada no `wrangler.jsonc` |
| 5 | `force-dynamic` + `revalidate = 0` (dashboard, watchlist — T412/D-390) | rotas autenticadas nunca em cache | **ok** | OpenNext respeita `dynamic`; revalidar no preview |
| 6 | Fontes (`next/font` — Space_Grotesk etc.) | self-hosted pelo Next | **ok** | Assets estáticos via binding ASSETS |
| 7 | Headers de segurança/CSP (`next.config.ts` headers) | aplicados no edge Vercel hoje | **ok** | OpenNext aplica headers do next.config; conferir no preview |
| 8 | Client-only (Stripe.js, PostHog, Sentry browser) | bundle do browser | **ok** | Inalterado — roda no cliente |
| 9 | Server actions/routes com segredo (`REVALIDATE_SECRET`, cookies CSRF) | `process.env` server-side | **ok** | Variáveis entram como secrets do Worker (Operador, T454) |
| 10 | Suíte E2E (allowlist T461) | `next dev` no CI | **ok** | Rodar allowlist contra o preview Cloudflare na T454 |

**Bloqueantes: nenhum.** Reworks: itens 2 e 3 (ambos com caminho conhecido).

## Rollout (plano da T454 — gateado no provisioning)

`decidirPlataforma()` lê a flag `cloudflare_migration` (PostHog, id 886344):
0% = Vercel (hoje) → 10% → 50% → 100% (Cloudflare total + descomissionar
Vercel). Métricas por etapa via Sentry/PostHog; rollback = flag a 0%.

## Pendências do Operador (bloqueiam a T454)

1. `CLOUDFLARE_ACCOUNT_ID` (+ token com Pages:Edit, R2 rw, Images:Edit) no
   `.env` — presença do token confirmada 2026-09-15; account_id ainda não.
2. Bucket R2 criado (mesmo bucket alimenta `R2_*` no Railway — upload T453);
   Cloudflare Images habilitado no plano.
3. Domínio do dual-deploy (ex.: `cf.mediarate.app`).
4. Secret `DATABASE_URL` do GitHub **atualizado para a URL pública proxy** —
   em 2026-09-15 o workflow Deploy falhou na etapa `Database Migration` com
   `P1001` porque o secret contém o hostname interno
   (`postgres.railway.internal`), inalcançável de runners do Actions.

## Procedimento de rollback (T454)

Flag `cloudflare_migration` → 0% no PostHog (dashboard ou CLI — ver
docs/OBSERVABILITY.md). Vercel permanece ativa durante todo o dual-deploy.

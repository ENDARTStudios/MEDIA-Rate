# HANDOFF — MEDIA Rate (F14-polimento-final) — retomada limpa

> Gerado ao fim de uma janela longa (Lote A + B + C + auditoria + T408).
> Estado íntegro em `main`, `git status` limpo. Último commit: **`c783a58`**.

---

## 1. Onde estamos

- **Projeto:** MEDIA Rate (plataforma de descoberta/agregação de avaliações).
- **Fase:** F14 — polimento final (3ª rodada de crítica do Operador).
- **Lote A** ✅ (bugs visíveis: localização trilíngue + menu "+" + slugs).
- **Lote B** ✅ (UX: hero/kanban/dashboard/descobertas).
- **Lote C** ⚠️ (auditoria + fixes): **T404/T406/T407 fechados**, **T405 parcial**, **T408 quase todo**.
- **Falta:** T405-ilhas (refactor RSC, não iniciado) + residual de cobertura EN de comics/mangás + decisões do Operador.

## 2. O que está FECHADO (commits em `main`)

| Lote | Tarefa | O quê | Estado |
|---|---|---|---|
| A | T400 | migração aditiva `titulo_en/es` + `sinopse_en/es` + backfill 624 mídias + cadeia canônica D-369 + e2e "The Thing" | ✅ |
| A | T398 | slug único (índice **parcial** WHERE `deleted_at IS NULL`) + slug-service | ✅ |
| A | T401 | D-375 dual-write (upsert de status cria `watchlist_entry`); e2e status-menu verde | ✅ |
| B | T394 | hero 6 ícones 96px que trocam o showcase + stat 6 tipos | ✅ |
| B | T395 | kanban horizontal (scroll-snap) | ✅ |
| B | T396 | dashboard timeline/histograma/streak para todos os planos | ✅ |
| B | T397 | descobertas com fallback por gênero (`MESMO_GENERO`) | ✅ |
| C | T402 | gating restaurado (radar=Plus, evolução=Premium; timeline/hist/streak=Free) | ✅ |
| C | T403 | auditoria profunda (Lighthouse 4 páginas + crawl 18 + 32 PNGs) | ✅ |
| C | T404 | CSP `style-src` + `accounts.google.com` (Google Sign-In) | ✅ |
| C | T406 | og:image de marca + hreflang + JSON-LD + títulos sem duplicação | ✅ |
| C | T407 | pôster BG3 → IGDB (`t_cover_big/co670h.jpg`) | ✅ |
| — | T408 | score honesto (`num_fontes` → "—" quando 0 fontes) + copy viva + Apple oculto | ⚠️ ver §3 |

## 3. TAREFAS ABERTAS (próxima janela)

### T405-performance-lcp (D-380 — padrão ILHAS, NÃO iniciado)
- **Gargalo já diagnosticado:** LCP simulado 9,1 s / TTI 10 s / main-thread 8,9 s; payload 2,15 MB. Causa = **hidratação dos 60 cards** dos 6 carrosséis (componentes client que hidratam inteiro), não a imagem.
- **Quick wins já em produção:** `fetchPriority="high"` + `sizes` no pôster (ScoreShowcase), hero sem fade de entrada, carrosséis via `next/dynamic`.
- **Decisão D-380 (a executar):** converter `MediaCarousel`/`MediaCard` para **Server Components + ilhas client** (shell do card sem hidratação; ilhas só para coração/StatusMenu/setas). Manter 60 links no HTML (T274).
- **Metas:** JS home <1,0 MB; TTI <5 s; LCP observado ≤2,5 s; perf ≥75; SEO 100 e a11y ≥90 mantidos; 60 links de cards no curl.

### T408-qualidade-dado-copy — residual
- **Falta:** cobertura EN de **COMIC 55%** e **MANGA 22%** (teto da busca por título PT no ComicVine/AniList). Precisa **mapa curado PT→EN** (como o `seed-titulo-en-mapa.ts` fez para livros) — decisão do Thinker.
- `-211.9` **não reproduzível** no estado atual (0 scores <0/>100 no banco; T390 já normalizou) — documentado, sem ação.

## 4. PENDÊNCIAS DO OPERADOR (2 + 1)

1. **Moeda do pricing (ESCALATE media):** "preço regional" (R$ BR / $ demais, configurar preços por moeda na Stripe) **ou** "preço único USD". Default se silêncio até fechar F14 = regional.
2. **Gate consolidado (a–h):** livro→livro com breadcrumb; `/en-US` "The Thing"; menu "+" ponta a ponta; hero tiles; kanban swipe; dashboard; descobertas; + **palavra do radar** ("radar free" ou silêncio = default gating).

## 5. FATOS TÉCNICOS

### Deploy
- **Web → Vercel** (auto no push para `main`; domínio `mediarate.app`).
- **API + Postgres → Railway** (auto; entrypoint roda `prisma migrate deploy`).
- Domínio de produção pode ter cache/CDN — validar em `https://media-rate-<id>-end-art-studios.vercel.app` (via `vercel ls`) se `mediarate.app` estiver desatualizado.

### Banco de produção (via túnel)
```powershell
railway connect Postgres --tunnel-only -P 554xx   # background; lê URL/creds do stdout
$env:DATABASE_URL = "postgresql://postgres:<SENHA>@127.0.0.1:<porta>/railway"
node --import @swc-node/register/esm-register prisma/<script>.ts
```
- **psql NÃO instalado**; usar Node + PrismaClient.
- Seeds idempotentes (skip por campo vazio / upsert).

### Usuários de teste (provisionados, VERIFICADOS)
- `free@mediarate.test`, `plus@mediarate.test`, `premium@mediarate.test`, `admin@mediarate.test`.
- Provisionar: `TEST_USERS_PASSWORD="<forte>" node ... prisma/provision-test-users.ts` (via túnel). **NÃO** importa `seed-posters.js` (executa `main()` no import — efeito colateral).
- e2e: env `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` (senha forte gerada via CLI, **nunca** impressa/commitada; arquivo `.e2e-pass` é gitignored e deve ser removido ao final).

### Secrets (NUNCA imprimir valores)
```powershell
$v = railway variables --json | ConvertFrom-Json   # ler pontual: $v.CHAVE
```
- NÃO rodar `railway variables --json` sem filtrar (lição D-344).
- Chaves no Railway: `TMDB_API_KEY`, `GOOGLE_BOOKS_API_KEY`, `COMICVINE_API_KEY`, `TWITCH_CLIENT_ID/SECRET`, `DATABASE_URL`, `ADMIN_TOKEN`, etc.

### Pitfalls
- `DECISOES.md` é encoding misto (UTF-8 com bytes CP1252 soltos) — editar/append via pwsh `[System.IO.File]::AppendAllText(..., [System.Text.UTF8Encoding]($false))`, não `read`/`edit`/`write`.
- `seed-posters.ts` executa `main()` no import — não importar; duplicar `urlSegura` localmente.
- Prisma `@unique` em coluna nullable permite múltiplos NULL (índice parcial é o certo p/ soft-delete).
- `ALTER TYPE ... ADD VALUE` não pode rodar com INSERT na MESMA migration (lição D-236/E55P04).
- `next build` regenera `apps/web/next-env.d.ts` → `git checkout --` antes de commit.
- Modelo **não lê imagens** — validação visual é do Operador (PNGs em `docs/screenshots/` / `docs/auditoria/`).

## 6. DECISÕES REGISTRADAS (DECISOES.md, cadeia F14)

- **D-369** cadeia canônica de localização · **D-370** checklist binário do Lote A · **D-371** checkpoint aceito · **D-372** schema-strict da TAREFA · **D-373** produção de rotina é do Doer · **D-374** residuais são do Doer + usuário verificado provisionado · **D-375** dual-write transacional interação×watchlist · **D-376** contrato de evidência + Lote B liberado · **D-377** desvio do radar (default + veto) · **D-378** fechamento em uma rodada · **D-379** auditoria → T404–T407 · **D-380** ilhas (RSC + client islands, sem sacrificar SEO).

## 7. ARQUIVOS-CHAVE

- `apps/web/src/components/media-rate-ui/MediaCarousel.tsx` + `MediaCard.tsx` — alvo do T405 (conversão ilhas).
- `apps/web/src/lib/score-utils.ts` + `api.ts` + `types.ts` — normalização de score + `numFontes`.
- `apps/web/src/lib/i18n-content.ts` — `titleForLocale`/`synopsisForLocale` (cadeia D-369).
- `apps/web/src/lib/seo.ts` — `OG_IMAGE_PADRAO`, `localizedAlternates`, `siteUrl`.
- `apps/api/src/modules/interacoes/interacoes.service.ts` — dual-write D-375 + fallback gênero T397.
- `apps/api/src/modules/dashboard/dashboard.service.ts` — streak/histograma + gating T402.
- `apps/api/src/modules/media/media.controller.ts` + `media.service.ts` + `slug-service.ts` — lista com `num_fontes`/`titulo_en`, slug único.
- `apps/api/prisma/seed-*.ts` — seeds idempotentes (localizacao, provision, fix-bg3, fix-slug-*).
- `apps/web/scripts/shot*.cjs` + `audit-crawl.cjs` — screenshots/auditoria Playwright.
- `docs/auditoria-profunda-2026-08-23.md` + `docs/lighthouse-reports/*.json` — evidência da auditoria.

## 8. ESTADO DE TESTES

- **API 818/818** · **web 307/307** verdes.
- e2e em produção: `localizacao` 2/2, `status-menu` 1/1, `dashboard-gating` 3/3.
- Lighthouse home pós-fix: LCP observado **2,9 s** (simulado 9,1 s); TTI 10 s (gargalo = hidratação → T405).

## 9. PRÓXIMA AÇÃO SUGERIDA

1. **Doer:** T405-ilhas (conversão RSC de carrosséis/cards → re-medir Lighthouse). Depois T408-residual (mapa curado EN de comics/mangás) se o Thinker autorizar.
2. **Operador:** responder moeda + gate consolidado + palavra do radar.
3. **Thinker:** revisão agregada da F14 e `[x]` no plano quando tudo verde.

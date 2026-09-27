# Auditoria Técnica Profunda — MEDIA Rate (produção)

**Data:** 2026-08-23 · **Escopo:** https://mediarate.app (todas as páginas públicas + privadas com usuário de teste provisionado) · **Tarefa:** T403 (F14)

**Ferramentas:** Lighthouse 13.4.1 (performance/a11y/best-practices/SEO), Playwright (crawl de 18 páginas, console errors, network, screenshots desktop+mobile), inspeção de metadados no HTML cru.

**Metodologia:** crawl de 16 rotas públicas nos 3 locales + 2 rotas privadas (dashboard/watchlist com `free@mediarate.test`); captura de TODOS os console errors e requests ≥400/lentos (>3s) por página; Lighthouse em 4 páginas-chave; validação manual de robots.txt, sitemap, CSP e metadados.

---

## 1. Lighthouse (scores /100)

| Página | Perf | A11y | BP | SEO | LCP | CLS | TBT | TTFB |
|---|---|---|---|---|---|---|---|---|
| Home `/pt-BR` | **46** | 97 | 96 | 100 | **9,1 s** | 0 | **1.530 ms** | 10 ms |
| Catálogo | 65 | 90 | 100 | 100 | 6,9 s | 0,021 | 440 ms | — |
| Ficha (filme) | 63 | 95 | 100 | 100 | 5,8 s | 0 | 600 ms | — |
| Planos | 75 | 91 | 100 | 100 | 4,9 s | 0 | 340 ms | — |

**Diagnóstico de performance:** o servidor é rápido (TTFB 10 ms), mas o **LCP chega a 9,1 s na home** e o **TBT a 1,5 s** — o gargalo é cliente: hidratação/execução de JS pesada + a imagem LCP (pôster do showcase/carrosséis) carregando tarde. Meta: Perf ≥ 90, LCP < 2,5 s.

---

## 2. Achados por severidade

### P0 (crítico)
Nenhum. Nenhuma página quebrada, nenhum 5xx, nenhum fluxo de receita bloqueado.

### P1 (alto)

**A1 — Performance abaixo da meta (Perf 46–75; LCP 4,9–9,1 s; TBT até 1,5 s).**
- Evidência: Lighthouse (tabela acima; reports em `docs/lighthouse-reports/*.json`).
- Causa raiz: TTFB 10 ms exclui o backend. TBT alto aponta hidratação/execução de JS no cliente; LCP tardio aponta imagem principal sem prioridade real e carregada após o JS.
- Fix sugerido: priorizar a imagem LCP (`priority` + `fetchPriority="high"` no pôster do showcase), reduzir JS de primeira dobra (code-split dos componentes abaixo da dobra), reavaliar `motion/react` no crítico. Re-medir com Lighthouse após cada passo.

**A2 — CSP bloqueia o CSS do Google Sign-In (botão do Google pode renderizar sem estilo).**
- Evidência: console error `Loading the stylesheet 'https://accounts.google.com/gsi/style' violates ... style-src 'self' 'unsafe-inline'` em TODAS as páginas com login; request `GET https://accounts.google.com/gsi/style` bloqueado.
- Causa raiz: `apps/web/next.config.ts` (headers CSP) — `style-src 'self' 'unsafe-inline'` não inclui `accounts.google.com`, enquanto `script-src` já o inclui (T361).
- Fix sugerido: `style-src 'self' 'unsafe-inline' https://accounts.google.com`.

### P2 (médio)

**B1 — Título duplicado no pricing:** `<title>Planos — MEDIA Rate | MEDIA Rate</title>`.
- Causa raiz: `pricing/page.tsx` retorna title "Planos — MEDIA Rate" e o template do layout acrescenta "| MEDIA Rate".
- Fix sugerido: title da página = "Planos" (o template já acrescenta a marca).

**B2 — og:image ausente na maioria das páginas** (home, catalog, pricing, login, register, sources, methodology, privacy, terms, dashboard, watchlist). Só as fichas têm (pôster).
- Causa raiz: `layout.tsx` `openGraph` sem `images`.
- Fix sugerido: og:image de marca (1200×630) no layout + por página quando houver imagem melhor.

**B3 — hreflang ausente em pricing, login, register e dashboard.**
- Causa raiz: essas páginas definem `generateMetadata` próprio sem `alternates`.
- Fix sugerido: adicionar `alternates` (canonical + languages) nessas páginas.

**B4 — Pôster 404: capa de Baldur's Gate 3** (`upload.wikimedia.org/.../Baldur%27s_Gate_3_cover_art.jpg` removida do Wikipedia) → 404 no proxy `_next/image` da ficha do game.
- Fix sugerido: re-buscar capa de outra fonte (seed-posters) e atualizar a mídia.

**B5 — JSON-LD ausente em catalog, login, register, privacy, dashboard e watchlist.**
- Fix sugerido: structured data mínima (WebSite/WebPage ou específica) nesses páginas.

### P3 (baixo)

**C1 — Requisições `?_rsc=…` abortadas (`net::ERR_ABORTED`)** em várias páginas: comportamento normal do Next.js App Router (prefetch RSC interrompido na navegação). Não é erro; documentado para triagem de ruído.
**C2 — `POST play.google.com/log` bloqueado:** telemetria do Google Identity Services; derivado do CSP e benigno.

---

## 3. Pontos positivos verificados

- **SEO 100** em todas as páginas testadas; **a11y 90–97**; **BP 96–100**.
- robots.txt correto (Allow /, Disallow /api/, sitemap) e sitemap.xml com **hreflang x-default + 3 locales**.
- Home com hreflang correto (4 alternates) e JSON-LD presente.
- TTFB 10 ms (servidor rápido); CLS ≈ 0 (sem shift de layout).
- Sem 5xx; formulários e rotas autenticadas operacionais (dashboard/watchlist renderizaram).
- Gating por plano funcionando (T402: Free 2 previews / Plus 1 / Premium 0 — e2e 3/3).

## 4. Evidência

- **Lighthouse:** `docs/lighthouse-reports/{home-pt,catalog-pt,detail-filme,pricing-pt}.json`
- **Screenshots (desktop+mobile):** `docs/auditoria/*.png` (16 páginas × 2 viewports)
- **Console/network por página:** `docs/auditoria/achados.json`

## 5. Recomendação

Fix imediato: **A2 (CSP, 1 linha)** e **B1 (título, 1 linha)**. Depois **A1 (performance)** como tarefa dedicada (LCP da home em 9,1 s é o maior gap de qualidade percebida). B2–B5 como lote de SEO/metadados.

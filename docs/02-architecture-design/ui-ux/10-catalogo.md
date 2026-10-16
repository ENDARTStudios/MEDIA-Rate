# UI-UX — Catálogo (`/catalog`)

> Sessão **1 de 25** da prioridade do Operador. Spec no template [`01-TEMPLATE.md`](./01-TEMPLATE.md),
> referenciando os [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Toda afirmação tem `arquivo:linha` ou
> medição; o que não existe está marcado **AUSENTE** ou **A CRIAR**.

## 1. Identidade da sessão

- **Objetivo do usuário:** explorar o acervo (filmes, séries, games, livros, HQs, mangás) e achar um
  título para assistir/jogar/ler, filtrando por tipo, gênero, ano e faixa de score.
- **Persona/estado de conta:** **público** — o catálogo é aberto (sem login). Anônimo vê tudo; logado
  ganha a ação de watchlist por card. Plano **não** restringe o catálogo (restrição existe em
  recomendações/listas — outras sessões).
- **Rotas reais:** `/catalog` é a única. O estado dos filtros vive na **query string** (`?type=`, `?q=`,
  `?genero=`, `?sort=`, `?anoMin/anoMax`, `?scoreMin/scoreMax` — chaves em `catalog.*`,
  `apps/web/src/components/CatalogPageClient.tsx:28-58`), o que torna qualquer recorte **compartilhável**.
- **Entradas:** item "Catálogo" na navbar, CTA da home, links de gênero/categoria de outras telas,
  deep link com filtros.
- **Saídas:** ficha da obra (`/media/[slug]`), busca global (⌘K), sessões de Watchlist/Listas.
- **Fora de escopo:** ficha da obra, busca avançada (sessão 11) e o ⌘K.

## 2. Arquitetura de informação

Render: a página é **server-first** (`apps/web/src/app/[locale]/catalog/page.tsx:1-42` — roda
`getCatalog`, monta metadata e JSON-LD) e hidrata um conteúdo cliente
(`apps/web/src/components/CatalogPageClient.tsx`).

Ordem de leitura (blocos reais):

| # | Bloco | Componente |
|---|---|---|
| 1 | Título `h1` "Catálogo" + parágrafo explicativo | página (server) |
| 2 | Chips de categoria com contagem | `media-rate-ui/CategoryChip.tsx` |
| 3 | **Sidebar sticky de filtros (desktop)** | `CatalogFiltersClient.tsx:19` dentro de `CatalogPageClient.tsx:415` |
| 4 | Botão "Filtros (n)" + drawer (mobile) | `CatalogPageClient.tsx:449-473` |
| 5 | Seções por tipo, cada uma `section aria-labelledby` + `h2` + "Ver todos" | `CatalogTypeSections.tsx:64-88` |
| 6 | Grade de cards (12 por página) | `MediaCardShell.tsx` |
| 7 | "Carregar mais" (cursor) | `CatalogPageClient.tsx:341-361` |
| 8 | Rodapé | `components/Footer` (global) |

Layout de duas colunas: `flex flex-col lg:flex-row gap-8` (`CatalogPageClient.tsx:411`) com sidebar
`hidden lg:block w-60 shrink-0 sticky top-20 self-start max-h-[calc(100dvh-6rem)]`
(`CatalogPageClient.tsx:415`).

## 3. Layout, grid e densidade

- Container: largura cheia com padding de página; coluna de conteúdo ao lado de `w-60` (15rem) de filtros.
- Grade de cards por breakpoint (medido nas capturas): **2 colunas em 375**, **5 em 1440**.
- `PAGE_SIZE = 12` (`CatalogPageClient.tsx:23`) por página, em todas as seções.
- Altura total medida da listagem padrão: **7.403 px em 1440** (6 seções × 2 linhas + filtros + rodapé)
  — é a métrica que justifica a discussão de densidade da §11.
- Medida de leitura do parágrafo de topo: hoje sem `max-w` explícito → herda a largura da coluna
  (**pendência P2**, ver §11: leads institucionais usam `max-w-[34rem]`, D-603).

## 4. Tokens em uso

| Papel | Token (ver `02-FUNDAMENTOS.md`) | Onde |
|---|---|---|
| Fundo da página | `colors.bg` `#05050A` | global |
| Card / sidebar | `colors.cb` `#12121C` (`bg-surface-card`) | filtros, cards |
| Borda | `colors.bd` `#2A2A3D` | card, campos |
| Título | `text.primary` `#F5F5F7` | `h1`, `h2` (`CatalogTypeSections.tsx:88`), título do card |
| Corpo/rótulo | `text.secondary` `#A0A0B8` | parágrafo, contagem |
| Atenuado | `text.muted` `#85859F` | "N fontes" |
| Acento | `accent.indigo` `#818CF8` | estado ativo, links |
| Cor por tipo | `CATEGORY_TOKENS[type]` via `CategoryChip.tsx` | chips, ícone do card |
| Score | `scoreColor()` + `formatarScoreLocale()` | `MediaCardShell.tsx` |
| Foco | `focus.ring` `#818CF8` 2px | controles |

**Valores legados nesta sessão (pendência):** o arquivo de filtros usa `bg-red-500/10` +
`border-red-500/30` para o aviso de erro com dados (`CatalogPageClient.tsx:165`) e `text-red-300`
(`:182`) — não são tokens (`score.low`/`#F87171` e `#FCA5A5` são). É o item P2 nº 3 da §11.

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando (1ª carga) | **existe** — skeleton com `PAGE_SIZE` itens | `CatalogSkeleton` (`:126-127`) | — |
| 2. Vazio | **existe** — por tipo sem acervo (`EmptyStateComingSoon`, `:201-206`) e por filtro sem resultado (`catalog.noResults`, `:142`) | `media-rate-ui/EmptyStateComingSoon.tsx` | conferir se o vazio **por filtro** oferece "limpar filtros" (`catalog.clearFilters` existe e é usado) |
| 3. Erro de rede | **existe e é exemplar** — erro sem dados (`:138-155`) com `catalog.retry`; `RateLimitedError` tem estado próprio com `retryAfterSeconds` (`:130-133`) | `RateLimited` (`ui/rate-limited.tsx`) | — |
| 4. Não encontrado (404) | **não se aplica** — rota de listagem não tem 404; "não achou" é `noResults` (estado 2) | — | — |
| 5. Sem permissão | **não se aplica** — catálogo é público | — | — |
| 6. Dados parciais/desatualizados | **existe** — erro com dados já carregados vira aviso inline (`:161-182`) e `isFetching` mostra indicador com `aria-live="polite"` (`:242-243,259`) | `catalog.loadingCatalog` | — |
| 7. Offline/degradado | **AUSENTE** — não há leitura de `navigator.onLine` nem aviso de "sem conexão" | — | **P2**: banner de offline reusando o padrão do erro com retry |

Máquina de estados completa e correta na paginação: `hasMore` + `loadMoreError` (`:337-339`) ✓.

## 6. Micro-interações e movimento

- Hover do card: elevação/realce por CSS (`MediaCardShell`) — `transform`/opacidade, sem layout shift.
- Troca de filtro: **remount** por chave de filtros (`filtersKey`, `:279-280,307-309`) — a paginação
  reinicia limpa e o skeleton reaparece; é movimento de entrada, não transição de lista.
- "Carregar mais": `isFetching` acende indicador textual (`:242-259`) — **não** há animação de
  entrada dos novos itens.
- Reduced motion: nenhum destes depende de `prefers-reduced-motion` para decidir markup (gate
  `test/reduced-motion.spec.tsx` verde), e o `MotionConfig reducedMotion="user"` cobre o resto.
- **A CRIAR (P2):** entrada escalonada dos 12 novos itens ao "carregar mais" com `motion.presets.entry`
  e `stagger` do token — hoje o conteúdo aparece "seco".

## 7. Acessibilidade AA

- **Hierarquia (medida no DOM pós-hidratação):** `h1` "Catálogo" → 7 `h2` (um por seção de tipo) → 60
  `h3` (títulos dos cards) ✓ **sem pular nível** e sem duplicar `h1`.
- Seções são `section` com `aria-labelledby` apontando para o `h2` (`CatalogTypeSections.tsx:86-88`) ✓ —
  é o padrão correto e deve ser citado como referência nas outras specs.
- `main` presente ✓; `aria-live="polite"` no indicador de busca de página (`:243`) ✓.
- Chip ativo: `CategoryChip` recebe `active` — **a confirmar** se emite `aria-current`/`aria-pressed`
  (a spec exige um dos dois; se faltar, é P1).
- Contraste: os pares de token desta sessão estão em `npm run design:contrast` (221 pares, 0 falhas);
  o único par literal sem token é o vermelho do aviso (§4).
- Alvo de toque: no 375 o botão "Filtros" e os chips são os alvos críticos — medir ≥ 44px é P1 antes de
  fechar a sessão.
- **AUSENTE:** atalho de teclado para focar os filtros e para "limpar filtros" (P2).

## 8. Copy e i18n

- Namespaces: **`catalog`** (`error`, `retry`, `noResults`, `loadingCatalog`, `loadMore`, `clearFilters`,
  `q`, `type`, `genero`, `sort`, `anoMin`, `anoMax`, `scoreMin`, `scoreMax`) e **`catalogFilters`**
  (`filters`), extraídos de `CatalogPageClient.tsx`.
- Os 3 locales têm paridade e o gate de vazamento (`test/i18n-leak.spec.ts`, D-604) garante que não há
  português em EN/ES — **nenhum texto hardcoded** foi encontrado nesta sessão.
- Tom: descritivo e neutro; a chamada explica o que é o MEDIA Score™ no topo.
- **A CRIAR:** rótulo acessível do grupo de filtros (`catalogFilters.groupLabel`) e o texto do estado
  offline (§5.7).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | sidebar oculta; botão "Filtros (n)" abre drawer `z-drawer` (overlay `bg-black/60`, painel `w-72`) — `CatalogPageClient.tsx:449-473`; grade 2 colunas |
| 768 | grade 3 colunas; drawer ainda ativo (`lg:` é o corte) |
| 1024+ | sidebar `w-60` sticky (`top-20`, `max-h-[calc(100dvh-6rem)]`) e grade 5 colunas |
| 1440 | igual a 1024 com mais respiro |

- Drawer: fecha ao clicar no overlay, **A CONFIRMAR** `Esc` e trava de foco (se faltar, P1).
- `viewport-fit=cover` está no `<head>` — o drawer à esquerda deve respeitar safe-area.

## 10. Métricas de sucesso

- **Core Web Vitals de `/catalog`** (LCP/INP/CLS) — hoje o LCP é candidato a problema porque
  `CatalogTypeSections` dispara **uma consulta por tipo** (`CatalogTypeSections.tsx:45`), 6 em paralelo.
- **Profundidade de uso de filtro:** % de sessões que aplicam ao menos um filtro; qual filtro é o mais
  usado; % que usa "limpar filtros".
- **Descobribilidade:** % de cliques em card por posição (1ª dobra × "carregar mais").
- **Custo de rede:** nº de requisições e bytes por visita ao catálogo (instrumentar se não houver).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| P1 | Chip ativo pode não anunciar estado a leitor de tela (`aria-current`/`aria-pressed`) | `CategoryChip.tsx` (a confirmar no DOM) | eu | — |
| P1 | `Esc`/trava de foco no drawer de filtros (mobile) não confirmados | `CatalogPageClient.tsx:460-473` | eu | — |
| P1 | Alvo de toque < 44px em chips/botão de filtro no 375 (medir) | captura `375.png` | eu | — |
| P2 | **6 requisições paralelas** (uma por tipo) na primeira carga das seções | `CatalogTypeSections.tsx:45` | eu | — |
| P2 | Vermelho fora de token no aviso de erro-com-dados | `CatalogPageClient.tsx:165,182` | eu | D-584 |
| P2 | Sem estado **offline** | ausência de `navigator.onLine` no componente | eu | — |
| P2 | Parágrafo do topo sem medida máxima de leitura | `catalog/page.tsx` (server) | eu | D-603 |
| P2 | Novos itens do "carregar mais" entram sem animação | `CatalogPageClient.tsx:341-361` | eu | D-580 |
| P2 | Sem atalho de teclado para filtros / limpar filtros | ausência | eu | — |
| — | **Refutado:** "filtros no fim da página" — é artefato do `fullPage` com elemento `sticky`; no DOM a sidebar é o **primeiro** bloco da coluna (`:411-419`) | medição + `:415` | — | — |
| — | **Refutado:** "score com ponto" — o DOM serve `8,7`/`87,4` (vírgula, `formatarScoreLocale`) | probe do HTML servido | — | D-602 |

## 12. Evidência e reprodução

```powershell
# capturas (novo utilitário do repo)
npm run uiux:evidence -- catalogo=/catalog        # docs/.../evidencias/ui-ux-catalogo/{1440,375}.png

# estrutura e estados
grep -n "CatalogSkeleton\|RateLimited\|EmptyStateComingSoon\|aria-live" apps/web/src/components/CatalogPageClient.tsx
grep -n "aria-labelledby" apps/web/src/components/CatalogTypeSections.tsx

# gates que esta sessão precisa manter
npm run design:detect; npm run design:contrast; npm run design:hex
npm run test:hydration --workspace apps/web; npm test --workspace apps/web
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-catalogo/1440.png` (página inteira) e
`375.png` (dobra). **Atenção de método:** em captura `fullPage`, elemento `sticky`/`fixed` sai na
posição de scroll final — toda leitura de posição precisa de confirmação no DOM (foi assim que o
"filtros no fim" foi refutado).

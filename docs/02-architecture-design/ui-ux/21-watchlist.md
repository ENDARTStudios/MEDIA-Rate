# UI-UX — Watchlist (`/watchlist`)

> Sessão **12 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-watchlist/{1440,375}.png`
> (+ `1440-resolvido.png`, captura com a página já resolvida — ver §12).

## 1. Identidade da sessão

- **Objetivo do usuário:** manter a lista do que pretende assistir/jogar/ler, reordenar por prioridade e
  agir (mover entre colunas, remover, sortear o próximo).
- **Persona/estado de conta:** logado. **Free** tem limite (`limitReached`, 402 — `WatchlistClient.tsx:110`
  e o `addItem` do store em `use-watchlist-store.ts:106-112`); Plus/Premium têm mais.
- **Rota:** `/watchlist`, protegida (`ProtectedPage`) — **uma das 5 rotas que hidratam a sessão** (D-610).
- **Entradas:** header (ícone), sidebar do dashboard ("Quero ver" aponta para `/biblioteca?status=…`,
  não para cá — ver §11), ficha da obra (botão de adicionar).
- **Saídas:** ficha da obra; biblioteca (ao mudar status).
- **Fora de escopo:** biblioteca (6), listas (14), dashboard (5).

## 2. Arquitetura de informação

`WatchlistClient.tsx:106` orquestra um **store próprio** (`useWatchlistStore`, `:110`) com
`entries`, `isLoading`, `error`, `fetchWatchlist`, `removeItem`, `moveItem`.

| # | Bloco | Componente |
|---|---|---|
| 1 | Cabeçalho "Watchlist" + descrição | página |
| 2 | Alternância de visão **kanban × lista** | `WatchlistClient.tsx:112` |
| 3 | Kanban por coluna/prioridade | `watchlist/WatchlistKanban.tsx` (dnd) |
| 4 | Cartão de item com **variação de score** | `watchlist/WatchlistCard.tsx` (`ScoreDelta`) |
| 5 | "Sortear próximo" (destaca um item aleatório) | `WatchlistClient.tsx:47-85` (`rolling`, `sorteado`) |
| 6 | Aviso de limite de plano | `limitReached` (`:110`) |
| 7 | Rodapé | global |

**Destaque de produto:** o **`ScoreDelta`** mostra se a nota subiu/caiu desde que o item entrou na lista
(`watchlist/WatchlistCard.tsx` → `ScoreDelta`, com número via `formatarScoreLocale`, D-602) — é a única
tela que explica *por que* a nota mudou, e isso é valor real, não enfeite.

## 3. Layout, grid e densidade

- Kanban: colunas por prioridade/status com rolagem horizontal quando não couberem (mobile).
- Lista: uma coluna, densidade média, com a variação de score à direita.
- Altura e número de colunas do kanban: a confirmar na captura (`1440.png`).

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Superfície/borda | `bg-surface-card` / `border-surface-border` | cartões e colunas |
| Texto | `text-fg-primary` / `text-fg-secondary` / `text.muted` | títulos e metadados |
| Variação de score | `score.high` (subiu) / `score.low` (caiu) | `ScoreDelta` |
| Acento | `accent.indigo` | ação primária |
| Foco | `focus.ring` | cartões e controles |

Nenhum hex novo identificado nesta sessão após a migração D-604.

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | **existe** — `isLoading && entries.length === 0` → `CatalogSkeleton count={6}` | `WatchlistClient.tsx:164-168` | — |
| 2. Vazio | **existe** — estado próprio com CTA | `WatchlistClient.tsx` (branch de vazio) | CTA para o catálogo (confirmar) |
| 3. Erro de rede | **existe com retry** — `RateLimitedError` → `RateLimited` com `retryAfterSeconds` (`:173-177`) e erro genérico (`:182-183`) | `ui/rate-limited.tsx` | — |
| 4. Não encontrado | n/a | — | — |
| 5. **Limite de plano (402)** | **existe** — `limitReached` no store (`:106-112`), com mensagem específica | `use-watchlist-store.ts` | CTA de upgrade no ponto do limite (o padrão do `/historico` já faz isso) |
| 6. Dados parciais/desatualizados | **existe** — o item mostra a variação de score desde a entrada (`ScoreDelta`) | `WatchlistCard.tsx` | carimbo de "score atualizado em" |
| 7. Offline | **AUSENTE** | — | P2 |

**Adição otimista com rollback:** confirmada no store (`:96-105` — insere na hora e remove se a API
falhar) ✓. É o comportamento certo para uma lista de marcação rápida.

## 6. Micro-interações e movimento

- Kanban: arrastar e soltar (`dnd-kit`) — movimento com **`transform`**, sem reflow; em reduced motion,
  a reordenação deve continuar funcional (por teclado/handlers, não só por drag).
- Remover/mover: atualização otimista; **a confirmar** se há desfazer (recomendado para remoção).
- "Sortear próximo": realce transitório no cartão sorteado (`rolling`, `:47`) — cuidado para não disparar
  animação contínua (o código tem guarda para não sortear durante a rolagem ✓ `:47`).
- Reduced motion: nada aqui decide markup por preferência (gate verde).

## 7. Acessibilidade AA

- `ProtectedPage` garante que a sessão está hidratada antes de renderizar ✓ (D-610).
- O kanban por *drag and drop* precisa de **alternativa por teclado** (botões "mover para…" no cartão) —
  **a confirmar**; sem isso é P1 (`dnd-kit` suporta sensores de teclado, mas precisa ser configurado).
- O indicador de variação de score (`↑ 0,4`) é **cor + seta + número** ✓ (não depende só de cor ✓).
- Alvos de toque no mobile (cartões do kanban): conferir ≥ 44 px.
- `aria-live` para o resultado de ações (adicionar/remover) — **a confirmar**.

## 8. Copy e i18n

- Namespaces: **`watchlist`** (títulos, colunas, ações) e **`catalog`** (apoio).
- **P1 — texto em pt-BR hardcoded no store:** `"Erro ao carregar watchlist"`
  (`use-watchlist-store.ts:82`) — aparece assim em EN/ES. Mesmo padrão de vazamento encontrado no checkout
  (D-612) e nas labels do admin (D-613); o gate de i18n ainda **não varre literais em `src`**.
- **A CRIAR:** texto de desfazer remoção e o rótulo do limite de plano com CTA.

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | kanban rola na horizontal ou cai para a visão de lista (a confirmar qual); cartões em 1 coluna |
| 768 | 2 colunas/listas |
| 1024+ | kanban completo visível |

## 10. Métricas de sucesso

- **Itens por usuário** e **tempo de permanência** (lista que só cresce indica intenção não realizada —
  mesma leitura da biblioteca).
- **Conversão do limite Free** (`limitReached`) — é um ponto de upgrade legítimo.
- **Uso do "sortear próximo"** (funcionalidade diferenciada; se ninguém usa, ou falta descobribilidade ou
  não resolve o problema).
- **Remoções após adição** (arrependimento imediato).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | Texto em **pt-BR hardcoded** no store (`"Erro ao carregar watchlist"`) | `use-watchlist-store.ts:82` | eu | D-612 (gate de i18n) |
| **P1 — CORRIGIDO (D-628)** | Havia **só** `PointerSensor` — impossível mover item por teclado. Ativado o `KeyboardSensor` do próprio dnd-kit com `sortableKeyboardCoordinates` (navegação acessível nativa da biblioteca) | `WatchlistKanban.tsx:181-185` | eu | feito |
| P1 | Limite de plano (402) sem CTA de upgrade no ponto do erro | `use-watchlist-store.ts:106-112` | eu | padrão de `/historico` |
| P2 | Remoção sem desfazer (a confirmar) | `WatchlistClient.tsx` | eu | — |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| P2 | "Quero ver" no dashboard aponta para `/biblioteca?status=…` e não para a watchlist — pode confundir as duas listas | `DashboardSidebar.tsx:33` | eu | sessão 5/14 |
| — | **Refutado (era minha suspeita):** "skeletons que não resolvem". Com espera adequada a página resolve (0 skeletons, `GET /api/v1/watchlist` → **200**) e o store **limpa `isLoading` no `catch`** (`:83`) — o que eu vi foi o tempo de captura, não um defeito | probe de 2026-10-15 (3 s → 0 skeletons) + `use-watchlist-store.ts:83` | — | — |
| — | **Positivo a preservar:** `ProtectedPage`, `RateLimited` com retry, limpeza de `isLoading` no erro, adição otimista com rollback, `ScoreDelta` (explica a mudança de nota), duas visões (kanban/lista) e sortear com guarda contra rolagem | `WatchlistClient.tsx:106-183`; `use-watchlist-store.ts:82-112` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:auth-env -- --start
$env:API_PROXY_TARGET="http://localhost:4000"; npm run dev --workspace apps/web
npm run uiux:evidence -- --state "$env:TEMP\mr-uiux-auth\state.json" watchlist=/watchlist
npm run uiux:auth-env -- --stop --purge

grep -n "isLoading\|catch\|limitReached\|Erro ao carregar" apps/web/src/stores/use-watchlist-store.ts
grep -n "CatalogSkeleton\|RateLimited\|ScoreDelta\|rolling" apps/web/src/components/WatchlistClient.tsx
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-watchlist/1440.png` · `375.png` ·
`1440-resolvido.png` (após o carregamento). **Nota de método:** o capturador tira a foto ~3,3 s após o
DOM; em página com fetch no cliente, isso pode pegar o **esqueleto** — a captura `-resolvido` existe para
documentar o estado final (e foi ela que **refutou** a suspeita de skeleton infinito).

# UI-UX — Dashboard (área do usuário) (`/dashboard`)

> Sessão **5 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-dashboard/{1440,375}.png`
> (capturada com sessão válida — ambiente descartável do `npm run uiux:auth-env`, D-610).

## 1. Identidade da sessão

- **Objetivo do usuário:** ver, num relance, seu **radar de gosto** e a **evolução do consumo**
  ("Seu radar de gasto e a evolução do seu consumo" — subtítulo real da página).
- **Persona/estado de conta:** logado (free/plus/premium). Visitante **não** deveria ver o conteúdo —
  ver o achado **P0** na §11: hoje ele vê um convite de login **mesmo estando logado**.
- **Rotas:** `/dashboard` (visão geral) e `/dashboard/discoveries` (descobertas). A navegação lateral é
  compartilhada com Biblioteca, Histórico e Listas.
- **Entradas:** chip de usuário no header, redirecionamento pós-login, sidebar.
- **Saídas:** `/biblioteca`, `/listas`, `/historico`, `/dashboard/discoveries`, ficha de obra.
- **Fora de escopo:** Biblioteca (sessão 6), Metas e Evolução (sessão 7), Listas (14), Perfil (15).

## 2. Arquitetura de informação

`DashboardClient` (`apps/web/src/components/dashboard/DashboardClient.tsx:31`) decide **quatro**
caminhos, nesta ordem: `!isAuthenticated` → convite de login (L52-62); `loading` → texto de carregamento
(L74); `error` → mensagem (L75-78); senão → `DashboardOverview` (import L9).

| # | Bloco | Componente |
|---|---|---|
| 1 | Sidebar fixa "Seu espaço" (4 itens) + "Atalhos" (2) + chip do usuário | `DashboardSidebar.tsx:25-37` |
| 2 | `h1` "Dashboard" + subtítulo | `dashboard.title` |
| 3 | Convite de login (só para visitante) | `DashboardClient.tsx:52-62` |
| 4 | Visão geral: cartões de métrica + radar + histograma + sparkline | `DashboardOverview.tsx` + `overview/{PreviewCard,RadarGraphic,HistogramBars,MiniSparkline,ScoreBadge,SectionHead}.tsx` |
| 5 | Rótulo de dado de demonstração | `overview/DemoBadge.tsx` |
| 6 | Rodapé | global |

**Ponto positivo:** `DemoBadge` existe justamente para separar **métrica real** de **conteúdo de
demonstração** (F17) — o padrão que a spec exige em qualquer painel com dado simulado.

## 3. Layout, grid e densidade

- Duas colunas: sidebar (`w-*` fixa, com estado recolhido — `navCollapse`, L92) + conteúdo.
- Visão geral: grade de cartões de métrica com 2–4 colunas em 1440; radar e histograma ocupam cartões
  próprios; sparkline dentro do cartão de tendência.
- Altura medida: **1.384 px** em 1440 (captura) — cabe em ~1,5 dobra; o bloco de conhecimento é o mais alto.

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Superfícies | `bg-surface-card` / `border-surface-border` | cartões |
| Texto | `text-fg-primary` / `text-fg-secondary` | títulos e rótulos |
| Séries do gráfico | `scoreColor()` e `CATEGORY_TOKENS` | radar, histograma, badge |
| Cor de destaque do item ativo | `accent.indigo` | sidebar (`selected`, L107) |
| Movimento | `motion.presets` (via provider) | entradas |

**Fora de token:** o bloco de carregamento usa `text-[#A0A0B8]` literal (L74) — valor canônico, mas
deveria ser `text-fg-secondary` (P2). O item ativo da sidebar **não** usa a cor de acento com contraste
verificado — conferir no gate.

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | **texto simples** ("carregando"), não skeleton | `DashboardClient.tsx:74` | **P2**: skeleton nas formas dos cartões (o Dashboard é a tela que mais se beneficia) |
| 2. Vazio | existe — overview sem dados mostra métricas zeradas + demo rotulada (`DemoBadge`) | `DashboardOverview.tsx` | CTA de primeiro passo ("adicione um título à biblioteca") |
| 3. Erro de rede | **existe** — mensagem de erro (L75-78) | `DashboardClient.tsx` | confirmar **retry** (padrão M16/D-603) |
| 4. Não encontrado | **não se aplica** | — | — |
| 5. Sem permissão | existe por plano — `PlanThemeProvider`/`PlanCelebration` reagem ao plano | `layout/PlanThemeProvider.tsx:18`, `ui/PlanCelebration.tsx:17` | explicitar o que é exclusivo de plano dentro do painel |
| 6. Dados parciais/desatualizados | **existe** — `DemoBadge` separa demo de real | `overview/DemoBadge.tsx` | data da última atualização por cartão |
| 7. Offline | **AUSENTE** | — | P2 |

## 6. Micro-interações e movimento

- Entrada dos cartões via `MotionProvider` (reduced motion coberto pelo `MotionConfig`).
- Radar/histograma são **SVG estático** (sem animação de traço) — `RadarGraphic` usa coordenadas
  `toFixed(1)` (não é número de usuário; correto).
- Sparkline: traço, sem animação.
- **A CRIAR (P2):** animar o traço do radar na primeira renderização (`pathLength`/`transform`, nunca
  `width`) e usar `CountUpValue` nos números de métrica, com respeito a reduced motion.

## 7. Acessibilidade AA

- `h1` "Dashboard" por página; cartões usam `SectionHead` (título de seção) — **verificar** que
  `SectionHead` emite `h2`/`h3` e não `div` estilizada.
- Sidebar: `<nav>` com `aria-label={t("navSpace")}` (L62) e botão de recolher com
  `aria-label={t("navCollapse")}` (L92) ✓.
- **P1:** o item ativo é calculado por `pathname === item.href` (L107) — itens com query string
  (`/biblioteca?status=QUERO_CONSUMIR`, L33) **nunca** ficam ativos ✗; e não há `aria-current` no item
  ativo ✗ (o Rankings faz certo — usar como referência).
- Gráficos: precisam de alternativa textual (tabela ou `aria-label` com os valores) — **verificar** se
  `RadarGraphic`/`HistogramBars` expõem isso; se não, é P1 (conteúdo só visual).
- Contraste: pares de token sob o gate; o item ativo e o cinza do carregamento literal são os pontos a
  conferir.

## 8. Copy e i18n

- Namespace **`dashboard`**: `title`, `loginHint`, `loading`, `error`, `navSpace`, `navShortcuts`,
  `navOverview`, `navDiscoveries`, `navLibrary`, `navGoals`, `navWantToSee`, `navFavorites`.
- **P1 — rótulo não corresponde ao destino:** "Metas e evolução" (`navGoals`) aponta para **`/historico`**
  (L28) e "Favoritos" (`navFavorites`) aponta para **`/listas`** (L37). O comentário do próprio arquivo
  diz que toda `href` precisa existir (T460) — existe, mas **entrega outra coisa**. Isso impacta
  diretamente a sessão 7 (Metas e Evolução), cuja página **não existe**.
- Sem texto hardcoded; paridade e vazamento cobertos por gate (D-604).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | sidebar recolhe/oculta; cartões empilham em 1 coluna (conferir a captura `375.png`); radar precisa manter rótulos legíveis |
| 768 | cartões em 2 colunas |
| 1024+ | sidebar expandida + cartões em 2–4 colunas |

## 10. Métricas de sucesso

- **Retorno semanal ao dashboard** (é o painel de hábito).
- **Uso dos atalhos** ("Quero ver" / "Favoritos") versus navegação pela sidebar completa.
- **Tempo até a primeira leitura útil** (o quão rápido o usuário entende seu radar).
- **Cliques em "Descobertas"** a partir do painel (mede se o painel gera próxima ação).
- **Taxa de estado vazio** (novos usuários) — quantos veem painel sem dado.

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P0 — CORRIGIDO (D-619)** | **Sessão válida + UI de visitante:** com cookie de sessão válido, `/dashboard` renderizava "Entre para ver seu dashboard", o header mostrava "Entrar/Cadastrar" e a sidebar "Visitante · Plano Free". **Causa provada:** só o `ProtectedPage` chamava `fetchMe()`; nas rotas que leem o store direto ninguém hidratava. **Correção (D-619):** flag `hydrated` no store + `AuthHydrator` no layout do locale (uma consulta por página, com dedupe), e as telas passam a distinguir "carregando" de "visitante". **Verificado em 2026-10-15:** contexto novo em `/dashboard` → header logado, sem `loginHint`, `/auth/me` **200**; em `/historico` → `/auth/me` **200** + "Verificando sessão..." (estado de carregamento correto) | medido com o ambiente autenticado (`uiux:auth-env`) + `test/auth-store.spec.ts` | eu | feito |
| **P1** | **Alcance do P0 (medido):** hidratam via `ProtectedPage` → `useRequireAuth` → `fetchMe`: **`/biblioteca`, `/dashboard/discoveries`, `/profile`, `/settings`, `/watchlist`** (5 rotas). **Leem o store sem guard:** **`/dashboard`, `/historico`, `/listas`, `/listas/[slug]`, `/user/data`** (5 rotas) — mais os **globais** `Navbar.tsx:38` e `NotificationBell.tsx:34`. **Nuance medida (2026-10-15):** "sem guard" é **risco**, não falha garantida — em `/watchlist` e `/listas` o header apareceu **autenticado** nas capturas, enquanto em `/dashboard` o defeito **se reproduziu** | rotas com `ProtectedPage` × componentes com `useAuthStore` + capturas | eu | — |
| P1 | Rótulo × destino: "Metas e evolução" → `/historico`; "Favoritos" → `/listas` | `DashboardSidebar.tsx:28,37` | eu | sessão 7 |
| P1 | Item ativo sem `aria-current` e ignorando query string | `DashboardSidebar.tsx:107,33` | eu | referência: Rankings `TopPageClient.tsx:113` |
| P2 | Carregamento é texto, não skeleton | `DashboardClient.tsx:74` | eu | — |
| P2 | `text-[#A0A0B8]` literal onde existe `text-fg-secondary` | `DashboardClient.tsx:74` | eu | D-584 |
| **P2 — verificado OK (D-628)** | `RadarGraphic` tem `role="img"` + `aria-label` (`:34-35`); `HistogramBars` é `<ul role="list">` com faixa **e valor em texto** (`:10,26`). Diagnóstico anterior estava errado | `overview/RadarGraphic.tsx:34`, `overview/HistogramBars.tsx:10,26` | — | feito |
| — | ~~Suspeita de skeleton infinito em `/watchlist`~~ **refutada** em 2026-10-15: com espera adequada a página resolve (0 skeletons, `GET /api/v1/watchlist` → 200) e o store limpa `isLoading` no `catch` (`use-watchlist-store.ts:83`). O que eu vi foi o tempo da captura, não um defeito — a captura `ui-ux-watchlist/1440-resolvido.png` documenta o estado final | probe + `use-watchlist-store.ts:83` | — | `21-watchlist.md` §11 |

## 12. Evidência e reprodução

```powershell
# ambiente descartável com sessão válida (D-610) — sobe PG efêmero, Redis, API :4000 e grava o storageState
npm run uiux:auth-env -- --start
# web apontando para a API local:
$env:API_PROXY_TARGET="http://localhost:4000"; npm run dev --workspace apps/web
npm run uiux:evidence -- --state "$env:TEMP\mr-uiux-auth\state.json" dashboard=/dashboard
npm run uiux:auth-env -- --stop --purge

# prova do achado P0 (mesmo navegador, sessão válida):
#   /api/v1/auth/me → 200  MAS  header mostra "Entrar/Cadastrar" e o conteúdo mostra loginHint
grep -n "isAuthenticated\|loginHint\|loading\|error" apps/web/src/components/dashboard/DashboardClient.tsx
grep -rn "fetchMe" apps/web/src
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-dashboard/1440.png` · `375.png`.

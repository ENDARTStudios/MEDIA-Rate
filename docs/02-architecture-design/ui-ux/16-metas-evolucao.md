# UI-UX — Metas e Evolução (A CRIAR)

> Sessão **7 de 25** — **não existe como página**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md);
> valores em [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Esta spec é **de criação** e está ancorada no
> que o produto já tem: a rota `/historico`, os componentes de gráfico do dashboard e o modelo de dados
> de interações. Nada aqui propõe conceito visual novo — reaproveita tokens, componentes e padrões atuais.

## 1. Identidade da sessão

- **Objetivo do usuário:** definir **metas de consumo** (quanto/quando quer ver) e acompanhar a
  **evolução** do seu histórico ao longo do tempo.
- **Estado atual (medido):** o menu lateral do dashboard tem o item **"Metas e evolução"**
  (`dashboard.navGoals`) que aponta para **`/historico`** (`DashboardSidebar.tsx:28`). Essa rota é um
  **histórico de consumo com limite de plano Free**, não metas: `GET /api/v1/historico` devolve
  `{ items }` e a página mostra lista + aviso "Plano Free: histórico limitado a {count} títulos"
  (`HistoricoPage.tsx:63`; chaves `historico.freeLimit`, `historico.upgrade`).
- **Persona/estado de conta:** logado; **Free** tem limite de histórico (dado real) → a sessão é também
  um ponto de conversão.
- **Rotas:** hoje `/historico`. Proposta: `/dashboard/metas` (evolução + metas) **ou** renomear o menu
  para "Histórico" (ver §11, decisão do Operador).
- **Entradas:** sidebar do dashboard, notificações, pós-conclusão de um título.
- **Saídas:** ficha, biblioteca, planos (conversão do limite Free).
- **Fora de escopo:** dashboard (sessão 5), biblioteca (6), planos (3/8).

## 2. Arquitetura de informação

**Reaproveitamento verificado (não inventar):**

| Peça necessária | O que já existe | Onde |
|---|---|---|
| Série temporal de consumo | `MiniSparkline` (traço) e `HistogramBars` (barras) | `components/dashboard/overview/` |
| Radar de gosto | `RadarGraphic` (SVG puro) | idem |
| Cartão/estatística | `PreviewCard`, `SectionHead`, `ScoreBadge` | idem |
| Lista cronológica | `HistoricoPage` (lista + limite de plano) | `components/HistoricoPage.tsx` |
| Dado de consumo | `GET /api/v1/historico` (itens) e `GET /api/v1/interacoes` (`porStatus`, cursor) | `HistoricoPage.tsx:63`, `BibliotecaClient.tsx:54` |

**Estrutura proposta (3 blocos, na ordem):**

1. **Evolução** — cartões: consumidos no mês, total acumulado, sequência (streak) e gráfico de barras por
   mês; faixa de tempo (3/6/12 meses) como grupo de chips com rótulo acessível.
2. **Metas** — meta por período (ex.: "4 títulos/mês") com progresso visual (barra/a‌nel reaproveitando o
   padrão do score) e estado vazio com CTA "definir minha primeira meta".
3. **Histórico** — a lista atual, como aba/rolagem dentro da sessão (não duplicar rota).

## 3. Layout, grid e densidade

- Reusar o grid do dashboard: cartões de 2–4 colunas, gráfico ocupando 2 colunas, lista em largura total.
- Medida de leitura nos textos de meta ≤ `max-w-[38rem]` (D-603).
- Mobile: gráfico rola se necessário (mesmo padrão de `overflow-x-auto` já usado em Planos/MediaUnlockGrid).

## 4. Tokens em uso

Reusar integralmente os tokens de [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md): `bg-surface-card`,
`border-surface-border`, `text-fg-*`, `accent.indigo` para progresso, `scoreColor`/`CATEGORY_TOKENS` para
séries por tipo.

**Correção a fazer junto (achado):** o aviso de limite de plano em `/historico` usa
`border-[#FBBF24]` literal (`HistoricoPage.tsx:102`) — valor canônico (`score.medium`) mas escrito como
hex; ao trazer o bloco para a nova sessão, usar o token.

## 5. Estados obrigatórios

| Estado | Hoje (em `/historico`) | Na sessão nova |
|---|---|---|
| 1. Carregando | **existe** — `CatalogSkeleton count={6}` (`:83`) | esqueleto também para os cartões de evolução |
| 2. Vazio | **existe** — `historico.empty` + CTA `historico.exploreCatalog` (`:92-99`) | + vazio específico de **metas** ("definir primeira meta") |
| 3. Erro de rede | **existe com retry** — `historico.retry` (`:85-89`) | manter o padrão |
| 4. Não encontrado | não se aplica | não se aplica |
| 5. Sem permissão/plano | **existe** — aviso de limite Free + `historico.upgrade` (`:102`) | o limite precisa aparecer **antes** de o usuário bater nele |
| 6. Dados parciais | **existe parcialmente** — histórico é limitado por plano | marcar claramente onde o dado termina por plano e onde termina por falta de uso |
| 7. Offline | **AUSENTE** | incluir desde o desenho |

## 6. Micro-interações e movimento

- Progresso da meta: animar `transform: scaleX`/`stroke-dashoffset` na entrada — **nunca** `width`.
- Série temporal: `stagger` de barras com `motion.presets.entry` (30–40 ms).
- Reduced motion: sem `initial={{opacity:0}}` e sem `return null` (gate
  `test/reduced-motion.spec.tsx`), reusando o que o dashboard já faz.

## 7. Acessibilidade AA

- `h1` "Metas e evolução" → `h2` por bloco (Evolução, Metas, Histórico), sem pular nível.
- Chips de faixa de tempo com `aria-pressed`/`aria-current` no ativo (padrão do Rankings/Planos, D-608).
- **Gráficos precisam de alternativa textual**: `RadarGraphic`/`HistogramBars` hoje são SVG (o Radar
  inclusive com coordenadas `toFixed(1)`) — a sessão nova exige `aria-label` com os valores ou tabela
  equivalente (é P1 no dashboard: ver `14-dashboard.md` §11).
- Progresso de meta: usar `role="progressbar"` com `aria-valuenow/min/max` e rótulo textual.

## 8. Copy e i18n

- Namespaces: **`historico`** (já existente: `title`, `empty`, `exploreCatalog`, `freeLimit`, `upgrade`,
  `retry`) e **`dashboard`** (`navGoals`). Para a sessão nova, criar namespace `metas` com paridade nos
  3 locales (gate `test/i18n-leak.spec.ts`, D-604).
- **Decisão de nome:** se a página continuar sendo histórico, o menu **deve** dizer "Histórico" (hoje diz
  "Metas e evolução" — ver P1 na §11).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | cartões empilham; gráfico rola horizontalmente se necessário; lista do histórico em 1 coluna |
| 768 | 2 cartões por linha |
| 1024+ | 4 cartões + gráfico em 2 colunas |

## 10. Métricas de sucesso

- **% de usuários que definem uma meta** (adoção do recurso novo).
- **Conclusão de meta** por período e **abandono** após definir.
- **Uso do histórico** (a lista atual) dentro da nova sessão.
- **Conversão do limite Free** (`historico.upgrade`) — a sessão é ponto de upgrade legítimo.

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | **Rótulo × destino:** o menu diz "Metas e evolução" e entrega `/historico` (histórico de consumo). Ou vira página de verdade, ou o rótulo muda | `DashboardSidebar.tsx:28`; `historico.title` = "Histórico" | **Operador** (decisão de produto) | — |
| **P1** | `/historico` lê o store de auth **sem guard** (`HistoricoPage.tsx:51`) → cai no mesmo P0 do dashboard: F5 mostra estado de deslogado | `HistoricoPage.tsx:49-51`; lista de rotas com `ProtectedPage` (D-610) | eu | D-610 |
| **P1 — verificado OK (D-628)** | Os gráficos TÊM alternativa textual (`RadarGraphic`/`MiniSparkline`: `role="img"` + `aria-label`; `HistogramBars`: `<ul role="list">` com faixa e valor em texto). Diagnóstico anterior estava errado. ~~Gráficos sem alternativa textual (herdado do dashboard) | `overview/RadarGraphic.tsx`, `HistogramBars.tsx` | eu | AA |
| P1 | **Dependência de servidor para "metas":** não existe modelo/endpoint de meta — exige trabalho em `apps/api` (**arquivos de outro agente**) | ausência de `/api/v1/metas` | outro agente | — |
| P2 | `border-[#FBBF24]` literal no aviso de limite | `HistoricoPage.tsx:102` | eu | D-584 |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| — | **Positivo a preservar:** estados de carregamento/vazio/erro-com-retry do `/historico` e o CTA de upgrade honesto no limite de plano | `HistoricoPage.tsx:83-108` | — | — |

## 12. Evidência e reprodução

```powershell
# a sessão não existe: a evidência é a rota que a representa hoje
npm run uiux:auth-env -- --start
$env:API_PROXY_TARGET="http://localhost:4000"; npm run dev --workspace apps/web
npm run uiux:evidence -- --state "$env:TEMP\mr-uiux-auth\state.json" metas-evolucao=/historico
npm run uiux:auth-env -- --stop --purge

grep -n "navGoals" apps/web/src/components/dashboard/DashboardSidebar.tsx
grep -n "titulo\|freeLimit\|api/v1/historico" apps/web/src/components/HistoricoPage.tsx
```

**Capturas:** capturar `/historico` (a rota que hoje representa a sessão) — `ui-ux-metas-evolucao/`.

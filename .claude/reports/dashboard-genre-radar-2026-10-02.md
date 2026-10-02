# T154 — Radar de gêneros da dashboard (UG-16): relatório técnico

**Data:** 2026-10-02 · **Base:** origin/main @ 3fb61015 · **Branch:** feat/t154-dashboard-genre-radar-limit

## Achado original (UG-16, audit 2026-09-30)
`radarFromStats` limitava o radar a **6 eixos** (`.slice(0, 6)`), embora o backend
retorne todos os gêneros agregados (`dashboard.service.ts`). O corte era puramente
client-side. Confirmado também em `ProfileContent` (top gêneros do perfil).

## Decisão técnica (Opção A do task packet)
- `MAX_EIXOS_RADAR = 12` (constante exportada) — exibe **todos os gêneros com peso >0
  até 12**; acima disso **trunca por relevância** (ordem decrescente de contagem).
  Optou-se por truncar em vez de eixo agregado "Outros" (semântica estranha em radar).
- Primeira rodada (PR #394) aplicou Top 8; esta iteração amplia para 12 conforme
  task packet, com os dois casos cobertos por specs (8 → 8 eixos; 14 → 12).

## Legibilidade/acessibilidade (RadarGraphic, DashboardOverview.tsx)
- Rótulos: `fontSize` 10 → **8.5 quando eixos > 8**; `textAnchor` dinâmico pelo lado
  (middle no topo/base, start/end nos laterais) evita colisão/corte no `overflow-hidden`.
- **`<desc>` dinâmico** com os dados reais (`"Gênero: valor/100"; …`) — leitores de tela
  leem a distribuição completa; `role="img"` + `aria-label` mantidos (com contagem de
  eixos quando > 8, chave `dashboard.radarAriaEixos` ×3 línguas).
- SVG é dinâmico (`axes.length` genérico) — nenhuma mudança estrutural necessária.

## Testes
- `dashboard-overview.spec.tsx`: **25/25**
  - T154 Opção A: 14 gêneros → 12 eixos truncados por relevância (ordenado desc);
  - 9 gêneros ativos passam inteiros (teto não corta no meio);
  - 8 gêneros → 8 eixos; peso 0 fora; demo <3 preservado (regressão T460 ✓).
- Suíte web: **473/473** (68 arquivos). tsc 0. eslint 0.

## Smoke passivo (pré-PR)
7/7 endpoints 200 (health, pt/en/es, catalog, pricing, login). Zero chave crua.

## Deploy/merge
- PR merged com merge commit; CI required verde (E2E flaky de fontes Google no 1º run — 936 ocorrências do erro; rerun SUCCESS).
- main pós-merge; smoke 7/7 endpoints 200 (health, pt/en/es, catalog, pricing, login); zero 5xx novo.

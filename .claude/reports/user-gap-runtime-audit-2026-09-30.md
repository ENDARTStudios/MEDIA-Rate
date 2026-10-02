# User Gap Runtime Audit — 2026-09-30 (T146, read-only/docs-only)

Auditoria técnica + visual em produção das correções reivindicadas no
`user-gap-registry-2026-09-30.md` (T139/UG-01..UG-22). Métodos: leitura de
código (grafo + fontes), smoke HTTP de rotas públicas e navegação real no site
(medição de bounding boxes, console, cliques) via browser automatizado.
**Nenhum dado de produção foi alterado** (nenhum DELETE/POST de escrita;
único POST = teste passivo do callback Google com `{}`, respondido 401).
Nenhum segredo/PII. GO convites SUSPENSO.

## 1. Confirmações (o que a devolutiva alegou e está REAL no código)

| Gap | Alegação | Veredito | Evidência |
|---|---|---|---|
| UG-02 | Dashboard ignora `ABANDONADO` nas métricas atuais | **CONFIRMADO** | `apps/api/src/modules/dashboard/dashboard.service.ts:29-33` (`CURRENT_STATE_STATUSES` = QUERO_CONSUMIR/CONSUMINDO/CONCLUIDO; aplicado em `total`/`tipos`/`generos`/`streak` — linhas 67-69, 104, 125) |
| UG-16 | Gêneros da dashboard limitados a 6 | **CONFIRMADO (origem = UI)** | `apps/web/src/lib/dashboard-overview-data.ts:341-353` — `radarFromStats` faz `.sort().slice(0, 6)`; o backend retorna TODOS os gêneros (`dashboard.service.ts:74-77`). O limite é do radar, não da API |
| UG-09 | Helper central de notas existe (trunca, não arredonda) | **CONFIRMADO, com violações** | `apps/web/src/lib/score-utils.ts` — `truncar1` (7,95→7,9). Porém: violações reais no §2 |
| UG-14 | Densidade da biblioteca corrigida | **CONFIRMADO (código/E2E)** | PR #324 merged; não revalidado visualmente nesta auditoria (rota protegida) |
| UG-13 | Botões dos planos desalinhados | **CONFIRMADO (medido)** | Desktop 1280px em `https://mediarate.app/pt-BR/pricing`: Free/Premium `top=851px`, **Plus `top=847px`** (4px acima; largura 298 e altura 40 iguais nos 3). Causa visual: cards com alturas de conteúdo diferentes; botões não ancorados à base. Mobile 390px: sem overflow horizontal (scrollW 384 ≤ 390), cards empilhados — alinhamento não se aplica |

## 2. Novos defeitos encontrados (não estavam na devolutiva)

### B1 — [ALTA] Item de TESTE visível no catálogo de produção
`https://mediarate.app/pt-BR/catalog` — primeiro card de "Filmes": **"R2 Upload
Test — pode delet*..."** (2026, sem poster). Resíduo do teste de upload R2 (T454)
em banco de produção, visível publicamente e contando nas stats (625 títulos).
**Ação:** deletar via endpoint admin/DB (exige papel ADMIN — ver T141 em
`PENDENCIAS_OPERADOR.md`). NÃO deletado nesta auditoria (decisão/dado).

### B2 — [ALTA] Escala de mangá tratada como 0–100 em duas superfícies (regressão do BETA-GAP-09)
- `apps/web/src/components/MediaCard.tsx:167` — `escala = (game || **manga**) ? "0-100" : "0-10"`,
  contradizendo `media-score-engine.ts:74-75` (`manga.escala: "0-10"`) e
  `score-utils.ts` (BETA-GAP-09: mangá 0–10).
- **Sintoma visual medido:** todos os cards de mangá do catálogo renderizam o
  dial com **"0"** e anel vermelho/vazio enquanto o texto do mesmo card mostra
  "6,7"/"7,8"/"7,9" (dados reais; ex.: Gantz 6,7; Frieren 7,8; Punpun 7,9).
- **Ficha (detail):** `https://mediarate.app/pt-BR/media/goodnight-punpun` —
  número "7.9" correto, porém **anel ~8% preenchido** e **aria-label "Score
  geral 7.9 de 100"** (deveria ser "de 10"; anel deveria estar ~79%).

### B3 — [MÉDIA] `ScoreDial` arredonda o frame final na escala 0–10
`apps/web/src/components/media-rate-ui/ScoreDial.tsx:86` — `setDisplay(Math.round(target.v))`
também no frame final. `MediaCard.tsx:302` passa `scoreExibido` 0–10 com 1
decimal → **7,9 exibe "8" com animação, mas "7,9" com reduced-motion**
(comportamento divergente por preferência de movimento). Filmes no catálogo
exibem notas inteiras (6, 7) nos dials — visível em produção.

### B4 — [MÉDIA] `MediaScoreBadge` consome `consolidated` cru + arredonda
`apps/web/src/components/MediaScoreBadge.tsx` — recebe `media.score.consolidated`
**sem** `normalizeDisplayScore` (`MediaDetailPage.tsx:237`), divide por 10
assumindo 0–10 (`scoreHex`, linha 9) e `Math.round(obj.val)` no frame final
(linha 59). Risco de arredondamento/escala errado conforme o tipo.

### B5 — [BAIXA] Separador decimal inconsistente entre superfícies
Mesmo título, mesmo idioma (pt-BR): card exibe "6,7" (vírgula), ficha exibe
"7.9" e "79.2" (ponto). Não há formatação i18n centralizada de nota
(`toLocaleString`/`Intl.NumberFormat` ausentes nos componentes de score).

## 3. UG-01 (login Google): estado real em produção

- **Config OK:** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` inlined no build (botão
  renderiza), script GIS carrega, `window.google` definido,
  `SocialButtons.tsx` oculta o botão sem client ID (BETA-GAP-01 correto).
- **Backend OK:** `POST /api/v1/auth/google/callback` com `{}` → **401**
  (rota existe; credencial vazia rejeitada).
- **Sintoma reproduzido em browser automatizado (IAB):** clique em "Continuar
  com Google" → **nenhuma reação visível** (sem popup, sem iframe do One Tap,
  sem toast, sem navegação; console sem erro capturado).
- **RESSALVA Metodológica:** o IAB é webview embutido e o Google **suprime o
  One Tap em webviews** — o teste NÃO isola a causa (origem não autorizada vs.
  supressão de webview). T140 (validação em navegador real do Operador)
  **continua necessário** e ganhou este checklist: reproduzir em
  Chrome/Edge real, capturar console (procura "origin"/"client_id"), conferir
  Authorized JavaScript origins no Google Cloud.

## 4. Smoke pós-merge (T139/PR #360, commit dceb45b6)

`200` home pt/en/es · `/pricing` · `/login` · `/catalog` · `/discover` ·
`/health` (Railway). `307` biblioteca/dashboard (redirect login, esperado).
Nota: a rota do catálogo é **`/catalog`** (não `/catalogo`).
Pós-merge: Vercel deploy OK; nenhum impacto funcional esperado (docs-only).

## 5. Visual — o que está BOM (além dos defeitos)

- Home honesta: stats reais (625 títulos / 14 fontes / 6 categorias), ícones e
  cores canônicos por tipo no hero (UG-10 avançou), CTAs alinhados.
- Pricing: tabela comparativa por recurso; copy de cobrança clara; mobile sem
  overflow.
- Catálogo: sidebar desktop com busca/ordenação/filtro avançado (BETA-GAP-10
  confirmado), chips por tipo com contagens reais, "Ver todos" com URL state.
- Ficha de mídia: empty state honesto de crítica ("Sem crítica" — UG-08),
  fontes com valores originais (MAL 89.7, Kitsu 83.1), badge "pode estar
  desatualizado" — honestidade de dados presente.
- Login: botão Google renderiza com ícone SVG próprio; e-mail/senha preservado.

## 6. Correções propostas (candidatas a tarefa, NÃO executadas)

1. **B1** (com T141/admin): deletar item de teste do catálogo de produção.
2. **B2**: `MediaCard.tsx:167` — remover `manga` do grupo "0-100"; alinhar
   dial da ficha (fill % e aria) com escala 0-10 para mangá; teste E2E visual.
3. **B3**: `ScoreDial` — exibir valor truncado 1 casa na escala 0-10 (usar
   `truncar1`), alinhando animação e reduced-motion.
4. **B4**: `MediaScoreBadge` — normalizar via `normalizeDisplayScore(score, mediaType)`
   antes de exibir/colorir.
5. **B5**: helper único de formatação i18n de nota (Intl.NumberFormat) e
   adoção nos cards/fichas/dials.
6. **UG-13**: ancorar CTAs dos planos à base dos cards (flex column +
   margin-top auto) e E2E de bounding box (3 breakpoints).

## 7. Rastreabilidade

- Auditoria executada em 2026-09-29/30 contra produção (mediarate.app) e main
  `dceb45b6`. Screenshots e medições em sessão ZCode; números citados
  (bounding boxes, HTTP codes, aria-labels) são literais da execução.
- Relatório-base: `.claude/reports/user-gap-registry-2026-09-30.md` (T139).

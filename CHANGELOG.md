# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
versionamento segue [SemVer](https://semver.org/lang/pt-BR/). Datas em 2026.

## [Não lançado]

### Added
- **Biblioteca do usuário** (`/biblioteca`, D-525): abas pelos 4 status de consumo
  (quero consumir / consumindo / concluído / abandonado) com contagens globais do
  servidor, filtro por tipo de mídia, rótulos conjugados por mídia ("Quero Ler",
  "Jogando", "Vi", "Abandonei"), deep links `?status=`/`?tipo=` validados, paginação
  com "carregar mais", estado vazio com CTA e erro com retry. i18n pt-BR/en-US/es-ES.
- **GET /api/v1/interacoes paginado e filtrável** (D-525): envelope
  `{ items, total, porStatus, nextCursor }`; query validada por Zod (status/tipo
  por enum, `limit` 1–50, cursor opaco — inválido responde 400); Swagger documentado.
- Contraste AA das 6 cores canônicas de mídia sobre as superfícies do app coberto
  por teste (`test/contrast-aa.spec.ts`).

### Changed
- **Dashboard usa as cores canônicas dos tokens** em toda superfície de tipo de
  mídia (pulso de consumo, taxonomia, histograma, chips e rótulos) — fonte única
  `CATEGORY_TOKENS` (`design-tokens.ts`), sem hex de mídia duplicado (D-525/D-526).
- Dashboard consolidada: métricas reais (itens avaliados, afinidade média do
  histograma, taxa de conclusão, descobertas), feed de atividades alimentado por
  interações reais, gating por plano coerente (radar/taxonomia = Plus+,
  evolução/pulso = Premium, streak/histograma/feed = todos), fix de rótulos
  (`nicheLabelKey`) e do formato de score 0–100.
- Sidebar da dashboard: "Minha biblioteca" → `/biblioteca`; atalho "Quero ver" →
  `/biblioteca?status=QUERO_CONSUMIR`. `/watchlist` permanece o Kanban de planejamento.
- E2E atualizados ao novo contrato (`dashboard-gating` Free=4/Plus=2/Premium=0
  previews; spotchecks T305 por testids) e novo `e2e/biblioteca.spec.ts` (E2E_FULL).

### Fixed
- **Service worker estranho na origem não prende mais o app em render antigo**
  (D-525): o app não registra SW próprio; `LimpezaServiceWorker` desregistra SWs
  de terceiros e limpa o Cache Storage no boot (evidência: `test/sw-cleanup.spec.ts`).
- Rótulos de tipo de mídia com chave inexistente (`catalog.movie`/`catalog.book`
  → MISSING_MESSAGE em runtime desde a T460) — fix `nicheLabelKey()`.
- Score da API (0–100) exibido como "82,0/10" para não-games → formato correto "/100".
- API: `GET /interacoes` sem teto de página/validação → cursor opaco, limit máx. 50
  e enums validados (400 em vez de 500).

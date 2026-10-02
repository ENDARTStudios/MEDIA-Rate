# Score Display Normalization — 2026-09-30 (T147, frontend-only)

Correção da camada de **exibição** de notas/escalas no frontend (B2–B5 da
auditoria T146, `.claude/reports/user-gap-runtime-audit-2026-09-30.md`).
Dados persistidos, API, backend, schema, auth, billing, entitlement,
segredo e infra: **inalterados** (diff auditado; nenhum arquivo fora de
`apps/web/**` + docs). GO convites SUSPENSO. Nenhum BETA-GAP reclassificado.

## 1. Achados corrigidos (origem em T146)

- **B2 [ALTA]** — mangá tratado como escala 0-100: `MediaCard.tsx:167`,
  `MediaCardShell.tsx:78`, `MediaScoreModule.tsx:73` (`game || manga ? "0-100"`)
  contra `media-score-engine.ts:75` (`manga.escala: "0-10"`). Sintomas em
  produção: dials "0"/anel vazio nos cards de mangá; ficha do Goodnight Punpun
  com aria "Score geral 7.9 **de 100**" e anel ~8% preenchido.
- **B3** — `ScoreDial.tsx:86` (`Math.round(target.v)` no frame final): 7,9
  exibia "8" animado vs "7,9" em reduced-motion; `ui/score-dial.tsx:66`
  (`Math.round` p/ games: 79,2 → 79).
- **B4** — `MediaScoreBadge.tsx` recebia `score.consolidated` cru, dividia por
  10 presumindo 0-10 (`scoreHex`) e `Math.round` no frame final.
- **B5** — separador decimal inconsistente: cards "6,7" (toLocaleString pt-BR)
  vs ficha "7.9"/"79.2" (JS puro/ICU simples); aria de dial hardcoded pt-BR.

## 2. Pipeline único (helper)

`apps/web/src/lib/score-utils.ts` — nova API (fonte única de verdade):

- `escalaPorTipo(mediaType)` → `"0-100"` **somente** para `game`; senão `"0-10"`.
- `maxDaEscala(escala)` → 100 | 10.
- `exibirScore(raw, mediaType, locale)` → `{ value, scale, max, percent, formatted }`:
  normaliza (`normalizeDisplayScore`), **trunca** 1 casa (`truncar1`; 7,95→7,9),
  `percent = value/max` (nunca `value/10` quando max=100), formata por locale.
- `formatarScoreLocale(value, locale)` → `Intl.NumberFormat(locale, {min:0, max:1})`.

## 3. Arquivos alterados (reais)

| Arquivo | Correção |
|---|---|
| `src/lib/score-utils.ts` | pipeline único (§2) |
| `src/components/MediaCard.tsx` | B2 (escala via helper), scoreLabel formatado por locale |
| `src/components/media-rate-ui/MediaCardShell.tsx` | B2 + B5 (idem; usa prop `locale`) |
| `src/components/media-rate-ui/ScoreDial.tsx` | B3 (`setDisplay(target.v)`, formata na render), aria via `scoredial.ariaLabel` i18n (era "Nota X de Y" hardcoded pt-BR) |
| `src/components/media-rate-ui/StaticScoreDial.tsx` | aria i18n + número por locale |
| `src/components/ui/score-dial.tsx` | B3 (games 79,2), truncar1, aria/número por locale |
| `src/components/MediaScoreBadge.tsx` | B4 (normalizeDisplayScore + escala na cor via `scoreColor(value, escala)`), frame final formatado, aria por escala |
| `src/components/MediaScoreModule.tsx` | B2 (scale/maxScore via helper), reduced-motion `/maxScore` (era `/100` hardcoded), número central + aria por locale |
| `src/components/landing/ScoreRing.tsx` | B3/B5 (formatarScoreLocale no count-up) |
| `src/components/ScoreTrend.tsx` | B5 (delta com vírgula pt-BR; sinal preservado) |
| `src/components/SearchCommand.tsx` | B5 (número formatado por locale) |
| `test/score-display.spec.tsx` | NOVO — 23 testes (§5) |
| `test/ScoreTrend.spec.tsx`, `test/media-rate-ui.spec.tsx`, `test/f7-animacoes.spec.tsx` | provider next-intl nos renders (hook novo nos componentes); expectativas pt-BR |
| `e2e/score-display.spec.ts` | NOVO — E2E dirigido "live" (§6) |
| `docs/03-development-process/TESTING.md` | seção UG-09/T147 com comandos de regressão |

## 4. Matriz de exemplos (comportamento final)

| Valor cru (API) | Tipo | locale | Exibido | Percent do dial | aria |
|---|---|---|---|---|---|
| 79 | mangá | pt-BR | **7,9** /10 | 79% | "…7,9 de 10" |
| 7.9 | mangá | pt-BR | **7,9** /10 | 79% | "…7,9 de 10" |
| 7.95 | filme | pt-BR | **7,9** /10 (trunca; NUNCA 8,0) | 79% | "…7,9 de 10" |
| 79.2 | game | pt-BR | **79,2** /100 | 79,2% | "…79,2 de 100" |
| 79.2 | game | en-US | **79.2** /100 | 79,2% | "…79.2 out of 100" |
| 79 | game | pt-BR | **79** /100 (sem decimal forçado) | 79% | "…79 de 100" |
| 8.4 | série | en-US | **8.4** /10 | 84% | "Score: 8.4 out of 10" |

Animação × reduced-motion: mesmo valor final formatado (dials renderizam via
`formatarScoreLocale`; o frame final da interpolação é exatamente o valor
truncado). Inteiros continuam sem decimal desnecessário (regra existente,
mantida).

## 5. Testes (TDD: vermelho → verde)

- **Vermelho inicial:** `test/score-display.spec.tsx` = 22/23 falhando
  (ex.: card aria "MEDIA Score 7.9/100" literal). E2E live contra produção:
  **2/2 falhando** (B2/B5 reproduzidos ao vivo em mediarate.app, 2026-09-29).
- **Verde:** 23/23 no spec novo; suíte completa web **467/467**
  (`NODE_ENV=test npx vitest run`); `tsc --noEmit` web limpo; eslint/prettier
  limpos nos arquivos alterados. Specs existentes atualizados APENAS para
  prover `NextIntlClientProvider` (hooks next-intl novos nos componentes —
  produção sempre teve o provider) e delta pt-BR ("+0,7"/"-0,5").
- Cobertura: escala por tipo (B2), truncamento (7,95→7,9), games 79,2/79,
  locales pt-BR/en-US, aria i18n por escala, MediaScoreBadge normalizado,
  MediaScoreModule ficha (mangá "de 10"), MediaCardShell card aria,
  animação convergente com reduced-motion (ScoreDial com animejs real).

## 6. E2E dirigido (live)

`e2e/score-display.spec.ts` — roda contra `PLAYWRIGHT_BASE_URL` com dados
reais (produção); **NÃO entra na allowlist web-only do CI** (T461): sem
API/DB local o catálogo é vazio e as asserções seriam vacuamente verdes — o
guard do spec exige dials visíveis e falha em ambiente sem dados.
Verificação pós-merge: mesmo spec contra produção deve ir de 2 falhas → 0
(evidência registrada no exchange_log/PR).

## 7. Restrições respeitadas

Sem backend/API/schema/auth/billing/entitlement/segredo/infra; sem recalcular
nota ou alterar valor persistido; sem tocar B1 (item de teste em produção —
requer ADMIN/T141); sem validar UG-01 (navegador real do Operador); sem
corrigir UG-13/UG-16 (tarefas próprias); smoke 7/7 pré-implementação com
`/catalog` (rota canônica; `/catalogo` 404 não é defeito).

# Sanitização insegura em e2e e script (CodeQL `#93`/`#98`/`#149`) — correção (T196-b)

**Data:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T196-b-codeql-e2e-script-sanitization-fix
**Classificação:** `E2E_SCRIPT_SANITIZATION_MITIGADO_SEM_REGEX_DE_TAG_E_SEM_NO_OP` — nenhum alerta foi interagido.

## 1. Sumário

Último lote de higiene CodeQL não-runtime: os dois alertas do e2e `i18n-leak`
(**#93** `js/bad-tag-filter`, **#98** `js/incomplete-multi-character-sanitization`) e o
no-op do script de prêmios (**#149** `js/identity-replacement`) foram mitigados **sem tocar
código de produção** — apenas e2e/script/test/docs.

## 2. #93/#98 — `apps/web/e2e/i18n-leak.spec.ts`

**Causa:** o helper local `semScripts` fazia
`html.replace(/<script[\s\S]*?<\/script>/gi, "")` — regex de filtro de tag (`bad-tag-filter`)
e `replace` de multichar (`incomplete-multi-character-sanitization`).

**Intenção (preservada):** o gate i18n-leak (D-266/T271) analisa o HTML SSR **sem** os blocos
`<script>`, porque o flight payload do RSC carrega o dicionário de mensagens (chaves como
`continueWithGoogle` aparecem ali como dados de hidratação, **não** como texto visível). O
restante do HTML — tags e atributos — precisa continuar no material verificado, pois o gate
também confere `href` com prefixo de locale, `og:locale` e `aria-label`.

**Correção:** helper puro `apps/web/e2e/utils/sem-scripts.ts` — **varredura determinística de
tokens** (state machine com `indexOf`, sem regex de tag e sem `replace` de multichar):

- remove cada bloco `<script …>…</script>` (case-insensitive, com/sem atributos) e os
  autofechados (`<script/>`, `<script src="…" />`);
- **fail-safe:** script sem fechamento ⇒ descarta dali para frente (nenhum conteúdo de script
  entra na análise de vazamento);
- preserva tag cujo nome apenas **começa** com "script" (ex.: `<scriptt>`);
- HTML sem script volta idêntico; entrada vazia → `""`.

O e2e passou a importar o helper (a função local foi removida).

## 3. #149 — `apps/api/scripts/seed-premios-wikidata.mjs`

**Causa:** `ext.imdb_id.replace(/^tt/, "tt")` — **replace idêntico** (no-op morto) no fluxo de
coleta dos IMDb IDs via TMDB.

**Prova determinística (sem rede):** `"tt0903747".replace(/^tt/, "tt") === "tt0903747"` → `true`
(mesmo comprimento). O TMDB já entrega o id com prefixo `tt`, então o replace nunca alterava nada.

**Correção:** removido o código morto — `midiaPorId.set(ext.imdb_id, { midiaId: m.id, titulo: m.titulo })`.
Sem lógica nova/especulativa. `midiaPorId.keys().filter((k) => k.startsWith("tt"))` permanece
(não é URL, não é alertado e expressa o contrato do script: só ids IMDb entram no SPARQL).

## 4. Evidência

| Verificação | Resultado |
|---|---|
| `apps/web/test/sem-scripts.spec.ts` (novo, 10 casos) | **10/10** — RED antes do helper (import não resolvia) |
| Casos de contrato | chave i18n **dentro** de script não gera falso positivo; chave crua **fora** continua detectada; `scriptt` preservado; autofechado; sem fechamento (fail-safe); multilinha/unicode |
| Suíte **web** completa (vitest) | **564/564** (83 arquivos) |
| `apps/api/test/premios-wikidata.spec.ts` | **7/7** (harness do script preservado) |
| Suíte **API** completa (vitest) | **1375/1375** (162 arquivos) — 1 falha intermitente observada em 1 execução e **não reproduzida em 2 execuções seguintes** (flake, sem relação com o diff; CI é a autoridade) |
| Playwright (coleta do e2e) | `--list` → **14 testes** coletados (o arquivo compila com o novo import) |
| `tsc -p apps/web/tsconfig.json` | **0** (o helper é tipado via import do spec de teste) |
| `eslint` (helper, e2e, spec, `.mjs`) | **0** |
| `prettier --check` | limpo |

**Limitação registrada:** a execução real do e2e i18n-leak exige `E2E_FULL=1` + browser + API/DB
(gate T461) — não rodado localmente; a validação do e2e é do CI (job E2E Playwright).

## 5. Confirmações

Nenhum alerta interagido (apenas GET pós-merge); nenhum código de produção alterado
(diff = e2e/script/test/docs); nenhuma chamada de rede em testes (HTML/ID sintéticos); nenhum
segredo/PII/dado real impresso; `#151`, Trivy, deps, incidente, GitHub settings e produção
intocados. Contaminação `123ce28e` ausente; PR com required verdes e smoke 7/7 (STATUS).

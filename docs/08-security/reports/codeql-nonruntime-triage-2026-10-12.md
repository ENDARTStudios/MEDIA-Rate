# Triagem CodeQL não-runtime (T195) — alertas open remanescentes

**Data:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T195-codeql-nonruntime-triage
**Tipo:** read-only / docs-only — **nenhum alerta foi interagido** (somente leitura via API; sem
dismiss, comment, update, resolve, reopen, assign ou bulk update).

## 1. Sumário executivo

- Total open no code scanning: **128** = **119 Trivy** (fora do escopo; decisão de deps/imagem
  base, D-534) + **9 CodeQL**.
- Dos 9 CodeQL, **#151** (critical, runtime conhecido, mitigado por guardas reais) é **excluído**
  desta triagem — aguarda triagem humana do Operador.
- Dos **8 restantes**: **1 é runtime de produção** (`normalizar-imagem.ts` — **ESCALADO**, §4),
  **4 são de teste** (correção segura) e **3 são de e2e/script** (correção segura, prioridade
  menor). Nenhum item em auth/sessão/billing/secrets.
- A fila CodeQL **runtime** (T191–T194) está esgotada; **nada novo de runtime de API** além do #88
  (que é runtime mas de **transformação de display**, não de fetch/exec — ver §4).

| Classificação | Alertas | Qtd |
|---|---|---|
| `RUNTIME_ESCALATION_SE_HOUVER` | #88 | 1 |
| `SAFE_TEST_FIX` | #89, #90, #91, #92 | 4 |
| `E2E_SCRIPT_FIX` | #93, #98, #149 | 3 |
| `KNOWN_RUNTIME_OPEN_MITIGATED_PENDING_OPERATOR_TRIAGE` (fora) | #151 | 1 |

Sem `SUSPECTED_SENSITIVE_ALERT_METADATA`, sem `FALSE_POSITIVE_CANDIDATE`, sem
`INSUFFICIENT_EVIDENCE` nesta amostra.

## 2. Inventário (metadados sanitizados)

Campos usados: número, regra, severidade, arquivo, linha, datas. Sem descrição, snippet, corpo ou
payload de alerta.

| # | Regra | Sev | Arquivo:linha | Criado | Classificação |
|---|---|---|---|---|---|
| 88 | `js/incomplete-url-substring-sanitization` | high | `apps/api/src/common/normalizar-imagem.ts:8` | 2026-09-22 | **RUNTIME_ESCALATION_SE_HOUVER** |
| 89 | `js/incomplete-url-substring-sanitization` | high | `apps/api/test/audit-igdb-ids.spec.ts:141` | 2026-09-22 | SAFE_TEST_FIX |
| 90 | `js/incomplete-url-substring-sanitization` | high | `apps/api/test/audit-igdb-ids.spec.ts:156` | 2026-09-22 | SAFE_TEST_FIX |
| 91 | `js/incomplete-url-substring-sanitization` | high | `apps/api/test/audit-igdb-ids.spec.ts:407` | 2026-09-22 | SAFE_TEST_FIX |
| 92 | `js/incomplete-url-substring-sanitization` | high | `apps/web/test/game-posters-integrity.spec.ts:26` | 2026-09-22 | SAFE_TEST_FIX |
| 93 | `js/bad-tag-filter` | high | `apps/web/e2e/i18n-leak.spec.ts:48` | 2026-09-22 | E2E_SCRIPT_FIX |
| 98 | `js/incomplete-multi-character-sanitization` | high | `apps/web/e2e/i18n-leak.spec.ts:48` | 2026-09-22 | E2E_SCRIPT_FIX |
| 149 | `js/identity-replacement` | medium | `apps/api/scripts/seed-premios-wikidata.mjs:180` | 2026-10-07 | E2E_SCRIPT_FIX |
| 151 | `js/request-forgery` | critical | `apps/api/src/modules/media-score/adapters/http.utils.ts:68` | 2026-10-11 | conhecido — fora (§5) |

Contexto de cada grupo (verificado por leitura de código, sem colar conteúdo de alerta):

- **#89–#91** — roteamento de respostas em **mocks de fetch** de testes de auditoria IGDB
  (`url.includes("id.twitch.tv")` / `url.includes("api.igdb.com")`). Regra vê "sanitização" por
  substring; é **código de teste**, sem entrada de usuário.
- **#92** — **asserção** de integridade de pôsteres (0 games com pôster do domínio de filme) usando
  `posterUrl.includes("image.tmdb.org")`. Código de teste.
- **#93/#98** — mesma linha do e2e `i18n-leak`: helper `semScripts` remove `<script>…</script>` do
  HTML SSR por regex antes de procurar chaves i18n cruas. As duas regras sinalizam o filtro de tag
  incompleto. Uso exclusivo **e2e** (HTML do próprio SSR, sem entrada de terceiro).
- **#149** — `replace(/^tt/, "tt")` (replace **idêntico**, no-op morto) no script de prêmios,
  fluxo de `imdb_id` do TMDB. Código de **script** local/Operador; existe harness de teste
  (`apps/api/test/premios-wikidata.spec.ts`, `premios-csv.spec.ts`).
- **#88** — ver §4 (runtime).

## 3. Recomendação de lotes futuros (decisão do Thinker/Operador)

- **T196-A — `SAFE_TEST_FIX` (#89–#92):** trocar comparações por substring de URL nas
  asserções/mocks por parse (`new URL(url).hostname === …`). TDD = os próprios specs; risco baixo;
  escopo: 2 arquivos de teste.
- **T196-B — `E2E_SCRIPT_FIX` (#93/#98/#149):** (a) redesenhar a heurística do `semScripts` do
  `i18n-leak` para não depender de strip de tags por regex (desenho a validar no packet); (b)
  remover o replace no-op do script de prêmios, validando com o harness existente. Escopo: 1 e2e +
  1 script.
- **T196-C — runtime `#88` (SEPARADA de A/B):** fix dedicado com TDD e gates completos (§4). Não
  deve entrar no lote de higiene.
- **Trivy (119):** fora do escopo; permanece vinculado à decisão de deps/imagem base (item 7 de
  `PENDENCIAS_OPERADOR.md`).
- **#151:** não corrigido aqui; aguarda decisão humana (manter open com evidência ou dismiss
  documentado referenciando PR #528 + `url-guard.ts`/`ip-guard.ts` + §2 do
  `SECURITY_CODEQL_RUNTIME.md`).

## 4. Escalação — #88 é RUNTIME de produção (`RUNTIME_ESCALATION_SE_HOUVER`)

- **Arquivo:** `apps/api/src/common/normalizar-imagem.ts` (D-262) — normaliza URLs de imagem do
  IGDB para exibição: se a URL contém `images.igdb.com`, troca `t_thumb` → `t_cover_big`.
- **Callers (serialização de saída):** `discover.service.ts:216`, `media.controller.ts:504` e `:964`
  (`poster_url`/`imagem_url` de resposta). **Nenhum sink de rede/fetch/exec:** não há requisição
  outbound com essa URL na API; não é SSRF; não toca auth/billing. Risco prático **baixo**
  (transformação de string de display; a URL vem do banco, gravada pela ingestão de fontes).
- **Motivo do alerta:** a regra sinaliza condição por substring de URL (`includes`) como
  sanitização/allowlist incompleta — padrão genérico.
- **Ação nesta tarefa:** **nenhuma correção** (proibido pelo packet). **Recomendação:** task própria
  (T196-C) com `new URL()` + `hostname === "images.igdb.com"` mantendo o replace no pathname, TDD
  e gates completos; decisão de autorização é do Thinker/Operador. **Sem dismiss automático.**

## 5. Exclusões explícitas

- **#151** — critical, runtime, mitigado por `url-guard`/`ip-guard` (T191/PR #528), open por
  limitação da regra; triagem humana pendente do Operador. **Não corrigido, não interagido.**
- **Trivy (119 open; 39/44/36 por severidade)** — estrutura de imagem/base; ruído por design
  (modo relatório, D-534); governado pela decisão de deps.

## 6. Metodologia (read-only)

- Sync: `git fetch/status/rev-parse` → `origin/main = 1f906880` (PR #534); `gh repo view` (repo
  PUBLIC); PRs #515/#518/#522 inalteradas (OPEN); runs do main: CI/Security `success`, Deploy
  `waiting` (não aprovado); smoke passivo do site 6/6 → 200 (`/pt-BR`, `/en-US`, `/es-ES`,
  `/pt-BR/catalog`, `/pt-BR/pricing`, `/pt-BR/login`).
- Inventário: `gh api --paginate ".../code-scanning/alerts?state=open&per_page=100"` com `--jq`
  extraindo **apenas** `tool.name`, `number`, `rule.id`, `security_severity_level`,
  `most_recent_instance.location.path/start_line`, `created_at`, `updated_at` (correção do
  page-size: 128 = 2 páginas; contagem por tool via TSV local em `D:/AITEMP`, fora do repo).
- Contexto: leitura dos arquivos citados (somente para classificar; nenhum código alterado).

## 7. Confirmações

- **Nenhum alerta interagido** — apenas GETs de leitura; nenhum campo de state alterado.
- **Nenhum segredo/PII/snippet/corpo de alerta** impresso, colado ou versionado.
- **Nenhum código/dep/config/workflow/schema** alterado — diff docs-only (§ auditoria no PR).
- Fila CodeQL **runtime esgotada** (T191–T194: SSRF, path-injection, clear-text-logging,
  incomplete-sanitization); esta triagem cobre o restante **não-runtime**.

# Triagem sanitizada dos alertas de code scanning (T189)

**Data:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T189-code-scanning-alerts-triage
**Classificação do ciclo: `DONE_WITH_ESCALATION`** — há **1 CRITICAL e 4 HIGH em código-fonte com
impacto de runtime** que exigem **tarefa de correção dedicada** (não corrigidos aqui, por escopo).

> Sanitização: apenas metadados permitidos (number/state/rule.id/severity/file_path/datas/tool e
> contagens). **Nenhuma descrição, corpo de alerta ou snippet de código foi impresso.** Nenhum
> alerta foi interagido (sem dismiss/resolve/comment/assign). Nada foi alterado além deste relatório/docs.

## 1. Sumário executivo

1. **Correção de contagem:** o número “30 alertas” registrado anteriormente era o **page-size padrão
   da API** (`per_page=30`). O total real: **134 alertas ABERTOS** · **0 dismissed** · **15 corrigidos**
   historicamente.
2. **Composição:** **Trivy 119** (39 high · 44 medium · 36 low) e **CodeQL 15**
   (1 **critical** · 13 high · 1 medium).
3. **Trivy (119):** ruído estrutural de imagem/base-image — **51** na layer `library/mediarate-api`,
   **38** em módulos internos do npm do base image, **12** em deps do app dentro da imagem,
   **18** no `package-lock.json` (mesmo lote de CVEs governado pela allowlist D-462/D-559b/D-559c;
   mitigação principal = **nova PR de deps** já aguardando decisão do Operador desde a T187).
4. **CodeQL (15) — código-fonte; 5 com impacto de runtime** (detalhe na §4): inclui
   **`js/request-forgery` (SSRF) CRITICAL em `http.utils.ts`** (HTTP dos adapters de coleta) e
   **`js/path-injection` HIGH no `upload.controller.ts`**.
5. **Escalonamento:** tarefa de correção dedicada recomendada (**T191**), com TDD/review, uma regra
   por vez. Nada foi corrigido neste ciclo; **sem indício de exploração ativa** (alertas pré-existentes,
   criados entre 2026-09-29 e 2026-10-07).

## 2. Metodologia (read-only)

| Passo | Comando (forma sanitizada) |
|---|---|
| Contagens por estado | `gh api .../code-scanning/alerts?state=<open|dismissed|fixed>&per_page=100 --paginate --jq 'length'` |
| Listagem sanitizada | `...state=open --paginate --jq '.[] \| {number, rule.id, severity, path, tool, created_at}'` |
| Agregações | contagens por `security_severity_level`, `tool.name`, `rule.id`, classe de caminho |

Proibições respeitadas: sem descrição/mensagem/snippet; sem interação com alertas; sem alterar
código/workflows/deps/incidentes/GitHub settings; sem acessar produção.

## 3. Contagens (estado atual)

| Estado | Total |
|---|---|
| **open** | **134** |
| dismissed | 0 |
| fixed | 15 |

**Por ferramenta × severidade:**

| Tool | critical | high | medium | low |
|---|---|---|---|---|
| CodeQL | **1** | 13 | 1 | 0 |
| Trivy | 0 | 39 | 44 | 36 |

**Trivy por classe de caminho:** layer da imagem **51** · npm-internal do base image **38** ·
lockfile **18** · deps do app na imagem **12**. Pacotes citados nos caminhos (evidência):
`tar` (12), `brace-expansion` (8), **`fastify` (7)**, `ip-address` (5), `minimatch` (3),
`postcss-selector-parser` (2), `vitest`, **`sharp`**, `sprintf-js`, `sigstore`, `pacote`,
`http-cache-semantics` (+ equivalentes no lockfile).

## 4. CodeQL — os 15 alertas de código-fonte (metadados sanitizados)

| Sev | Regra | Arquivo | Superfície |
|---|---|---|---|
| **critical** | `js/request-forgery` (SSRF) | `apps/api/src/modules/media-score/adapters/http.utils.ts` | **runtime** (HTTP de coleta) |
| high | `js/path-injection` | `apps/api/src/modules/upload/upload.controller.ts` | **runtime** (upload/IO) |
| high | `js/clear-text-logging` | `apps/api/prisma/seed-origem.ts` | script de seed |
| high | `js/incomplete-sanitization` | `apps/api/src/common/cache.service.ts` | **runtime** |
| high | `js/incomplete-sanitization` | `apps/api/test/cache.service.spec.ts` · `cache.e2e.spec.ts` · `media-admin-crud.e2e.spec.ts` | testes |
| high | `js/incomplete-url-substring-sanitization` | `apps/api/test/audit-igdb-ids.spec.ts` (×3) · `apps/web/test/game-posters-integrity.spec.ts` | testes |
| high | `js/incomplete-multi-character-sanitization` · `js/bad-tag-filter` | `apps/web/e2e/i18n-leak.spec.ts` (×2) | e2e |
| medium | `js/identity-replacement` | `apps/api/scripts/seed-premios-wikidata.mjs` | script |

## 5. Classificação por grupo

| Grupo | Classificação |
|---|---|
| CodeQL runtime (SSRF critical; path-injection; clear-text-logging; cache.service sanitization) | **ATIVO_RELEVANTE + SECURITY_SENSITIVE_SURFACE** → **escalado** (tarefa de correção dedicada) |
| CodeQL em testes/e2e (7 alertas) | **TEST_FIXTURE** — follow-up opcional de higiene nas utilidades de teste |
| CodeQL em scripts (seed ×2) | **DEV_ONLY_OU_TOOLING** — incluir no follow-up de higiene |
| Trivy lockfile + deps do app na imagem (30) | **PRE_EXISTENTE_FORA_ESCOPE** — mesmo lote da allowlist governada; mitigação na trilha de deps (T187 → T190 se autorizada) |
| Trivy base-image/npm-internal/layer (89) | **DEV_ONLY_OU_TOOLING / upstream** — `BAIXO_RISCO_ACEITAVEL` com nota de rebuild do base image como follow-up de infra (não é código do produto) |

Nada foi classificado como falso positivo (sem evidência para tal).

## 6. Escalonamentos (metadados sanitizados)

1. **CRITICAL `js/request-forgery` (SSRF)** em `apps/api/src/modules/media-score/adapters/http.utils.ts`
   — helper HTTP dos adapters/scrapers de coleta (runtime). Correção requer análise dedicada
   (validar origem das URLs/allowlist de host) — **T191** com TDD e review.
2. **HIGH `js/path-injection`** no `upload.controller.ts` (runtime, upload/IO) — **T191**.
3. **HIGH `js/clear-text-logging`** no seed + **HIGH `js/incomplete-sanitization`** no
   `cache.service.ts` (runtime) — **T191**.
4. **Nota de contenção:** alertas **pré-existentes** (2026-09-29→10-07), sem evidência de
   exploração; **nenhuma contenção de emergência aplicada** e nenhuma correção feita neste ciclo
   (escopo read-only/docs-only do pacote).

## 7. Riscos residuais

1. SSRF/path-injection pendentes até a tarefa de correção dedicada (runtime).
2. Ruído Trivy continuará **acumulando por design** (modo relatório — D-534); a redução efetiva vem
   da nova PR de deps (fastify/sharp/undici) + política de imagem base.
3. Alertas `open` antigos permanecem visíveis na aba Security até serem corrigidos ou
   (futuramente, com autorização) dismissados com justificativa — **fora do escopo desta tarefa**.

## 8. Confirmações

- **Nenhum alerta foi interagido** (sem dismiss/reopen/comment/assign/update).
- **Nenhum código, workflow, dependência, secret, infra, incidente ou PR de deps alterado**;
  diff restrito a docs/relatórios/worklog/exchange.
- **Nenhum segredo/PII/snippet/descrição de alerta impresso** — apenas metadados sanitizados.
- Contaminação 123ce28e ausente; smoke passivo 7/7 → 200 (com `/catalog`).

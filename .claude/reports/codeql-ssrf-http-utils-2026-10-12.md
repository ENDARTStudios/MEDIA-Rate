# SSRF em `http.utils` (CodeQL `js/request-forgery`) — correção (T191)

**Data:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T191-codeql-runtime-ssrf-fix
**Classificação:** `SSRF_CRITICAL_MITIGADO_COM_GUARDAS_E_TDD` — o alerta só fecha na próxima
análise do CodeQL; **nenhum alerta foi interagido** (sem dismiss/resolve).

## 1. Sintoma (origem)

Alerta **CRITICAL `js/request-forgery` (SSRF)** em
`apps/api/src/modules/media-score/adapters/http.utils.ts` (triagem T189; pré-existente,
sem indício de exploração).

## 2. Causa raiz

O helper de outbound (`fetchJson`/`fetchTexto`/`postJson`) chamava `fetch` **sem nenhuma
validação**: sem allowlist de hosts, sem checagem de esquema/IP, com **follow automático de
redirects** e com **erros contendo a URL completa** — e as URLs são montadas a partir de
títulos/ids de mídia (dados externos) em 20+ adapters e no backfill.

## 3. Correção (escopo cirúrgico)

| Arquivo | Papel |
|---|---|
| `apps/api/src/common/url-guard.ts` (novo) | allowlist explícita (35 hosts, derivada do uso real), HTTPS-only, sem userinfo, IP literal bloqueado (incl. formas normalizadas pelo WHATWG), subdomínio sem “sufixo armadilha”, validação do IP resolvido **fail-closed** |
| `apps/api/src/common/ip-guard.ts` (novo) | classificação pura de IPs v4/v6 (loopback/privado/link-local/metadata/CGNAT/reservados/6to4/teredo/NAT64/v4-mapeado) |
| `adapters/http.utils.ts` | integra as guardas; **redirect manual** (máx. 3 saltos, cada hop revalidado; POST não segue); erros **sanitizados** (origem+path, sem query); timeout preservado |
| specs (novos + 3 ajustados) | `url-guard.spec.ts`, `http-utils-ssrf.spec.ts`; mocks de DNS adicionados em `adapters-fixa/adapters-novos/media-score-job` |

**Achado do próprio guard (durante o TDD):** o OpenCritic usa o host legítimo do RapidAPI
(`opencritic-api.p.rapidapi.com`), ausente da primeira varredura (construído fora do padrão
`https://…` literal) — **adicionado à allowlist com teste de regressão** (o guard bloqueou os
6 casos do adapter e apontou o host exato).

## 4. TDD (vermelho → verde, sem rede real)

- **RED inicial:** 2 arquivos falhando (módulos ausentes) → depois, 9 falhas reais que
  refinaram spec/implementação (localhost/data: como casos de host/esquema; `[::1]` com
  colchetes nos isIP; rapiddapi host).
- **GREEN:** `url-guard.spec.ts` (matriz completa de URLs proibidas + IPs + DNS com lookup
  injetado) e `http-utils-ssrf.spec.ts` (legítimo, pré-rede, redirects hop-a-hop, loop,
  POST, erro sem vazamento de query) — **100/100 nos 5 specs focados**.
- **Suíte API completa: 154 arquivos / 1191 testes verdes**; `tsc` 0; `eslint` 0;
  `prettier` limpo (após ajuste dos tipos com `noUncheckedIndexedAccess`).
- Nenhum teste faz chamada real de rede (fetch e DNS mockados/injetados).

## 5. Escopo/auditoria

Diff restrito a: 2 guards novos, `http.utils.ts`, 2 specs novos, 3 specs de mock DNS,
doc de política e este relatório/worklog. **Sem** deps/lockfile/workflows/GitHub
settings/schema/auth/billing/incidente/PRs de deps. Nenhum alerta interagido. Contaminação
123ce28e ausente (verificada pré-merge).

## 6. Follow-ups (fora deste escopo)

- O alerta deve fechar na próxima análise do CodeQL sobre a `main`; **se persistir**,
  registrar e escalar (sem suppress).
- Próximas regras da fila: T192 (`js/path-injection`), T193 (`js/clear-text-logging`),
  T194 (`js/incomplete-sanitization`) — política em `docs/08-security/SECURITY_CODEQL_RUNTIME.md`.

## 7. Confirmações

Nenhum valor de segredo/PII impresso; nenhuma interação com alertas; nenhuma alteração de
dependências, workflows, GitHub settings, incidente ou produção; nenhuma reescrita de
histórico. Smoke pós-merge 7/7 (registrado no STATUS).

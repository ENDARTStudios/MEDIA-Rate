# T134 — Prontidão do PLANO_MESTRE e próximo item seguro

**Data:** 2026-09-28 · **Branch:** `docs/t134-plano-mestre-readiness-classification` (base `220c0949`)
**Tipo:** read-only/docs-only. **Nenhum** código alterado; **nenhum** BETA-GAP marcado DONE.

## 1. Sumário executivo

- **Não existe item de código `IMPLEMENTABLE_NEXT`** com definição canônica + escopo seguro
  sem decisão externa. As frentes restantes são: **BETA-GAPs bloqueados** (04/16/17/18
  sem definição; 08 provider; 06 fonte) e **pendências do Operador** (hosting, ADR
  audit-fail, UptimeRobot, deps, staging/migration).
- **Há trabalho seguro disponível, docs-only:** reconciliar **notas obsoletas** do
  `PLANO_MESTRE.md` que hoje contradizem o código (2.6, 6.14, 9.4 e o cabeçalho da Fase 10).
- Decisão: **`NEXT_PACKET_AVAILABLE`** = **T135 docs-only** de reconciliação (baixo risco);
  todas as frentes de **produto/código** permanecem `NEEDS_OPERATOR_DECISION`.

## 2. Metodologia (read-only)

`rg`/leitura de `PLANO_MESTRE.md`, `DECISOES.md`, `docs/`, `.claude/reports/`,
`apps/api/src|test`, `apps/web/src|e2e|test`, `.github/workflows`, `scripts`; `git log`;
`gh pr list/view`; smoke passivo. Checkbox `[x]` **não** foi aceito sozinho.

## 3. Estado do programa BETA-GAP

12 DONE + 1 PARTIAL (06) + 5 BLOCKED (04/08/16/17/18) — ver registry. Nada muda aqui.

## 4. Matriz de itens pendentes/ambíguos do PLANO_MESTRE

| fase_item | título | estado_no_plano | evidencia_codigo | evidencia_teste | evidencia_doc | classificacao | dependencia | risco | recomendacao |
|---|---|---|---|---|---|---|---|---|---|
| 2.4 | Tabelas de auth (`permissions` granulares) | `[~]` | RBAC via `@Roles`/`RequirePlan`; `Permissions` ausente | `rbac.spec`, `admin-rbac.spec` | T119/D-559 | **NOT_APPLICABLE** | by-design (postergado) | baixo | manter (decisão vigente) |
| 2.6 | `audit_log` + nota D-546 "correção pendente" | `[x]` (nota obsoleta) | **fix aplicado**: `audit-log.service.ts:36-58` (`created_at: agora`, fonte única) | `audit-integrity-drift.spec` | D-546 | **COVERED (nota stale)** | — | baixo | **T135 docs: remover "pendente"** |
| 2.7 | governança `data_sources`/`entity_revisions` | `[ ]` | **ausentes** | — | T130 | **BLOCKED_AMBIGUOUS_SPEC** | definição de produto | alto | Operador definir (objetivo/aceite) |
| 2.10 | cifragem de coluna | `[~]` | `ColumnEncryptionService` (não wired) | — | D-557/P017 | **NEEDS_OPERATOR_DECISION** | secret+migration | alto | manter P017 (deferido) |
| 3.7 | audit logging de auth | `[x]` | `auth.service.ts` wiring completo | `auth-audit.spec` 23/23 | T133 | **COVERED** | — | baixo | — |
| 4.4 | watchlist | `[x]` | `watchlist.service/controller` | watchlist 50/50 | T131/T132 | **COVERED** | — | baixo | — |
| 6.11/6.12/6.15 | BullMQ / IA-RAG / WebSocket | `[~]` | postergados | — | D-017 | **NOT_APPLICABLE** | roadmap | baixo | manter postergado |
| 6.14 | Feature flags "não implementado - gap aberto" | `[~]` (nota obsoleta) | **implementado**: `flags/feature-flags.controller.ts` (CRUD ADMIN) | `feature-flags.spec.ts` | T292 | **COVERED (nota stale)** | — | baixo | **T135 docs: corrigir nota** |
| 7.8/7.9/7.10 | rotação/Vault/DNSSEC | `[~]` | dispensa documentada / N/A | — | D-5xx | **NOT_APPLICABLE** | infra | baixo | manter |
| 8.9 | Pipeline IA | `[~]` | N/A | — | D-017 | **NOT_APPLICABLE** | roadmap | baixo | manter |
| 9.4 | "domínio + branch protection pendentes" | `[~]` (nota obsoleta) | domínio live; ruleset `protect-main` ativo | smoke 200 | T124 | **COVERED (nota stale)** | — | baixo | **T135 docs: corrigir nota** |
| 9.5.4 | UptimeRobot | `[~]` | — | — | P015 | **NEEDS_OPERATOR_DECISION** | conta externa | baixo | Operador criar conta |
| 9.12/P012/P013 | staging/migration path | `[~]` | workflow manual existe | — | b1-prod-guards | **NEEDS_OPERATOR_DECISION** | environment/Operador | médio | Operador decidir |
| 9.14/9.15 | alertas métricos + uptime sintético | `[~]` | workflows merged/agendados | self-tests 18/18, 11/11 | D-538/D-539 | **PARTIAL** | `METRICS_URL`+`ADMIN_TOKEN`; UptimeRobot | médio | Operador ativar live |
| T037 | deps HIGH (deepmerge-ts) | `[~]` | — | — | P009 | **NEEDS_OPERATOR_DECISION** | upgrade de deps | médio | Operador decidir |
| T041 | PR #74 (Fase 10) | `[~]` | PR #74 OPEN/stale | — | — | **NEEDS_OPERATOR_DECISION** | limpeza de PR | baixo | Operador decidir |
| cabeçalho Fase 10 | "T030-T033 abertas" | `[~]` (nota obsoleta) | T030–T036 `[x]` | — | — | **COVERED (nota stale)** | — | baixo | **T135 docs: corrigir cabeçalho** |

## 5. Itens `COVERED` (com evidência)

3.7 (T133), 4.4 (T131/T132), 6.14 (flags), 2.6 (D-546 aplicado), 9.4 (domínio/ruleset).

## 6. Itens `PARTIAL`

9.14/9.15 (workflows ativos; ativação live = Operador).

## 7. Itens `IMPLEMENTABLE_NEXT`

**Nenhum item de produto/código.** O único trabalho seguro/determinístico restante é
**docs-only**: reconciliar as notas obsoletas do `PLANO_MESTRE.md` (2.6, 6.14, 9.4,
cabeçalho Fase 10) com a realidade do código.

## 8. Bloqueados por decisão/provider/dados/definição

- **Definição:** BETA-GAP-04/16/17/18, PLANO 2.7 (`data_sources`/`entity_revisions`).
- **Provider/licença:** BETA-GAP-08.
- **Fonte de dados:** BETA-GAP-06.
- **Operador (custo/infra/segurança/deps):** hosting A/B/C (T124); ADR política de falha
  do audit de auth (T133); UptimeRobot (P015); `METRICS_URL`/`ADMIN_TOKEN` (D-538);
  staging/migration path (P012/P013); deps HIGH (P009); PR #74 (T041); P017 (cifragem).

## 9. Recomendação objetiva do próximo task packet

```text
RECOMENDACAO: IMPLEMENTAR T135 (docs-only) — reconciliação de notas obsoletas do PLANO_MESTRE
MOTIVO: definição clara (notas contradizem o código), zero dependências, risco baixo, sem tocar áreas críticas.
PROPOSTA_DE_PACKET: T135-plano-mestre-notas-obsoletas
OBJETIVO: corrigir apenas as linhas 2.6 (remover "pendente" D-546), 6.14 (feature flags implementadas), 9.4 (domínio+ruleset ativos) e o cabeçalho da Fase 10 (T030–T036 concluídas), com evidência.
ESCOPO: PLANO_MESTRE.md + relatório/worklog; SEM código.
CRITERIOS_DE_ACEITE: diff só em docs; linhas corrigidas com evidência citada; PR required verde; smoke 7/7.
HARD_STOPS: não alterar código/schema/segredo/infra; não marcar BETA-GAP DONE; não declarar Fase completa.
RISCO: baixo.
```

## 10. Pendências do Operador (sanitizadas)

1. Definição/aceite BETA-GAP-04/16/17/18.
2. Provider/licença BETA-GAP-08.
3. Fonte de dados BETA-GAP-06.
4. Hosting A/B/C (T124).
5. ADR política de falha do audit de auth (T133).
6. UptimeRobot (P015) + `METRICS_URL`/`ADMIN_TOKEN` (D-538).
7. Staging/migration path (P012/P013).
8. Deps HIGH (P009) + PR #74 (T041) + P017 (cifragem de coluna).

## 11. Decisão final

`NEXT_PACKET_AVAILABLE` — **T135 docs-only** (reconciliação de notas do PLANO_MESTRE).
Todas as frentes de **produto/código** estão `NEEDS_OPERATOR_DECISION`.

## 12. PR / merge

- Commit: `(a preencher)` · PR: `(a preencher)` · base `220c0949`.

## 13. Follow-up T135 (2026-09-29) - reconciliacao

Notas obsoletas identificadas na T134 foram reconciliadas docs-only na T135: 2.6 (D-546 aplicado), 6.14 (feature flags implementado), 9.4 (dominio live + ruleset protect-main ativo) e cabecalho da Fase 10 (T029-T036 concluidas). As classificacoes materiais desta matriz (COVERED/PARTIAL/NEEDS_OPERATOR_DECISION/NOT_APPLICABLE/BLOCKED) permanecem inalteradas. Evid: .claude/reports/plano-mestre-stale-notes-2026-09-29.md. Nenhum BETA-GAP foi fechado.

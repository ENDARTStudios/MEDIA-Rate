# T135 — Reconciliação docs-only das notas obsoletas do PLANO_MESTRE

- **Data:** 2026-09-29
- **Fase:** F10-beta-product-gap
- **Tarefa:** T135-plano-mestre-stale-notes-reconciliation
- **Tipo:** docs-only / read-only (nenhum código, schema, auth, billing, entitlement, segredo, infra ou environment alterado)
- **Base:** `origin/main` = `a7b8a8d9` (após PR #355)
- **Decisão final:** `DOCUMENTATION_RECONCILED`

## 1. Sumário executivo

A T134 apontou que o `PLANO_MESTRE.md` continha notas de prontidão que **contradizem o estado real do repositório**. A T135 reconfirmou cada evidência ao vivo (código, testes, CI, domínio e ruleset) e reconciliou a documentação.

Achado central: **não há trabalho de produto/código seguro a implementar agora**; o único trabalho determinista restante era remover contradições documentais. Reconciliar notas **não fecha BETA-GAP** e **não libera GO para convites**.

Resultado: as 4 contradições (2.6, 6.14, 9.4 e cabeçalho da Fase 10) foram corrigidas com evidência curta e linkada. Nenhuma fase inteira foi declarada concluída indevidamente. Nenhum BETA-GAP foi alterado.

## 2. Metodologia (reconfirmação live)

1. `git fetch origin`; confirmado `origin/main = a7b8a8d9` e branch `docs/t135-plano-mestre-stale-notes-reconciliation` criada a partir de `origin/main`.
2. **2.6:** grep em `apps/api/src/common/audit-log.service.ts` → `D-546` (linha 36) e `created_at: agora` (linha 58).
3. **6.14:** `apps/api/src/modules/flags/{feature-flags.controller.ts, feature-flags.module.ts, feature-flags.service.ts}` existem; `apps/api/test/feature-flags.spec.ts` com 7 casos (`it`/`describe`).
4. **9.4:** `mediarate.app` responde HTTP 200 nos 3 locales; `gh api repos/ENDARTStudios/MEDIA-Rate/rulesets` → ruleset `protect-main`, `enforcement=active`, `target=branch`.
5. **Cabeçalho Fase 10:** T030–T036 verificadas como `[x]` no próprio PLANO.
6. Auditoria de diff (`git diff --name-only origin/main...HEAD`) para garantir escopo restrito a documentos.

## 3. Tabela por item

| item | nota_antiga | evidencia_atual | arquivo/linha | teste/CI | domain/ruleset | classificacao_final | acao_documental |
|---|---|---|---|---|---|---|---|
| **2.6** | "[D-546] correção recomendada (gravar `created_at` explícito) pendente em PR dedicado" | Correção JÁ aplicada: `created_at: agora` (fonte única de tempo) | `apps/api/src/common/audit-log.service.ts:36-58` | `audit-integrity-drift.spec.ts` (verde em CI histórico) | — | **COVERED** | Nota trocada para COVERED com evidência de código + link do relatório |
| **6.14** | "Feature flags: não implementado — gap aberto (F11/T292 planejada)" | Implementado: controller + module + service + spec | `apps/api/src/modules/flags/feature-flags.controller.ts`; `apps/api/test/feature-flags.spec.ts` | `feature-flags.spec.ts` (7 casos) | — | **COVERED** | `[~]` → `[x]` com evidência |
| **9.4** | "domínio mediarate.app pendente; branch protection da main pendente" | Domínio live; ruleset ativo | `PLANO_MESTRE.md:246` | smoke 7/7 (histórico T134) | `mediarate.app` 200 (3 locales); ruleset `protect-main` `active`/`branch` | **COVERED** | `[~]` → `[x]` com evidência live/GitHub |
| **Cabeçalho Fase 10** | "T029 concluída (D-439); T030–T033 abertas" | T030–T036 concluídas | `PLANO_MESTRE.md:23` | build/test históricos | — | **COVERED** (status) | Status atualizado; **fase mantida `[~]`** (não concluída) |

## 4. O que a reconciliação NÃO faz

- **Não fecha BETA-GAP.** BETA-GAP-06 permanece `PARTIAL_UI_CONTRACT_READY`/`BLOCKED_DATA_SOURCE`; BETA-GAP-04/16/17/18 permanecem `BLOCKED_AMBIGUOUS_SPEC`; BETA-GAP-08 permanece `BLOCKED_EXTERNAL_PROVIDER`.
- **Não libera GO para convites** (permanece SUSPENSO).
- **Não declara** Fase 3, 4, 6, 9 ou 10 inteiramente concluídas. Só itens específicos, com evidência.
- **Não destrava código**: as frentes restantes dependem de decisão externa.

## 5. Pendências do Operador (permanecem abertas)

1. Definição/aceite: BETA-GAP-04/16/17/18 (`BLOCKED_AMBIGUOUS_SPEC`) e PLANO 2.7 (`data_sources`/`entity_revisions`).
2. Provider/licença: BETA-GAP-08 (`BLOCKED_EXTERNAL_PROVIDER`).
3. Fonte de dados: BETA-GAP-06 (`PARTIAL`).
4. Hosting A/B/C (T124).
5. ADR política de falha do audit de auth (fail-open vs fail-closed).
6. UptimeRobot (P015) + `METRICS_URL`/`ADMIN_TOKEN` (D-538).
7. Staging/migration path (P012/P013).
8. Deps HIGH (P009) + PR #74 (T041) + P017 (cifragem de coluna).

## 6. Decisão final

**`DOCUMENTATION_RECONCILED`** — notas obsoletas 2.6, 6.14, 9.4 e cabeçalho da Fase 10 reconciliadas com evidência reconfirmada ao vivo. Nenhum BETA-GAP alterado; nenhum código/schema/auth/billing/infra/segredo alterado.

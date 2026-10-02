# T091 — Triagem read-only das PRs legadas abertas

**Data (UTC):** 2026-09-27 · **Autor:** Doer · **Fase:** F00-planning · **Base:** `origin/main` = `2be23c6`
**Mutação executada no GitHub: NENHUMA** (sem close/comment/review/label/rebase/update-branch/rerun/merge).

## Executive summary

7 PRs estavam abertas no momento da leitura: 1 ativa/recente (#279), 1 legada-stale limpa (#140),
1 legada com check falhando (#139), 1 mass-lockfile bloqueada/obsoleta (#133), 2 conflitantes antigas
(#4, #3) e 1 rascunho abandonado (#2). A **#266** (fluxo de outro agente) **já está MERGED** — registro
histórico apenas. Nenhuma PR foi tocada. Recomenda-se que o Operador decida higiene; **nenhuma ação de
fechamento deve ser executada sem essa decisão**.

## Inventário sanitizado

| PR | State | Draft | Mergeable | mergeState | Files | ±linhas | Checks (pass/fail/skip) | Classificação | Recomendação (read-only) |
|---|---|---|---|---|---|---|---|---|---|
| #266 | **MERGED** | não | — | — | 8 | +96/−134 | 19/0/4 | **histórica** (outro agente) | Ignorar (já integrada) |
| #279 | OPEN | não | MERGEABLE | CLEAN | 6 | +79/−22 | 18/0/5 | **ativa-recente** (2026-09-25) | Decisão do Operador (não é desta frente) |
| #140 | OPEN | não | MERGEABLE | CLEAN | 14 | +1081/−72 | 14/0/4 | **legada-stale** (2026-09-22) | candidate-to-review (Operador) |
| #139 | OPEN | não | MERGEABLE | **UNSTABLE** | 6 | +331/−40 | 13/**1**/4 | **legada-stale + CI vermelho** | candidate-to-review/fix (Operador) |
| #133 | OPEN | não | MERGEABLE | **BLOCKED** | 1 | +14751/−13872 | 11/**2**/5 | **mass-lockfile obsoleta** | **candidate-to-close** |
| #4 | OPEN | não | **CONFLICTING** | DIRTY | 6 | +246/−0 | 2/**5**/7 | **conflitante/obsoleta** (2026-08-15) | **candidate-to-close** |
| #3 | OPEN | não | **CONFLICTING** | DIRTY | 6 | +169/−1 | 2/**5**/7 | **conflitante/obsoleta** (2026-08-15) | **candidate-to-close** |
| #2 | OPEN | **sim** | **CONFLICTING** | DIRTY | 12 | +3015/−142 | 2/**4**/2 | **rascunho abandonado** (2026-07-25) | **candidate-to-close** |

Metadados apenas (números, booleanos, contadores). **Nenhum** título/branch/author/patch/corpo/comentário
de PR foi copiado — evitando risco de PII/segredo. `headRefOid` registrado só para rastreabilidade
(hashes não sensíveis).

## Riscos de manter as PRs abertas

- Confusão de estado: checks/pipelines de PRs antigas competem por atenção e ruído no backlog.
- #133 (`chore/update-deps`, ±27k linhas de lockfile) pode induzir mass-update perigoso se reaberto.
- #4/#3/#2 estão `CONFLICTING/DIRTY`: qualquer merge acidental exigiria rebase manual arriscado.
- PRs legadas de LGPD (#140/#139) podem conter texto legal desatualizado — **exige** revisão do Operador.

## Recomendações

**Executáveis futuramente pelo Doer (com autorização explícita):**
1. Re-auditar #140/#139 (LGPD) e alinhar com o estado legal atual antes de qualquer ação.
2. Se o Operador autorizar higiene: fechar #4, #3, #2 e #133 como obsoletas (com comentário padrão).

**Exigem decisão do Operador (não executar agora):**
- #279 (ativa-recente, CLEAN): confirmar proprietário/intenção; **não** mergear nesta frente.
- #140 / #139: decidir atualizar vs. fechar.
- #133: confirmar fechamento (superseded pelas deps atuais).

**Devem ser simplesmente ignoradas (histórico):**
- #266 (já MERGED, fluxo de outro agente) e demais PRs já integradas.

## Declaração de read-only

Nenhuma operação mutacional foi executada em PRs, branches, labels, milestones, workflows, issues,
releases, environments, secrets, vars ou settings. Apenas `gh … view/list/checks/diff --name-only` e
leituras via git. Sem merge, sem deploy, sem aprovação de `Production`. **Beta NÃO declarada pronta.**

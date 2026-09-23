# ITERATION — O ciclo completo de uma iteração

O modelo operacional do projeto (Thinker/Doer + Operador). Arquivos-mestre:
`PROTOCOLO_MESTRE.md` e `PROMPT_SIMBIOSE_THINKER_DOER.md`.

## O ciclo (10 passos)

```
1. TAREFA (Thinker→Doer, JSON: objetivo, arquivos, restrições, critério_de_pronto)
2. Inventário ANTES de construir (o que já existe? premissa pode ser stale — T027)
3. Branch CURTA (fix/xxx) — nunca renomear head de PR aberto
4. TDD quando o gap é comportamento: spec vermelho pelo motivo certo → verde mínimo
5. Suítes + lint + tsc locais verdes
6. PR aberto SEM merge (commits atômicos type(TNNN): msg; docs no MESMO PR)
7. CI verde no HEAD FINAL (13+ checks; required: docs-gate + Migration Safety (B1))
8. STATUS DONE/READY_FOR_REVIEW com evidência → REVIEW (Thinker) → APPROVED
9. Merge condicional (TAREFA própria): merge commit → monitorar Railway+Vercel+
   deploy.yml → SMOKE obrigatório (docs/QA_TESTING.md) → evidência (PR/issue/worklog)
10. Fechamento: PLANO com evidência, DECISOES se mudou regra, branches deletadas
    APÓS o smoke; pendências do Operador registradas (P0NN) quando aplicável
```

## Exemplo real ponta a ponta (T028 — 404 pré-Prisma)

1. TAREFA "T028-micro": corrigir #148 item 13 (500 em id inválido) com TDD.
2. Inventário: mock in-memory não emula P2023 → spec deve **espiar o service**.
3. Branch `fix/t028-item13-uuid-404`; spec `param-uuid-404.spec.ts` → vermelho 6/8.
4. `UuidParamPipe` + wiring em 6 rotas → verde 8/8; suíte API 897/897.
5. PR #163 aberto SEM merge; review do Thinker exigiu Swagger coerente →
   `@ApiNotFoundResponse` nas 6 rotas ANTES do merge (head novo, CI re-rodou).
6. TAREFA de merge: auditoria → merge commit `156e18b` → Railway/Vercel/deploy.yml
   verdes → smoke: 404 nas rotas malformadas, logs 1:1 (item 14 zeroado), 0 csrf em
   log → evidência na #148 → docs PR #166 → branches deletadas.

## Regras do ciclo

- **Doer nunca mergeia sem autorização explícita** (REVIEW APPROVED ou TAREFA de
  merge). Rollback é por revert (nunca force push).
- **Evidência ou não aconteceu** (D-505): status/`[x]` só com commit/run/smoke citável.
- **Apêndice só**: worklog/DECISOES/PLANO nunca reescrevem história.
- Novo **required check** no CI: inventariar PRs abertas antes (P011/D-533 — check
  ausente em PR antiga vira bloqueio "Expected").
- Segredo em evidência = falha grave (docs-gate é fail-closed no arquivo inteiro).

## Cadência

`SPRINT.md` (iteração corrente) → demandas viram TAREFAs ([TASKS](TASKS.md)) →
quebra por [TASK_BREAKING_DOWN](TASK_BREAKING_DOWN.md) → este ciclo →
`PLANO_MESTRE.md`/[ROADMAP](ROADMAP.md) absorvem o resultado.

# TASKS — Fluxo de tarefas do projeto

O trabalho anda em três trilhas, todas com rastreabilidade em arquivo:

## 1. PLANO_MESTRE (fases do produto)

`PLANO_MESTRE.md` — fases 0-11, itens `[x]` (feito+evidência), `[~]` (parcial),
`[ ]` (aberto). Ao concluir um item: marcar com evidência (commit/PR/run) NO MESMO PR
da mudança. Nenhum `[x]` sem artefato (D-505).

## 2. Protocolo Thinker/Doer (execução por agentes)

Ciclo por evento JSON (detalhes: `PROMPT_SIMBIOSE_THINKER_DOER.md`):

1. **TAREFA** (Thinker→Doer): payload com objetivo, arquivos, restrições,
   `criterio_de_pronto`, `verificacao`.
2. **Doer executa** por [ITERATION](ITERATION.md): branch curta → TDD → PR **aberto
   SEM merge** → CI verde → `STATUS: DONE|READY_FOR_REVIEW` com evidência.
3. **REVIEW** (Thinker): `APPROVED|APPROVED_CONDITIONAL|BLOCKED` + gates.
4. **Merge condicional** (autorizado em TAREFA própria): merge commit, monitor de
   deploy, **smoke de produção obrigatório**, evidência documental.

Regras duras: Doer não mergeia sem autorização explícita; rollback por revert é a
contingência; segredos nunca em evidência.

## 3. Issues GitHub (rastreio externo)

- **#148** — tracker de dívidas não-bloqueantes (itens 1-14; FEITOS: 11/13/14;
  ver `.claude/reports/beta-blockers.md` para a triagem completa).
- Issues automáticas (Sentry/ZAP/CodeQL) — triagem em `docs/SECURITY_TRIAGE.md`.

## Como uma demanda vira tarefa

```
Demanda (Operador/review/issue)
 → Thinker: enquadra em PLANO_MESTRE + emite TAREFA (escopo, restrições, critério)
 → Doer: inventário PRIMEIRO (o que já existe? — T027 provou que premissas podem
   ser stale) → TDD → PR → CI → evidência
 → Thinker: REVIEW → merge condicional → smoke → docs (worklog/DECISOES/PLANO)
```

## Definition of Done (toda tarefa)

- [ ] CI verde no head final do PR (incl. required checks)
- [ ] Testes novos quando o gap é de comportamento (TDD vermelho→verde)
- [ ] Docs atualizadas no mesmo PR (suíte `docs/` + PLANO/worklog)
- [ ] Evidência de produção quando muda comportamento visível (smoke padrão:
      `docs/QA_TESTING.md`)
- [ ] Sem segredos em log/commit/evidência

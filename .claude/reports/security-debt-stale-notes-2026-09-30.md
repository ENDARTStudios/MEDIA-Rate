# T138 — Reconciliação docs-only das notas de dívida de segurança (PLANO_MESTRE)

- **Data/hora UTC:** 2026-09-29T19:10Z
- **Fase:** F08-tests-security
- **Tarefa:** T138-security-debt-stale-notes-reconciliation
- **Tipo:** docs-only / read-only (nenhuma dependência, código, schema, segredo, infra ou environment alterado)
- **Base:** `origin/main` = `3d9b5a66` (após PR #358)
- **Decisão final:** `DOCUMENTATION_RECONCILED`

## 1. Sumário

O `PLANO_MESTRE.md` (seção **FASE 10**) mantinha notas **obsoletas** sobre a dívida/CI herdada do pacote Fase 10. A T138 reconfirmou cada evidência ao vivo e reconciliou apenas os itens evidenciados. Também registrou que **P009 permanece sob D-462** e **P017 sob D-557**, e que **PR #300** é decisão pendente do Operador.

## 2. Metodologia (read-only, reconfirmação live)

```text
git fetch origin; git status --short; git rev-parse HEAD      -> main=3d9b5a66; working tree limpo
gh pr view 74  -> state=MERGED, mergedAt=2026-09-07, head=feat/f10-image-optimization
gh pr view 300 -> state=OPEN, head=chore/update-deps (lockfile), updatedAt=2026-09-27
grep PLANO/DECISOES por T041/T042/T044/T037/P009/P017
npm run audit:ci (T137) -> verde; package.json config.auditAllowlist (GHSA-ggr8-5vv4-36mx, D-462)
```

Nenhum comando mutante. Nenhum segredo/PII.

## 3. Tabela por item

| Item | Nota antiga | Evidência reconfirmada | Classificação | Ação documental |
|---|---|---|---|---|
| **T041** | `[~]` "abrir PR do pacote Fase 10 (PR #74 open; checks vermelhos herdados do main)" | `PR #74` **MERGED** `2026-09-07` | **COVERED** | `[~]` → `[x]` com evidência |
| **T042** | `[>]` "CI-repair (lint herdado + prisma generate + CodeQL/ZAP)" | D-470/D-472 (CI-repair aprovado) + `audit-ci` verde | **COVERED** | `[>]` → `[x]` com evidência |
| **T044** | `[>]` "diagnóstico CI vermelho PR #74" | Causa-raiz confirmada (D-490; CodeQL/GHAS); `PR #74` merged | **COVERED** | `[>]` → `[x]` com evidência |
| **T037** | `[~]` "(…P009 no Operador)" | **D-462** aceitou risco dev-only + allowlist + `audit:ci`; revisão `2026-12` | **PARCIAL (aceito)** | Anotado D-462; permanece `[~]` |
| **2.10 / P017** | Terminava em T055/D-545 | **D-557** (cifragem adiada pós-Beta) + guarda `schema-sensitive-columns.spec.ts` | **ADIADO (aceito)** | Anotado D-557; permanece `[~]` |
| **PR #300** | (não citado no PLANO) | `OPEN`/`UNKNOWN` · `chore/update-deps` (só `package-lock.json`) | **NEEDS_OPERATOR_DECISION** | Registrado em `PENDENCIAS_OPERADOR.md` |

## 4. P009 / P017 — permanecem em vigor (sem nova ação)

- **P009**: continuar **D-462** (risco residual dev-only aceito, allowlist cirúrgica, gate `audit:ci` verde, revisão `2026-12`). Nenhum downgrade/upgrade executado.
- **P017**: continuar **D-557** (cifragem de colunas **adiada pós-Beta**). `ColumnEncryptionService` permanece **não wired**; guarda anti-regressão mantida. Nenhum schema/backfill/wiring.

## 5. Pendência objetiva do Operador — PR #300

`chore/update-deps` (`package-lock.json`) segue **OPEN**. **Nenhuma ação automática foi tomada** (não reviver, não fechar, não atualizar lockfile, não mergear). Opções: **reviver** (PR próprio com CI) / **fechar** (higiene) / **substituir** / **adiar**.

## 6. Confirmações de escopo

- Nenhuma alteração de código/dependências/lockfile/schema/migration/segredo/infra/environment.
- Nenhum BETA-GAP alterado; Fase 8/9/10 **não** declaradas inteiramente concluídas.
- Diff restrito a docs/relatórios/pendências/worklog/exchange.

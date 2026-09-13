# CI — política de checks e merges (T459 / D-457)

## Regra

**Nenhum merge em `main` sem CI verde.** Push direto em `main` com bypass de
branch protection é **proibido** — exceção apenas em resposta a incidente, e
registrada em `DECISOES.md`.

## Como funciona (após T459)

O workflow `ci.yml` **sempre dispara** em PRs e pushes para `main`. O
`paths-ignore` foi movido do nível de workflow para o nível de job:

- **`changes`** (`Detect Changes`) — detecta se há mudança de **código** (fora
  de `docs/**`, `*.md`, `.claude/**`, `docs/screenshots/**`).
- **`docs-gate`** (`Docs Gate`) — job leve que **SEMPRE roda** (secret scan nos
  arquivos alterados + sanity de markdown não-vazio). É **check requerido** do
  ruleset `protect-main`. Roda em < 1 min.
- **Jobs pesados** (`Lint & Audit`, `Test & Coverage`, `Build`,
  `RLS Isolation (T290/T299/T301)`, `Semgrep (SAST)`, `ZAP Baseline (DAST)`,
  `Stryker Mutation`, `E2E Playwright`) — rodam apenas quando
  `changes.code == 'true'` (ou pulam por dependência). Em PR só-de-docs
  reportam `skipped`, que o GitHub considera satisfatório para checks
  requeridos.

## Por que (contexto)

Antes, com `paths-ignore` no nível de workflow, um PR só-de-docs **nunca**
produzia os checks requeridos → o merge ficava permanentemente `BLOCKED` → a
única saída era **bypass** de branch protection, o que corrói a governança
("nenhum merge sem CI verde" vira letra morta). Agora todo PR reporta ao menos
um check requerido verde (`Docs Gate`) e os jobs pesados continuam econômicos
(D-382).

## Checks requeridos (ruleset `protect-main`)

`Lint & Audit` · `Test & Coverage` · `Build` ·
`RLS Isolation (T290/T299/T301)` · `Docs Gate`.

## Manutenção

- Ao adicionar um job pesado novo, adicione `needs: [changes]` +
  `if: needs.changes.outputs.code == 'true'` (ou dependa de um job que já
  tenha) e **não** o coloque como requerido sem `changes`.
- `docs-gate` **não** deve ganhar `paths-ignore` nem `if` de mudança.

## Validação (T459 — 2026-09-13)

PR só-de-docs de validação (esta mudança): `Docs Gate` verde e os jobs pesados
`skipped`; merge sem bypass, com `Docs Gate` entre os checks requeridos do
ruleset `protect-main`. Confirmou o fim do deadlock (antes: PR só-de-docs
ficava `BLOCKED` e exigia bypass).

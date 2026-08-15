# WORKFLOW_GITHUB.md — Issues + PRs (D-317)

> Padrão obrigatório de trabalho para **qualquer agente de qualquer modelo**.
> Toda tarefa vira Issue; toda implementação vira PR com menção à Issue.
> `main` só recebe merge via PR (CI verde + review), exceto reconciliação de
> estado (chore:).

## 1. Fluxo completo (Issue → branch → PR → review → merge)

```
1. ISSUE     gh issue create (template .github/ISSUE_TEMPLATE/tarefa.md)
2. BRANCH    git checkout -b feature/<tarefa-id>
3. CODIFICA  commits convencionais atômicos
4. PUSH      git push -u origin feature/<tarefa-id>
5. PR        gh pr create --fill (template PULL_REQUEST_TEMPLATE.md) — "Closes #N"
6. CI        verde (lint + typecheck + test + security)
7. REVIEW    Thinker aprova via comentário no PR
8. MERGE     squash/rebase → main
```

## 2. Como criar uma Issue (via `gh`)

```bash
# Uma issue por tarefa do PLANO_MESTRE.md
gh issue create \
  --title "Tarefa T350-issues-prs-workflow" \
  --body-file - <<'EOF'
## Objetivo
<copiado do payload TAREFA>

## Critérios de pronto
- ...

## Arquivos afetados
- ...
EOF
```

Labels por fase: `F00-setup`, `F01-infra`, ..., `F11-prd-addendums`.
Milestone: `Open Beta Hardenada`.

## 3. Como abrir um PR (via `gh`)

```bash
git checkout -b feature/T350-issues-prs-workflow
# ... commits ...
git push -u origin feature/T350-issues-prs-workflow
gh pr create --base main --title "docs: T350 workflow Issues+PRs" --body "Closes #N ..."
```

Regra: o corpo do PR **deve** conter `Closes #<n>` da Issue correspondente
(anti-commit-órfão). O PR template (`.github/PULL_REQUEST_TEMPLATE.md`)
reforça isso.

## 4. Convenções de título

- **Branch:** `feature/<tarefa-id>` (ex.: `feature/T350-issues-prs-workflow`).
- **Commit:** convencional (`feat|fix|chore|docs|refactor|perf|security(scope): msg`).
- **PR:** `tipo(scope): descrição curta` (mesmo padrão do commit principal).

## 5. Exceção — reconciliação de estado

Commits de reconciliação de estado (ex.: `chore: reconcilia PLANO_MESTRE`) NÃO
são tarefa de produto e continuam como **push direto em main**. São mudanças
mecânicas de livro-razão (PLANO_MESTRE/DECISOES), não código.

## 6. Requisitos de ambiente

- `gh` CLI autenticado (`gh auth login`) ou `GITHUB_TOKEN` no CI (escopo
  mínimo `repo` + `workflow`).
- Sem `gh`: o PR/Issue pode ser criado pela UI do GitHub
  (`https://github.com/ENDARTStudios/MEDIA-Rate` → New issue / New pull request)
  ou pelo CI (workflow de automação).

## 7. Auditoria externa

PRs são revisáveis por terceiros — todo o histórico fica público e rastreável
(Issue ↔ PR ↔ commit ↔ decisão D-xxx em DECISOES.md).

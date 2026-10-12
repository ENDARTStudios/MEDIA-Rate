# Proteção da branch `main` (ruleset `protect-main`) — estado e verificação

**Última verificação:** 2026-10-11 (T197, read-only) · **Estado:** `GOV01_COMPLETE` (sem drift)
**Relatório da verificação:** `docs/08-security/reports/gov01-ruleset-verification-2026-10-12.md`

## O que protege a `main`

A proteção **não** usa a "branch protection" clássica (a API responde `404 Branch not protected`) —
usa **rulesets**. O ruleset ativo é `protect-main` (**id 20801818**, `target: branch`,
`enforcement: active`), aplicado a `~DEFAULT_BRANCH` e `refs/heads/main`.

| Controle | Estado | Regra no ruleset |
|---|---|---|
| Bloqueia deleção da branch | ✅ ativo | `deletion` |
| Bloqueia force push / non-fast-forward | ✅ ativo | `non_fast_forward` |
| Exige pull request (proíbe push direto) | ✅ ativo | `pull_request` |
| Checks de CI obrigatórios | ✅ ativo | `required_status_checks` (6 checks) |
| Bypass (admin/organização/app) | ✅ **nenhum** | `bypass_actors: []` |

**Checks required (nomes exatos):** `Lint & Audit`, `Test & Coverage`, `Build`,
`RLS Isolation (T290/T299/T301)`, `Docs Gate`, `Migration Safety (B1)`.

## Observações (não são gaps de Gov-01)

- **`required_approving_review_count: 0`** — a regra de PR existe, mas **não exige aprovação
  formal**. O gate de review é **processual** (protocolo Thinker/Doer: `REVIEW APPROVED`
  registrado no PR). Elevar para ≥1 é **Gov-02**, decisão separada que exige um segundo
  revisor humano ativo — deliberadamente fora do escopo desta verificação.
- **`strict_required_status_checks_policy: false`** — permite merge com a base levemente
  desatualizada (comportamento atual conhecido; os checks ainda precisam passar no head).
- **`delete_branch_on_merge: false`** (setting do repositório, não do ruleset) — o projeto
  deleta a branch no merge via `gh pr merge --delete-branch`.
- `allow_merge_commit`/`allow_squash_merge`/`allow_rebase_merge` são todos `true` no GitHub;
  o **processo** do projeto usa **merge commit** (D-457/T459) — rebase/squash são proibidos por
  convenção, não por settings.

## Como re-verificar (read-only; sem alterar nada)

```bash
# Rulesets do repositório (lista)
gh api "repos/ENDARTStudios/MEDIA-Rate/rulesets" --jq '.[] | {id,name,target,enforcement}'

# Detalhe do protect-main (resumo seguro)
gh api "repos/ENDARTStudios/MEDIA-Rate/rulesets/20801818" \
  --jq '{name,enforcement,bypass:[.bypass_actors[]?|"\(.actor_type)/\(.bypass_mode)"],rules:[.rules[].type]}'

# Checks required
gh api "repos/ENDARTStudios/MEDIA-Rate/rulesets/20801818" \
  --jq '[.rules[]|select(.type=="required_status_checks")|.parameters.required_status_checks[].context]'
```

> Nota de shell: no Git Bash (MSYS), **não** use a barra inicial no endpoint
> (`/repos/...` vira `D:/Program Files/Git/repos/...`). Passe `repos/...` sem a barra.

## Como alterar (Operador — não é tarefa do agente)

GitHub → repo → **Settings → Rules → Rulesets → `protect-main`**. Alterações de governança
(ruleset, bypass, approvals) são **decisão e ação do Operador**; o agente apenas verifica e
documenta (read-only). Validar uma mudança sem afetar a `main`: criar ruleset temporário
mirando uma branch descartável e confirmar a rejeição (`GH013: Changes must be made through a
pull request`) — o mesmo método da validação empírica original (D-561).

## Histórico

- **2026-10-02 (T160.3 / D-561):** ruleset criado/ajustado — `pull_request` adicionado
  (0 approvals para não haver deadlock) e **bypass `always` do admin removido**
  (`bypass_actors` vazio). Validado empiricamente em sandbox descartável.
- **2026-10-05 (T161):** reconfirmado no Pacote de GO ([1] Gov-01 ✅).
- **2026-10-11 (T197):** **reverificação read-only** — `protect-main` id 20801818 `active`,
  `deletion` + `non_fast_forward` + `pull_request` + 6 checks required, `bypass_actors` vazio.
  Sem drift; nenhuma configuração alterada.

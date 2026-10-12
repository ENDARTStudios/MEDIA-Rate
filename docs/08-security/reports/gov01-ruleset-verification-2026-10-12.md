# Gov-01 — verificação read-only do ruleset da `main` (T197)

**Data:** 2026-10-11 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T197-gov01-ruleset-read-only-verification
**Classificação:** **`GOV01_COMPLETE`** (reconfirmado, sem drift) — **nenhuma configuração foi alterada**.

## 1. Sumário executivo

A `main` está protegida por **ruleset** (não pela branch protection clássica, que responde
`404`). O ruleset **`protect-main` (id 20801818, `target: branch`, `active`)** cobre
`~DEFAULT_BRANCH` + `refs/heads/main` com: **bloqueio de deleção**, **bloqueio de
force push/non-fast-forward**, **pull request obrigatório** e **6 checks required** — e com
**`bypass_actors` vazio** (nem admin escapa). Nenhum gap de Gov-01; nenhuma alteração feita.

## 2. Metodologia (read-only; metadados sanitizados)

Sync: `git fetch/status/rev-parse` → `origin/main = 09518f1c` (PR #538); `gh repo view`
(PUBLIC, default `main`); PRs de deps #515/#518/#522 inalteradas (OPEN); runs do `main`:
Health Check Monitor/Uptime/Alertas Métricos `success`; smoke passivo do site 6/6 → 200.

Coleta: `gh api` em `repos/ENDARTStudios/MEDIA-Rate` (settings), `.../branches/main/protection`
(clássica) e `.../rulesets` (+ `/rulesets/20801818`). Apenas campos booleanos, nomes de checks
e contagens — sem payloads extensos, sem tokens.

> Quirk de shell registrado: no Git Bash o endpoint **não pode** começar com `/`
> (`/repos/...` é reescrito para `D:/Program Files/Git/repos/...`).

## 3. Estado atual (evidência)

| Item | Observado |
|---|---|
| Branch protection clássica | **404 `Branch not protected`** (o repo usa **rulesets** — esperado) |
| Rulesets | **1**: `protect-main`, id **20801818**, target `branch`, enforcement **`active`** |
| `refs` do ruleset | inclui `~DEFAULT_BRANCH` e `refs/heads/main` (exclude vazio) |
| Regras ativas | `deletion`, `non_fast_forward`, `pull_request`, `required_status_checks` |
| `bypass_actors` | **`[]`** (vazio — sem bypass de admin/org/app) |
| `pull_request` | `required_approving_review_count: 0`; `dismiss_stale_reviews_on_push: false`; `require_code_owner_review: false`; `require_last_push_approval: false`; `required_review_thread_resolution: false`; `allowed_merge_methods: merge/squash/rebase` |
| `required_status_checks` | `strict: false`; `do_not_enforce_on_create: false`; checks: **Lint & Audit**, **Test & Coverage**, **Build**, **RLS Isolation (T290/T299/T301)**, **Docs Gate**, **Migration Safety (B1)** |
| Repo settings | `visibility: public`; `delete_branch_on_merge: false`; merge/squash/rebase permitidos; `allow_auto_merge: false` |

## 4. Gaps e observações

**Gaps de Gov-01: nenhum.** Observações que **não** são gaps desta frente:

- **0 aprovações exigidas** na regra `pull_request` — o gate de review é **processual**
  (protocolo Thinker/Doer, `REVIEW APPROVED` registrado no PR). Elevar para ≥1 é **Gov-02**
  (decisão separada; exige um segundo revisor humano ativo) — já registrado assim no item [18].
- `strict_required_status_checks_policy: false` — permite merge com base levemente desatualizada,
  mas os checks precisam passar no head; comportamento atual conhecido.
- `delete_branch_on_merge: false` — setting de repositório (higiene), não Gov-01; o fluxo do
  projeto deleta a branch no merge via `gh pr merge --delete-branch`.
- Merge/squash/rebase habilitados no GitHub: a proibição de rebase/squash é **de processo**
  (D-457/T459), não de settings.

## 5. Impacto para GO

Gov-01 continua **RESOLVIDO/reconfirmado** → não bloqueia GO por este item. Os bloqueios de GO
seguem sendo os demais: **#151** (triagem humana), incidente/purge, deps/Trivy,
B1/UG-01/backups e o monitor do flake da suíte API.

## 6. Passos do Operador (só se quiser endurecer — nada a fazer hoje)

1. **Gov-02 (opcional):** Settings → Rules → Rulesets → `protect-main` → *Require approvals* = 1
   (só faz sentido quando houver um segundo revisor humano ativo; hoje criaria deadlock).
2. Validar qualquer mudança em branch descartável antes de tocar a `main` (método D-561:
   ruleset temporário + push de teste rejeitado com `GH013`).
3. Nada a corrigir no estado atual.

Referência canônica: `docs/06-devops-deployment/GITHUB_BRANCH_PROTECTION.md`.

## 7. Confirmações

**Nenhuma configuração do GitHub foi alterada** (apenas GETs read-only; sem criar/editar/excluir
rulesets ou branch protection, sem interagir com PRs/alertas/environments). Nenhum segredo/token/
PII impresso (somente booleanos, nomes de checks e contagens). Diff restrito a docs
(`GITHUB_BRANCH_PROTECTION.md` novo + este relatório + PENDENCIAS + worklog). Contaminação
`123ce28e` ausente; PR docs-only com gates verdes e smoke passivo 7/7 (STATUS).

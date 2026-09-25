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

## Triagem de workflows crônicos (T046 — 2026-09-22)

Dois workflows falhavam em TODO merge/push na main sem impacto em produção.
Ambos NÃO-required: o ruleset protect-main exige apenas Lint & Audit,
Test & Coverage, Build, RLS Isolation (T290/T299/T301), Docs Gate e
Migration Safety (B1).

### create-pr-from-branch.yml (T353/D-321)
- Causa raiz: o `run: |` montava o corpo do PR com um heredoc cujo conteúdo
  ficava em COLUNA 0 (`Closes #...`), encerrando o block scalar do YAML — o
  arquivo era YAML INVÁLIDO. O GitHub registrava o workflow sem `name` (aparecia
  o caminho) e criava um run SEM JOBS que falhava em ~0s em todo push (inclusive
  main, chore/*, docs/*).
- Correção (T046/D-541): o corpo agora é montado com `printf` (tudo indentado
  dentro do block scalar) — YAML VÁLIDO.
- T047/D-541: o disparo ficou MANUAL (`workflow_dispatch`) por padrão. NÃO
  reativamos automação que estava inerte sem decisão do Operador (evita criar PRs
  automaticamente). Reconectar o push de `feature/**` = P016. Portanto o workflow
  não roda em main/chore/*/docs/* nem em feature/** até a decisão.

### release.yml
- Causa raiz: o passo `Build Packages` rodava `npm run build`, mas a RAIZ do
  monorepo não tem script `build` (só apps/web e apps/api) -> `npm error Missing
  script: "build"` em todo merge.
- Correção (D-541): disparo passou a MANUAL (`workflow_dispatch`) e o passo usa
  `npm run build --if-present`. Motivo: uma vez corrigido, o workflow passaria a
  PUBLICAR um Release + tag a cada merge — decisão que não é do CI. Fica
  disponível para quando o Operador quiser publicar. Reversível.- Evidência pós-merge (T047, 2026-09-22): merge 6264601 — NENHUM run de Release
  nem de Auto-create PR disparado no push para main; CI success (4m54s); Security
  success (3m11s); Deploy waiting (P012=A); smoke 7/7 = 200.

## Flake conhecido: build do Next.js e fontes Google (T054 — 2026-09-23)

O job `Build Web (Next.js)` do `ci.yml` usa `next/font/google` (Inter), que baixa a
fonte durante o build. Uma indisponibilidade momentânea do Google Fonts faz o build
falhar com `module-not-found` em `[next]/internal/font/google/inter_*.module.css`.
**Não é falha de código** — o mesmo commit pode passar no PR e falhar no push de
`main` (ou vice-versa). Ação: **re-run** do job (`gh run rerun <id> --failed`) e
confirmar verde. Observado no merge do #210 (run 35926347836: falha → re-run →
**success** 3m24s, Build 1m35s).

> **Smoke autenticado (T084/D-556):** o workflow **`smoke-auth.yml`** (não obrigatório,
> `permissions: contents: read`) sobe Postgres/Redis efêmeros, provisiona usuário local e
> valida **login 200 → `/auth/me` 200 → `/interacoes` 200** (envelope + allowlist), com **um único
> login** e saída sanitizada. Detalhes e comando: `docs/SMOKE_AUTH.md`.
> **Evidência pós-merge (T088, 2026-09-25):** `workflow_dispatch` do `smoke-auth.yml` na `main` (commit
> `c5ec1bf`) → run `36197739124` **success** (1m22s): `login=200`, `auth_me=200`, `interacoes=200`,
> `internas_ausentes=true`, `production_access=false`, `credential_leak_detected=false`; self-test 14/14;
> senha fixture **ausente** nos logs.
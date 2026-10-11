# Triagem das PRs de dependências abertas (T187)

**Data:** 2026-10-11 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T187-deps-prs-triage
**Classificação global:** `DEPS_PRS_TRIAGED_SEM_MERGE_RECOMENDADO`
**Nenhuma ação foi tomada nas PRs (somente leitura). Nenhum segredo/PII impresso.**

## 1. Sumário executivo

Existem **3 PRs abertas**, todas de automação e todas em `BLOCKED`:

| PR | Autor | Conteúdo | Classificação |
|---|---|---|---|
| **#515** | `app/github-actions` (dependency-update.yml) | SOMENTE `package-lock.json` (+7572/−7413) | **`STALE_CLOSE_OBSOLETE`** |
| **#518** | `app/dependabot` | `vitest` 4.1.10→4.1.11 (dev) + lockfile (+505/−302) | **`STILL_RELEVANT_BUT_REQUIRES_NEW_PR`** |
| **#522** | `app/dependabot` | 6 bumps (fastify, sharp, dompurify, ip-address, undici, postcss-selector-parser) + lockfile (+718/−874) | **`STILL_RELEVANT_BUT_REQUIRES_NEW_PR`** — **relevância de segurança** |

**#522 tem valor real:** o `audit` atual do `main` mantém `sharp` (fix = 0.35.5) e `undici`
(fix disponível) como HIGH **allowlistados como dev-only/build-CF** e os **7 GHSAs do lote
`fastify <= 5.12.4`** cujo fix declarado na própria allowlist é **`fastify 5.12.5+`** — exatamente
as versões que a PR propõe. **Nenhuma PR deve ser mergeada como está**; a recomendação é
**fechar a #515** e **criar uma nova PR limpa a partir do `main` atual** para os bumps do #518/#522.

## 2. Metodologia (read-only)

`git fetch`; `gh pr list/view` (metadata, arquivos, `statusCheckRollup`); `gh run list/view`
(metadados de jobs/steps, sem despejar logs); `git diff --stat` de `package.json` vs `origin/main`;
extração sanitizada de versões (`git show origin/main:<pkg>`); `npm audit --audit-level=high --json`
(resumo por severidade/pacote); leitura da allowlist governada do `audit:ci`
(`package.json → config.auditAllowlist` e `auditAllowlistPkg`); `curl -I` smoke.

Proibições respeitadas: sem aprovar workflows, sem comentar/fechar/atualizar/mergear PRs,
sem `npm install/update/audit fix/ci`, sem alterar lockfile/código/infra, sem tocar
incidente/secrets/code scanning/B1/UG-01/Gov-01/T176.

## 3. Tabela por PR (evidência sanitizada)

| Item | #515 | #518 | #522 |
|---|---|---|---|
| Título | chore(deps): update dependencies | chore(deps-dev): bump vitest 4.1.10→4.1.11 | chore(deps): bump group (6 updates) |
| `mergeable/state` | MERGEABLE/**BLOCKED** | MERGEABLE/**BLOCKED** | MERGEABLE/**BLOCKED** |
| Head / base | `a0d421f3` → main | `426f5d88` → main | `7a66da93` → main |
| Atualizada em | 2026-10-11T05:14Z | 2026-10-11T16:03Z | 2026-10-11T16:06Z |
| Arquivos | `package-lock.json` (+7572/−7413) | `apps/api/package.json` (1/1), `apps/web/package.json` (1/1), `package-lock.json` (+505/−302) | `apps/api/package.json` (3/3), `apps/web/package.json` (3/3), `package-lock.json` (+718/−874) |
| Checks | **Nenhum CI rodou** — todos `action_required` (aguardando aprovação de workflow); apenas Vercel (SUCCESS) | Misto: Lint & Audit/Docs Gate/scan/Semgrep/CodeQL = SUCCESS; **Test & Coverage (Web tests), Build (Build Web), Build OpenNext, RLS Isolation (A=B), Trivy Image = FAILURE** | Misto: Lint & Audit/Docs Gate/RLS/scan/CodeQL = SUCCESS; **Test & Coverage (API tests), Build (Build API), Build OpenNext = FAILURE** |

Notas de leitura: as falhas acima foram extraídas por **metadados de jobs/steps** (sem despejo de
log). Em PRs de automação/dependabot, parte dos jobs também sofre limitação de segredos/token
(vários “FAILURE” de build/vercel aparecem por ambiente reduzido) — o ponto objetivo para a
triagem é o mesmo: **as PRs estão BLOCKED e não passam required; não são mergeáveis como estão.**

## 4. Comparação com `origin/main` (57e79cd0)

- `apps/api/package.json`: `fastify ^5.10.0`, `sharp 0.35.4` (pin exato), `vitest ^4.1.10`.
- `apps/web/package.json`: `vitest ^4.1.10`.
- Diffs de `package.json` das PRs: #515 = nenhum; #518 = 2 linhas (1 por app, vitest); #522 = 6 linhas (3 por app).
- `main` avançou **depois** da abertura das PRs (merges T184/T185/T186 e #524); a #515 é de **05:14** — antes de todas as correções/merges do dia — e as dependabot de ~16:03/16:06.

## 5. Estado atual de higiene/segurança no `main`

- CI `38159135226` = **success** (inclui Test & Coverage, Build, RLS, E2E Full); Security `38159135317` = **success** (Gitleaks/scans verdes); Deploy `38159135211` = `waiting` (environment Production — **não aprovado manualmente**).
- `npm audit` (read-only, resumo): **1 low · 10 moderate · 17 high · 0 critical (28 total)**; os HIGH estão cobertos pela allowlist governada (`audit:ci` verde):
  - **`config.auditAllowlist` (8 GHSAs):** 1 × deepmerge-ts (P009/D-462, revisão 2026-12) + **7 × lote `fastify <= 5.12.4` (D-559b, revisão 2026-11)** — motivo declara que o fix exige **`fastify 5.12.5+`**, hoje bloqueado pelo pino de `@nestjs/platform-fastify`.
  - **`auditAllowlistPkg` (14 nomes, D-559c):** dev-only/build-CF (`@fastify/busboy`, `@next/eslint-plugin-next`, `@ts-morph/common`, `braces`, `chokidar`, `eslint-config-next`, `fast-glob`, `micromatch`, `shadcn`, `tailwindcss`, `ts-morph`, `miniflare`) + **`sharp`** (fix 0.35.5) e **`undici`** (fix disponível), ambos com revisão datada.

**Ligação direta com a #522:** os bumps propostos (`fastify 5.12.5`, `sharp 0.35.5`,
`undici 7.29.1`) são exatamente os fixes que a própria allowlist aponta — com uma ressalva a
verificar na nova PR: se `@nestjs/platform-fastify` ainda pina fastify abaixo de 5.12.5, o
lockfile pode manter a versão vulnerável aninhada e os 7 GHSAs continuariam allowlistados.

## 6. Classificação final e recomendação operacional

- **#515 → `STALE_CLOSE_OBSOLETE`.** Lockfile-only sobre base antiga (antes dos merges de hoje),
  nenhum CI aprovado/rodado (`action_required`), BLOCKED. Precedente P019 (#300, fechada como
  obsoleta). **Recomendação: fechar sem merge**; a automação `dependency-update.yml` regenera
  quando fizer sentido. **Não ressuscitar.**
- **#518 → `STILL_RELEVANT_BUT_REQUIRES_NEW_PR`.** Patch dev de `vitest` (bugfixes); a PR está
  BLOCKED com checks falhando e lockfile de base antiga. **Recomendação: nova PR limpa a partir
  do `main` atual** (pode ir no mesmo lote de deps). Baixa urgência isolada.
- **#522 → `STILL_RELEVANT_BUT_REQUIRES_NEW_PR` (prioridade de segurança).** Limpa
  potencialmente 7 GHSAs de fastify + `sharp`/`undici` HIGH; inclui ainda `dompurify 3.4.16`,
  `ip-address 10.7.3` e `postcss-selector-parser 7.1.6`. **Recomendação: nova PR limpa a partir
  do `main` atual**, com verificação de auditoria (`audit:ci`) e, se aplicável, remoção das
  entradas correspondentes da allowlist (com atualização das revisões datadas). **Não mergear a
  PR antiga.**

**Nenhuma PR de dependência deve ser mergeada agora.** Decisão de execução (fechar/regenerar/
substituir) é do Operador — as PRs permanecem **intocadas**.

## 7. Perguntas objetivas ao Operador

1. Autoriza **fechar a #515** como obsoleta (sem merge)?
2. Autoriza **uma nova PR limpa de dependências** a partir do `main` atual cobrindo os bumps do
   #522 (fastify/sharp/undici/dompurify/ip-address/postcss-selector-parser) + #518 (vitest)?
   (Ou prefere esperar a `dependency-update.yml`/dependabot regenerar sozinhas?)
3. Definir se a remoção das entradas allowlistadas (fastify/sharp/undici) entra **na mesma PR**
   de bumps ou em PR de follow-up com evidência de `audit:ci`.

## 8. Confirmações

- **Nenhuma interação** com as PRs além de leitura (sem aprovar workflows, comentar, fechar,
  atualizar branch, resolver conflito ou mergear).
- **Nenhuma dependência, lockfile, package.json, workflow, código, schema, segredo ou infra
  alterados** nesta tarefa.
- Diffs de lockfile **não** foram despejados (apenas nomes/contagens/versões resumidas);
  nenhum hash de integridade reproduzido; nenhum segredo/PII/URL com token impresso.
- Contaminação 123ce28e ausente; smoke passivo 7/7 → 200 (com `/catalog`) no ciclo.

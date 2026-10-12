# PR limpa de dependências (T209) — supersede #518/#522, fecha #515

**Data:** 2026-10-13 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T209 · **Base:** `d11b4e97` (`origin/main`)
**Escopo:** dependências + docs. **Nenhum** código de aplicação, schema, migration, workflow,
infra, segredo, produção, alerta, backup, purge ou GO foi alterado/declarado.
**PRs antigas:** #518/#522 **supersedidas**; #515 **fechada** (após o merge desta).

---

## 1. Sumário

Uma **PR limpa**, criada do `main` atual, aplica apenas os updates de dependência **seguros e
verificáveis** (patch/minor) que as PRs antigas pediam. Os **majors** que o agrupamento do
Dependabot misturou (`tailwindcss` 3→4 e `vitest` 4→5) foram **excluídos** por exigirem mudança de
código/config (regra dura do packet → tarefa própria, não esta). O update do `fastify` foi
**excluído após quebrar o typecheck** (instância duplicada). `npm audit` caiu de **28 → 21**.

## 2. Baseline (antes)

| Métrica | Valor |
|---|---|
| `npm audit` (total) | **28** — 0 crítico · **17 high** · 10 moderate · 1 low |
| `npm run audit:ci` | OK (high/crítico zerados fora da allowlist governada) |
| CodeQL open | **1** (`#151`, formalizado na T211) |
| Trivy open | **119** (estrutural por design — D-534) |
| Total open | **120** |

## 3. Updates aplicados (patch/minor, same-major)

| Pacote | Antes | Depois | Onde | Origem |
|---|---|---|---|---|
| `sharp` | `0.35.4` (pin exato) | **`0.35.5`** | `apps/api` | #522 |
| `vitest` | `^4.1.10` | **`^4.1.11`** | `apps/api` + `apps/web` | #518 |
| `wrangler` | `^4.132.0` | **`^4.149.0`** | `apps/web` | #522 |

Sem major, sem nova dependência direta, sem remoção de dependência direta, sem `audit fix --force`.
Manifests alterados: **`apps/api/package.json`** e **`apps/web/package.json`** (4 linhas no total)
+ **`package-lock.json`** (regenerado). Nada mais.

## 4. Updates EXCLUÍDOS (e por quê)

| Pacote | Pedido por | Motivo da exclusão |
|---|---|---|
| `fastify` `^5.10.0 → ^5.12.5` | #522 | **Revertido após falha real:** o bump criou **instância duplicada** (5.12.5 no topo vs 5.11.3 sob `@nestjs/platform-fastify`), quebrando a augmentação de tipos de `@fastify/cookie` → `setCookie`/`clearCookie`/`cookies` inexistentes (`tsc` API **exit 2**). Mesmo revertendo o manifest, o lock reteve 5.12.5 → exigiu reconstruir o lock a partir do `main`. Mantido em `^5.10.0` (resolve **5.11.3 dedupado**); `tsc` API volta a **0**. — *Nota: o #522 também pediria isso — logo o #522 não estava validado.* |
| `tailwindcss` `^3.4.17 → ^4.3.3` | #522 | **MAJOR 3→4** — exige migração de config/CSS (`@theme`, plugin PostCSS, utilities) = **mudança de código/config** → fora do escopo (regra dura). |
| `vitest` `^4.1.10 → ^5.0.3` | #522 | **MAJOR 4→5** — risco de breaking em config/API de teste = **mudança de código/config** → fora do escopo. Adotado o alvo do #518 (**4.1.11**), que já resolve o advisory. |

> Os majors ficam como **tarefa própria** (CODE_CHANGE_REQUIRED), com plano de migração — não
> silenciados. O `braces` (high, via `tailwindcss`) só fecha com o major do Tailwind ou com
> `overrides`; permanece **allowlistado** (governado) e sem urgência.

## 5. Depois

| Métrica | Antes | Depois |
|---|---|---|
| `npm audit` (total) | 28 | **21** (−7) |
| high | 17 | **14** (−3) |
| moderate | 10 | **6** (−4) |
| low | 1 | 1 |
| `npm run audit:ci` | OK | **OK** |
| CodeQL open | 1 | 1 (não tocado) |

`fastify` resolvido: **5.11.3 dedupado** (uma instância). `sharp@0.35.5`, `vitest@4.1.11`
(+ `@vitest/coverage-v8@4.1.11`), `wrangler@4.149.0`.

## 6. Validações

| Gate | Resultado |
|---|---|
| `npm install` | exit 0 |
| `npx tsc --noEmit` **API** | **0** |
| `npx tsc --noEmit` **web** | **0** |
| Suíte **API** (`vitest run`) | **168/168 arquivos · 1422/1422 testes** |
| Suíte **web** (`vitest run`) | **89/89 arquivos · 613/613 testes** |
| `next build` (web) | **não viável localmente** — ver §7 (árvore em edição do Operador); **CI é a autoridade** |
| `npm audit` / `audit:ci` | 21 / **OK** |
| Prettier (manifests) | limpo |
| Diff | apenas `apps/api/package.json`, `apps/web/package.json`, `package-lock.json` |

Sem alteração de código → nenhum teste de produto foi enfraquecido, skipped ou removido.

## 7. Notas de execução (transparência)

- **Base:** `origin/main` havia avançado para `d11b4e97` (merge do #551 do Operador). O working
  tree é **compartilhado** e o `git checkout` foi **recusado** por causa das edições locais do
  Operador (`.env.example`, `worklog.md`, `apps/api/worklog.md`). O reposicionamento para a base
  correta foi feito por **plumbing** (`git branch` + `symbolic-ref` + `read-tree --reset`), que
  **não toca no working tree** — o trabalho do Operador permaneceu **intacto** (verificado: só os
  3 arquivos dele aparecem como locais).
- O `package-lock.json` foi reconstruído a partir do blob do `HEAD` (write do arquivo) **apenas**
  para descartar o churn provisório do `fastify` — sem `git checkout --`, `reset --hard`,
  `clean`, `stash`, `rebase` ou `force push`.
- **Nenhum alerta** foi interagido; contagem CodeQL/Trivy lida **apenas por GET** sanitizado.
- **`next build` local não é gate válido nesta rodada:** durante a execução, o Operador passou a
  editar a árvore (novo lote de arquivos locais — `privacy/page.tsx`, `sources.ts`, `sitemap.ts`,
  `messages/*.json`, specs etc.), e o build local falhou por **erro de sintaxe JSX em
  `privacy/page.tsx` (arquivo do Operador, em edição — fora do meu diff)**. Como o build local lê
  o **working tree** (que contém edições alheias em andamento), ele **não** mede esta PR. A
  autoridade é o **CI**, que builda a **árvore commitada** (main + estas 4 versões) — o job
  `Build` do PR. Meu `git diff` contém **apenas** `apps/api/package.json`,
  `apps/web/package.json` e `package-lock.json`.

## 8. Limitações

- **`tailwindcss` 4 e `vitest` 5 não foram adotados** (majors → exigem código/config).
- Advisory do `braces`/`chokidar` (high, via `tailwindcss`) permanece **allowlistado** (governado).
- Os 14 high restantes são de **dev/transitivos allowlistados** (`audit:ci` verde) — ecoam a
  decisão de deps/imagem base.

## 9. PRs antigas

- **#518 / #522** — supersedidas por esta PR (fechadas **após** o merge, com comentário sanitizado).
- **#515** — `chore(deps): update dependencies` (churn de lockfile ~7,5k linhas, sem alvo
  verificável; classificada STALE em T187) → **fechada** como obsoleta (o conjunto útil foi
  incorporado aqui).
- Branches antigas **não** são resolvidas nem atualizadas; nenhuma interação com settings do
  Dependabot, alerts, secrets ou environments.

## 10. Confirmações

- **Nenhum** código de aplicação alterado (`src/`, `test/` de produto, schema, migration, workflow,
  infra, auth, admin, LGPD, `http.utils`, `url-guard`, `ip-guard`).
- **Nenhum** alerta interagido (CodeQL/Trivy/secret scanning).
- **GO para convites: SUSPENSO** — esta tarefa não declara GO nem aprova Production.

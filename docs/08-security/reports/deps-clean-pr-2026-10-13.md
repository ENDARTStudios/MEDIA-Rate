# PR limpa de dependências (T209) — supersede #518/#522, fecha #515

**Data:** 2026-10-13 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T209 · **Base:** `d11b4e97` (`origin/main`)
**Escopo:** dependências + docs. **Nenhum** código de aplicação, schema, migration, workflow,
infra, segredo, produção, alerta, backup, purge ou GO foi alterado/declarado.
**PRs antigas:** #518/#522 **supersedidas**; #515 **fechada** (após o merge).

---

## 1. Sumário

Uma **PR limpa**, criada do `main` atual, aplica apenas updates de dependência **seguros e
verificáveis** (patch/minor, same-major). Três candidatos foram **excluídos com motivo objetivo**
— e cada exclusão foi descoberta por **falha real medida**, não por precaução genérica:

| Candidato | Origem | Resultado | Motivo |
|---|---|---|---|
| `sharp 0.35.4 → 0.35.5` | #522 | ✅ **aplicado** | patch, sem efeitos |
| `wrangler ^4.132.0 → ^4.149.0` | #522 | ✅ **aplicado** | minor, sem efeitos |
| `vitest ^4.1.10 → ^4.1.11` | #518 | ❌ **excluído** | **quebrou o `--coverage` no CI** (des-hoisting do provider) |
| `fastify ^5.10.0 → ^5.12.5` | #522 | ❌ **excluído** | **quebrou o `tsc` da API** (instância duplicada) |
| `tailwindcss 3 → 4` · `vitest 4 → 5` | #522 | ❌ **excluídos** | **MAJOR** — exigem mudança de código/config |

`npm audit` caiu de **28 → 24** (−3 high, −1 moderate); `audit:ci` **OK**.

## 2. Baseline (antes)

| Métrica | Valor |
|---|---|
| `npm audit` (total) | **28** — 0 crítico · **17 high** · 10 moderate · 1 low |
| `npm run audit:ci` | OK (high/crítico zerados fora da allowlist governada) |
| CodeQL open | **1** (`#151`, formalizado na T211) |
| Trivy open | **119** (estrutural por design — D-534) |
| Total open | **120** |

## 3. Updates aplicados

| Pacote | Antes | Depois | Onde | Origem |
|---|---|---|---|---|
| `sharp` | `0.35.4` (pin exato) | **`0.35.5`** | `apps/api` | #522 |
| `wrangler` | `^4.132.0` | **`^4.149.0`** | `apps/web` | #522 |

Manifests alterados: **`apps/api/package.json`** e **`apps/web/package.json`** (2 linhas no total)
+ **`package-lock.json`** (churn pequeno e auditável — `added 2 / removed 2 / changed 9`).
Sem major, sem nova dependência direta, sem remoção de dependência direta, sem `audit fix --force`.

## 4. Updates EXCLUÍDOS (com a falha real que os desqualificou)

### 4.1 `vitest ^4.1.11` (#518) — quebra o modo `--coverage` no CI

- O job required **`Test & Coverage`** falhou em 59 s com
  `Cannot find package '@vitest/coverage-v8' imported from …/node_modules/vitest/dist/chunks/coverage.*.js`
  — **falha de bootstrap do provider** (0 teste coletado), não falha de teste.
- **Causa:** o `vitest **4.1.11**` des-hoisteou o `@vitest/coverage-v8` de `node_modules/` (raiz)
  para `apps/api/node_modules/`, enquanto o `vitest` continuou hoisted na raiz — o provider deixa de
  ser resolvível de onde o `vitest` o importa. (Alinhar o `@vitest/coverage-v8` a `^4.1.11` **não**
  re-hoisteou; `npm dedupe` causou churn anormal (`added 7 / removed 16 / changed 58`) **sem**
  corrigir.) Por isso **revertido**: `vitest` permanece `^4.1.10` (deduped) e o
  `@vitest/coverage-v8` volta a ficar hoisted na raiz — `import('@vitest/coverage-v8')` da raiz =
  **OK** e `npx vitest run --coverage` = **verde** (provado local).
- **É workaround de infra, não código.** O caminho correto (declarar o provider na raiz para
  garantir o hoisting) fica como **seguimento** — não é update de dependência e mexeria no
  `package.json` da raiz.

### 4.2 `fastify ^5.12.5` (#522) — quebra o `tsc` da API

- O bump gerou **instância duplicada** (`fastify@5.12.5` no topo vs `5.11.3` sob
  `@nestjs/platform-fastify`), quebrando a **augmentação de tipos** de `@fastify/cookie`:
  `setCookie`/`clearCookie`/`cookies` inexistentes → `tsc` API **exit 2**. **Revertido** → mantido
  `^5.10.0` (resolve 5.11.3 **dedupado**) e o `tsc` volta a **0**.
- *Nota: o #522 também pedia esse bump — logo o #522 **não estava validado**.*

### 4.3 MAJORS — `tailwindcss` 3→4 e `vitest` 4→5

- **Exigem mudança de código/config** (migração do Tailwind 4; breaking do Vitest 5) → **fora do
  escopo** deps-only (regra dura). Viram **tarefa própria** (CODE_CHANGE_REQUIRED), com plano de
  migração. O advisory do `braces` (high, via `tailwindcss`) segue **allowlistado** (governado) e
  sem urgência; fecha com o major do Tailwind ou com `overrides` (config → também fora do escopo).

## 5. Depois

| Métrica | Antes | Depois |
|---|---|---|
| `npm audit` (total) | 28 | **24** (−4) |
| high | 17 | **14** (−3) |
| moderate | 10 | 9 (−1) |
| low | 1 | 1 |
| `npm run audit:ci` | OK | **OK** |
| CodeQL / Trivy open | 1 / 119 | 1 / 119 (não tocados) |

Resolvido: `sharp@0.35.5`, `wrangler@4.149.0`, `vitest@4.1.10` (inalterado), `fastify@5.11.3`
(dedupado), `@vitest/coverage-v8` **hoisted na raiz**.

## 6. Validações

| Gate | Resultado |
|---|---|
| `npm install` | exit 0 (churn pequeno: +2/−2/changed 9) |
| `npx tsc --noEmit` **API** | **0** |
| `npx tsc --noEmit` **web** | **0** |
| Suíte **API** (`vitest run`) | **168/168 arquivos · 1422/1422 testes** |
| Suíte **web** (`vitest run`) | **89/89 arquivos · 615/615 testes** |
| `npx vitest run --coverage` (modo do CI) | **verde** (provider v8 rescindido da raiz) |
| `npm audit` / `audit:ci` | **24** / **OK** |
| Prettier (manifests) | limpo |
| Diff | apenas `apps/api/package.json`, `apps/web/package.json`, `package-lock.json` |

Sem alteração de código → nenhum teste foi enfraquecido, skipped ou removido.

## 7. Notas de execução (transparência)

- **Base:** `origin/main` avançou para `d11b4e97` (merge do #551 do Operador). O working tree é
  **compartilhado** e o `git checkout` foi **recusado** pelas edições locais do Operador. O
  reposicionamento para a base correta foi feito por **plumbing** (`git branch` + `symbolic-ref` +
  `read-tree --reset`), que **não toca no working tree** — o trabalho do Operador permaneceu
  **intacto**.
- `package-lock.json` e os manifests foram **reconstruídos do blob commitado da base** (write de
  arquivo) para descartar o churn provisório dos candidatos revertidos — **sem** `git checkout --`,
  `reset --hard`, `clean`, `stash`, `rebase` ou `force push`.
- `apps/web/next-env.d.ts` (gerado pelo `next build` local) foi **restaurado** ao conteúdo da base.
- **Nenhum alerta** foi interagido; contagem CodeQL/Trivy lida **apenas por GET** sanitizado.
- **`next build` local não é gate válido nesta rodada:** o Operador edita a árvore em tempo real (o
  build local falhou por erro de sintaxe JSX em arquivo **alheio**, fora do meu diff). Autoridade =
  o job **`Build`** do CI sobre a **árvore commitada** — que **passou**.

## 8. Limitações

- **`vitest` 4.1.11 não adotado** (regressão de hoisting do provider de coverage) — seguimento com
  fix de hoisting na raiz.
- **`tailwindcss` 4 e `vitest` 5 não adotados** (majors → código/config).
- Advisory do `braces`/`chokidar` (high, via `tailwindcss`) segue **allowlistado** (governado).
- Os 14 high restantes são de **dev/transitivos allowlistados** (`audit:ci` verde).

## 9. PRs antigas

- **#518 / #522** — supersedidas por esta PR (fechadas **após** o merge, com comentário sanitizado).
- **#515** — `chore(deps): update dependencies` (churn de lockfile ~7,5k linhas, sem alvo
  verificável; STALE na T187) → **fechada** como obsoleta (o conjunto útil foi incorporado aqui).
- Branches antigas **não** são resolvidas/atualizadas; nenhuma interação com settings do
  Dependabot, alerts, secrets ou environments.

## 10. Confirmações

- **Nenhum** código de aplicação alterado (`src/`, `test/` de produto, schema, migration, workflow,
  infra, auth, admin, LGPD, `http.utils`, `url-guard`, `ip-guard`).
- **Nenhum** alerta interagido (CodeQL/Trivy/secret scanning).
- **GO para convites: SUSPENSO** — esta tarefa não declara GO nem aprova Production.

# T124 — Diagnóstico: bloqueio de deploy Vercel / hosting web

**Data:** 2026-09-28 · **Branch:** `feat/t124-web-hosting-deploy` (de `origin/main` `6bc65aa5`)
**Regra:** diagnóstico com evidência; sem expor segredo; sem deploy manual destrutivo.

## 1. Evidência coletada (CLI-first, sem segredos)

| Comando | Resultado |
|---|---|
| `vercel whoami` | `endartstudios` (time `end-art-studios` — END ART Studios) |
| `gh pr checks` (#334) | check **Vercel** = `fail`: `Deployment rate limited — retry in 24 hours` (`…?upgradeToPro=build-rate-limit`), **não-required** |
| `gh pr checks` (#336/#337) | check **Vercel** = `pass` (`Deployment has completed`) |
| `gh run list --workflow=deploy.yml` | runs `Deploy` em `main`: `waiting` (#337) e `cancelled` (#332-#336) |
| `apps/web/vercel.json` | `{ "framework": "nextjs" }` (sem `git.deploymentEnabled`) |
| `.github/workflows/deploy.yml:35-40,90` | `environment: Production` (P012) — gate **do workflow**, não do deploy nativo Vercel/Railway |
| Produção `/pt-BR` (live) | `200`; fix do T121 presente (`demais mídias`), claim antiga ausente |
| Smoke 7/7 | `/health`, `/pt-BR`, `/en-US`, `/es-ES`, `/pt-BR/catalog`, `/pt-BR/pricing`, `/pt-BR/login` → **200** |

## 2. Causa exata das falhas observadas

1. **Vercel vermelho**: **build/deployment rate limit** do plano **Hobby**
   (quota diária) — transiente ("retry in 24 hours"), check **não-required**;
   deploys voltam a passar quando a janela libera (#336/#337).
2. **`Deploy` (GitHub) `waiting`/`cancelled`**: gate humano do `environment:
   Production` (P012). O `deploy.yml` **não** bloqueia Vercel/Railway (comentário
   explícito). Não aprovar manualmente.
3. **Suspeita de bloqueio por uso comercial (Hobby)**: **não confirmada**. Não há
   evidência de `commercial use`, `deployment blocked` por política, quota de
   banda, function timeout ou DNS. A produção web serve o `main` atual.

## 3. Conclusão

**Não há bloqueio ativo de hosting.** O observável é rate limit de build (Hobby,
transiente) + o gate P012 do GitHub. **Produção web saudável** (serve o `main`;
smoke 7/7). Portanto: **release web NÃO congelado**.

**Risco não-materializado:** uso comercial em plano Hobby é **risco de política**
(decisão de **Operador**), não a causa das falhas desta rodada.

## 4. Opções e recomendação

- **A. Vercel Pro** — menor atrito; resolve rate limit + risco de uso comercial.
  **Requer decisão/billing do Operador** (hard stop: agente não altera billing).
- **B. Migrar web** (Cloudflare/Netlify/Railway/Render/Fly/VPS) — preparo
  documentado em `docs/06-devops-deployment/WEB_HOSTING.md` §6 (standalone/Docker/
  env/health/rollback). Só executar em tarefa própria com gate de migração.
- **C. Congelar release web** — **não aplicável agora** (produção saudável).

**Recomendação:** manter entrega e, como medida de robustez, **reduzir deploys
redundantes** (§5 do doc) e levar ao Operador a decisão **A vs B** com antecedência
— antes do GO para convites. O check Vercel já é **não-required**; não é gate de merge.

## 5. Reclassificação de gaps (respondendo ao packet)

O packet sugere rebaixar gaps web-dependentes a `DONE_CODE_READY` **se** houver
bloqueio de produção web. **Não há** bloqueio ativo: a produção serve o `main`
(verificado ao vivo). Logo os gaps DONE com smoke de produção (ex.: BETA-GAP-05,
cuja correção foi confirmada em `mediarate.app/pt-BR`) **permanecem DONE**. Se
surgir bloqueio real, aplicar a regra do doc (`DONE_CODE_READY` no máximo).

## 6. Status T124

**Status: `DONE`** (tarefa de infraestrutura, docs-only). **Evidência:** `HOSTING_DIAGNOSED_OK`
— causa exata documentada (rate limit de build do Hobby + gate P012), plano de
ação registrado (A/B/C), produção web saudável. Decisão **A vs B vs C** é
**pendência do Operador** (não é bloqueio da T124). Doc canônico:
`docs/06-devops-deployment/WEB_HOSTING.md`. **Não** é um BETA-GAP de produto — não
infla o registry.

## 7. PR / merge

- Commit: doc em `docs/06-devops-deployment/WEB_HOSTING.md` + este relatório · branch `feat/t124-web-hosting-deploy` (base `6bc65aa5`).
- PR: **#338** `OPEN → MERGED`; merge commit **`162d6b51`**.
- Required (docs-only): Docs Gate + Migration Safety — verdes; `Vercel` = **pass**. `123ce28e`: exit **1** (ausente). Smoke 7/7 → **200**.
- Zero alteração de código/billing/segredo/infra (docs-only).

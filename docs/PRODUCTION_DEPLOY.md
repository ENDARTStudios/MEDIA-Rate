# PRODUCTION_DEPLOY — Deploy de produção e rollback

Verdade operacional: **D-527** (resumo em [ARCHITECTURE](ARCHITECTURE.md)).
Runbooks completos: `docs/BOAS_PRATICAS_DEPLOY.md` · `docs/RUNBOOK_PRODUCAO.md`.

## O que dispara produção

Apenas **merge em `main`** (merge commit — nunca squash: o revert cirúrgico depende
da forma do merge). Duas pontas INDEPENDENTES disparam juntas:

1. **Railway (API)**: build+deploy nativo; o **entrypoint aplica `prisma migrate
   deploy` no boot** — migrations vão junto com o código, SEM estágio prévio.
2. **Vercel (web)**: deploy de produção pela integração Git.

O workflow `deploy.yml` do GitHub é **validação + health check pós-promoção**
(com retries) — não é gate pré-deploy (staging = P012, pendência do Operador).

## Passo a passo (merge condicional autorizado)

1. **Pré**: CI verde no head final; auditoria de diff; scan de segredos; PRs abertas
   checadas para novos required checks (lição P011/D-533).
2. `gh pr merge N --merge --subject "Merge pull request #N from …"`.
3. **Monitorar** (os três sinais):
   ```bash
   gh run list --workflow=deploy.yml --branch=main --limit 1   # deploy.yml
   railway deployment list --service "MEDIA Rate" --environment production
   vercel ls                                                   # web Ready
   ```
4. **Smoke obrigatório** ([QA_TESTING](QA_TESTING.md)) — mínimo + específico da mudança.
5. **Evidência**: comentário no PR + worklog (+ DECISOES se mudou regra).
6. Branch deletada **só depois do smoke verde**.

## Rollback

- **Deploy ruim**: `git revert -m 1 <merge-commit>` → PR do revert → merge → as duas
  pontas reimplantam o estado anterior. Fora incidente registrado, nada de force
  push/reset em `main` (D-457).
- **Migration ruim**: revert do merge + `prisma migrate resolve --rolled-back <nome>`
   no caminho manual decidido (P013) — o plano específico DEVE estar na seção
   `## Rollback` do PR (contrato B1) e o backup diário existe (9.7).

## Proibições (regra dura)

- `migrate-production.yml` NÃO executar (workflow manual existe, mas o caminho de
  rede ao banco é decisão pendente do Operador — P013/`docs/b1-prod-guards.md` §3).
- `--prod` flags, force push, reset em `main`, deploy direto por CLI fora de incidente.
- Merge de PR com check vermelho ou "Expected" pendente.

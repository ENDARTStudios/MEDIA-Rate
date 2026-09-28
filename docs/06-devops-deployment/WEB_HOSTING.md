# Web Hosting & Deploy — diagnóstico e estratégia

> T124 (2026-09-28) · diagnóstico com evidência, sem segredos.
> Relacionado: [PRODUCTION_DEPLOY](PRODUCTION_DEPLOY.md) · [CI](CI.md) · [b1-prod-guards](b1-prod-guards.md).

## 1. Como o web vai a produção HOJE

- **Vercel (integração Git nativa)**: push em `main` → deploy atômico de produção
  (`apps/web/vercel.json` = `{ "framework": "nextjs" }`). **Não** depende do
  workflow `deploy.yml`.
- **`deploy.yml` (GitHub)**: apenas *gate de validação da `main`* + *health check
  pós-promoção*. Tem `environment: Production` (P012) — esse gate **não** bloqueia
  o deploy nativo Vercel/Railway (comentário explícito no próprio workflow,
  `deploy.yml:35-40,90`). Não aprovar manualmente.
- **Railway (API)**: integração Git nativa; entrypoint roda migrations no boot.

## 2. Falhas observadas e classificação (evidência)

| Sintoma | Causa real | Evidência | Gravidade |
|---|---|---|---|
| Check **Vercel** vermelho em PRs | **Build/deployment rate limit** (quota Hobby) | mensagem `Deployment rate limited — retry in 24 hours` + URL `…?upgradeToPro=build-rate-limit`; checks verdes quando a janela libera (PRs #336/#337 = Vercel **pass**) | Transiente, **não-required** |
| Runs **Deploy** (`deploy.yml`) `waiting`/`cancelled` | Gate humano do `environment: Production` (P012); o run mais novo cancela o anterior em espera | `gh run list --workflow=deploy.yml` → `waiting` (#337) / `cancelled` (#332-#336) | **Por design** (não é bloqueio de hosting) |
| Suspeita de **bloqueio por uso comercial (Hobby)** | **Não confirmada** por evidência | produção serve o `main` atual (fix do T121 presente em `mediarate.app/pt-BR`: `demais mídias` presente, claim antiga ausente); smoke 7/7 = 200 | Risco de política de plano, não bloqueio ativo |

**Conclusão:** **não há bloqueio ativo de hosting** no momento do diagnóstico. O que
existe é (a) **rate limit de build** do plano Hobby, transiente, e (b) o **gate
P012** do GitHub. A produção web está saudável e servindo o `main`.

## 3. Risco de plano (decisão do Operador)

O plano **Hobby** é destinado a uso pessoal/não comercial. O MEDIA Rate tem login,
watchlist, assinatura (Free/Plus/Premium), Stripe/checkout e Beta com monetização
futura — isso pode ser interpretado como **uso comercial**. Isso é **risco
estratégico**, não a causa das falhas observadas nesta rodada.

**Ação:** decisão de **Operador** (billing). Não alterar plano/segredo pelo agente.

## 4. Opções (matriz)

| Opção | Prós | Contras | Quando escolher |
|---|---|---|---|
| **A. Vercel Pro** | menor atrito; mantém domínio/preview; resolve rate limit e uso comercial | custo (Operador) | manter velocidade e custo aceitável |
| **B. Migrar web** (Cloudflare Pages/Workers, Netlify, Railway web, Render, Fly.io, VPS+Docker) | soberania; pode unificar com Railway | infra/domínio/SSL/env/ISR; risco de quebra | não pagar Vercel Pro |
| **C. Congelar release web** | mantém segurança/evidência | Beta web travada; acúmulo de drift | tático enquanto decide A/B |

## 5. Mitigação de rate limit (sem Pro)

- **Reduzir deploys redundantes**: agrupar merges; evitar PRs triviais que disparam
  build. (Hoje cada merge em `main` gera deploy Vercel.)
- **Desativar Previews não usados** (Vercel → Git → *Ignored Build Step*/preview
  off) OU usar `vercel.json` `git.deploymentEnabled` — decisão de Operador.
- **Tratar o check Vercel como não-bloqueante** (já é; o ruleset `protect-main`
  exige apenas: Lint & Audit, Test & Coverage, Build, RLS Isolation, Docs Gate,
  Migration Safety).

## 6. Preparação de migração (quando/se Opção B)

Passos executáveis (documentados, não aplicados nesta tarefa):

1. Build standalone: `output: "standalone"` em `next.config.ts` (mudança de build —
   exige PR próprio com CI verde).
2. `Dockerfile` do web (`node:22-alpine`): `npm ci` → `next build` → copiar
   `.next/standalone` + `.next/static` + `public`; `CMD ["node","server.js"]`.
3. Variáveis (nomes apenas, sem valores): as `NEXT_PUBLIC_*` + `API_PROXY_TARGET`
   (ver `docs/04-api-integrations/INTEGRATIONS.md` e `docs/06-devops-deployment/BOAS_PRATICAS_SECRETS.md`).
4. Health check do web (`/pt-BR` 200) + smoke 7/7; domínio/SSL no novo host antes
   de trocar DNS (janela de rollback).
5. Reverter rápido: manter Vercel ativo até o novo host passar smoke.

## 7. Regra de evidência

Nenhum gap que dependa de **mudança visível em produção web** pode ser `DONE`
apenas por estar no `main`. Status máximo sem produção saudável:
`DONE_CODE_READY`. Hoje a produção web **está** saudável e servindo o `main`
(§2), então os gaps já fechados com smoke de produção seguem válidos; essa regra
vale se/quando surgir bloqueio real.

## 8. Diagnóstico (comandos, sem vazar segredo)

```bash
vercel whoami            # endartstudios
gh run list --workflow=deploy.yml --limit 10
gh pr checks <pr>
curl -I https://mediarate.app/pt-BR
curl -I https://media-rate-production.up.railway.app/health
```

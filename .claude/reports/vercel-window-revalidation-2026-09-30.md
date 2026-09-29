# T136 — Revalidação da janela de build da Vercel (Hobby)

- **Data/hora UTC:** 2026-09-29T18:07Z
- **Fase:** F09-ci-cd-deploy
- **Tarefa:** T136-vercel-window-revalidation
- **Tipo:** operacional / docs-only (nenhum código, schema, auth, billing, segredo, infra ou environment alterado)
- **Base:** `origin/main` = `bed93fb5` (após PR #356)
- **Entrada do Operador:** "Continuar projeto. Janela da Vercel hobby liberada." (interpretada como autorização para **revalidar** hosting, **não** como decisão formal A/B/C de hosting)

## 1. Comandos executados (sanitizados)

```text
git fetch origin; git status --short; git rev-parse HEAD            -> main=bed93fb5; working tree limpo
gh pr view 356 --json statusCheckRollup
gh run list --branch=main --limit 10 --json ...                     -> Deploy Reconciler / Health Check / Alertas / Uptime = success
git show bed93fb5 -> commit status: Vercel=failure ("rate limited")
vercel whoami                                                       -> endartstudios
vercel ls / vercel ls --environment=production                      -> últimos deploys = ● Ready
curl (smoke 7 endpoints)                                            -> 7/7 = 200
```

## 2. Evidência coletada

| Fonte | Resultado | Leitura |
|---|---|---|
| Commit status `bed93fb5` (merge do T135) | `Vercel = failure` — "Deployment rate limited — retry in 24 hours" | **Status remanescente da janela de rate limit** (anterior) |
| PR #356 (head `74b8267e`) | check **Vercel = pass** ("Deployment has completed") | Build da janela já havia funcionado no preview do T135 |
| `vercel ls --environment=production` | últimos deploys de **Production** = **● Ready** | Deploys recentes concluem (sem rate limit ativo) |
| `vercel ls` | último **Preview** = **● Ready** (≈20h) | Builds recentes concluem |
| Railway `MEDIA Rate / production` (GH deployments, ref `bed93fb5`) | `success` | API de produção saudável |
| Runs `main` (últimos 10) | Deploy Reconciler / Health Check Monitor / Alertas Métricos / Uptime Check = `success` | Operação e monitoramento ativos |
| Smoke 7 endpoints | `/health`, `/pt-BR`, `/en-US`, `/es-ES`, `/pt-BR/catalog`, `/pt-BR/pricing`, `/pt-BR/login` = **200** | Produção web saudável (zero 5xx; sem chave i18n crua observada) |

## 3. Interpretação

- O check **`failure` do `bed93fb5` é residual**: foi gravado quando a janela de rate limit estava fechada e **não é reescrito** em commits seguintes.
- As evidências **posteriores** (PR #356 Vercel **pass**, `vercel ls` com Production/Preview **● Ready**, smoke 7/7 e Railway success) indicam que **a janela foi liberada**.
- Confirmação adicional: o próprio **build do PR desta tarefa (T136)** — se o check **Vercel** do PR head ficar **pass**, a janela está liberada de fato; se aparecer "rate limited", a janela **não** está plenamente liberada.

## 4. Classificação

**`VERCEL_WINDOW_RELEASED_OK`**

- Janela de rate limit Hobby: **liberada** (evidência posterior ao status residual).
- Produção web (Vercel) + API (Railway): **saudáveis**; smoke 7/7 = 200.
- **Não** houve upgrade de plano, migração, mudança de segredo/infra/environment; **não** houve aprovação manual do environment `Production`.

## 5. O que NÃO foi resolvido (permanece com o Operador)

- **Decisão estratégica de hosting A/B/C continua pendente**: A) upgrade Vercel Pro; B) migrar web; C) aceitar Hobby temporariamente com prazo e risco formalmente aceito. A liberação da janela **resolve o rate limit transiente**, **não** o **risco de uso comercial/política** no plano Hobby.
- Nenhum BETA-GAP foi alterado; GO para convites permanece **SUSPENSO**.

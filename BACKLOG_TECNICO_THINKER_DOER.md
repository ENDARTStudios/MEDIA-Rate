# BACKLOG_TECNICO_THINKER_DOER

**Origem:** REPLAN do Operador (2026-09-26) — P010/P012-P017 e higiene de PRs legadas são
**decisões técnicas** do par Thinker/Doer, não pendências humanas. Fonte: `PENDENCIAS_OPERADOR.md`
(histórico preservado lá; itens marcados com a conversão).

## Fila priorizada (ordem de execução)

| Task | Origem | Objetivo técnico | Risco | Status |
|---|---|---|---:|---|
| **T092-deploy-auto-promotion-guard** | P012 | Eliminar fila `waiting` com reconciliador: aprovação condicionada (head==main + CI/Security + smoke 4/4) e cancelamento de superseded | médio | **EXECUTADA** — D-554; script + workflow; ao vivo: 1 aprovação + 3 cancelamentos |
| **T093-migration-drift-autopilot** | P013 | Drift neutralizado (RLS job required aplica migrations em DB virgem) + guarda expand/contract para SQL destrutivo | alto | **EXECUTADA** — D-555; self-test 6/6; integrada ao job Migration Safety |
| **T094-metrics-alert-live** | P014 | PARCIAL (D-556): live exige credencial read-only (hard-stop de segredos); fallback Sentry+uptime cobre sinais críticos | médio | **PARCIAL — fallback ativo** |
| **T095-uptime-independent-monitoring** | P015 | Monitor sintético ATIVO (cron 10min live, retry+dedup); residual aceito (D-556) | médio | **EXECUTADA — ativo** |
| **T096-automation-safety-policy** | P016 | Default seguro verificado + guarda anti-regressão no docs-gate | baixo | **EXECUTADA** |
| **T097-lgpd-encryption-adr-guard** | P017 | ADR (cifragem adiada pós-Beta com compensações) + guarda anti-regressão + plano blind index | médio | EM ANDAMENTO |
| **T098-access-evidence-automation** | P010 | Prova read-only de acesso (gh/vercel/railway/DNS) + fallbacks | baixo | EM ANDAMENTO |
| **T099-legacy-pr-hygiene** | Legadas | Fechar PRs claramente obsoletas com evidência; conservador | baixo | EM ANDAMENTO |

## Regra do backlog

Nenhum item volta a ser "pendência do Operador" sem ser genuinamente de negócio/custo/legal/credencial
externa indisponível — e mesmo assim, o Doer primeiro esgota caminhos técnicos seguros (fallback
+ risco técnico aceito documentado em DECISOES).

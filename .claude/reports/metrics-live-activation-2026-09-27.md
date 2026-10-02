# T100 — Ativação dos alertas métricos LIVE (2026-09-27)

## Achado decisivo
`/metrics` **existe** em produção (`apps/api/src/modules/metrics/metrics.controller.ts`, Prometheus via `prom-client`,
protegido por `X-Admin-Token`/sessão ADMIN). Sem token → **403**; com o `ADMIN_TOKEN` do `.env` → **200**.

## Configuração aplicada (GitHub)
| Item | Valor | Timestamp |
|---|---|---|
| `secrets.ADMIN_TOKEN` | criado (valor via **stdin**, nunca ecoado) | 2026-09-27T02:17:23Z |
| `vars.METRICS_URL` | `https://media-rate-production.up.railway.app/metrics` | 2026-09-27T02:17:24Z |

## Evidência de execução
- Self-test `metric-alerts.self-test.mjs`: **18 ok / 0 fail**.
- `workflow_dispatch dry_run=true`: **success** (`36288089780`, 13s) — zero issue.
- `workflow_dispatch dry_run=false` (LIVE): **success** (`36288156632`, 13s) — **zero** issue `alerta-metrico` (sistema saudável ⇒ nenhuma condição real disparada).
- Nenhum valor de token impresso em stdout/log/PR.

## Efeito permanente
Como `vars.METRICS_URL` + `secrets.ADMIN_TOKEN` estão configurados, as execuções **agendadas** (a cada 15 min) passam a coletar `/metrics` AO VIVO automaticamente (dedup por label `alerta-metrico`; cria/atualiza/fecha conforme condição real).

## Rollback (reversível)
`gh variable delete METRICS_URL` (ou `gh secret delete ADMIN_TOKEN`) → o workflow volta a fixture + dry-run forçado.

## Risco técnico aceito
`ADMIN_TOKEN` também autoriza rotas admin de convite/coleta. Mitigação: Secret (nunca em arquivo/log), uso apenas leitura em CI; ideal futuro = token read-only dedicado ao `/metrics`.

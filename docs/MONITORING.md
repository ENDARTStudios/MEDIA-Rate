# MONITORING — Observabilidade de produção

Aprofundamento completo: [`OBSERVABILITY.md`](OBSERVABILITY.md) (logger único,
audit, env vars). Aqui: o mapa de "onde olhar o quê".

## Sinais e onde olhar

| Sinal | Onde | Como |
|---|---|---|
| **Disponibilidade** | `/health` (público, sem log) | `health-check.yml` (cron 5min, fallback) + UptimeRobot externo (**pendente Operador**, 9.5.4 — guia no OBSERVABILITY.md) |
| **Métricas** | `/metrics` (Prometheus) | IP allowlist (`METRICS_ALLOW_IPS`) OU sessão ADMIN OU `X-Admin-Token`; `http_requests_total` por {method,route,status}, `http_request_duration_seconds`, `http_errors_total` (5xx) |
| **Alertas** | T218 (sem serviço externo) | `5xx_rate` >1%/5min = CRITICAL · `auth_failures` >50/1min = WARNING; histerese 10%; status em `GET /api/v1/admin/alerts/status`; transições em log + audit |
| **Logs** | Railway (stdout JSON, logger único nestjs-pino — D-531) | Dashboard Railway ou `railway logs --service "MEDIA Rate"`; CLI de resumo: `node scripts/logs-errors.mjs [--minutos 30]` (4xx/5xx/rotas); redaction de headers sensíveis; PII de auth mascarada (T049) |
| **Erros** | Sentry | DSN por env; release = commit sha; sourcemaps anexados (D-503 — verificar ARTEFATO, não só step verde: D-505); PII off; triagem em `docs/SECURITY_TRIAGE.md` |
| **Produto** | PostHog (consent-gated) | funis canônicos e flags — ver [ANALYTICS](ANALYTICS.md) |
| **Deploy** | CI/Railway/Vercel | ver [PRODUCTION_DEPLOY](PRODUCTION_DEPLOY.md) |

## Rotinas

- **Pós-merge**: smoke ([QA_TESTING](QA_TESTING.md)) incluindo varredura de 5xx nos logs.
- **Diário (Operador/agenta a pedido)**: `scripts/logs-errors.mjs --minutos 1440`;
  alertas ativos em `/admin/alerts/status`; Sentry sem nova issue crítica.
- **Semanal (Beta)**: exclusões de indexação (SEO), taxa de 5xx, uso de imagem
  (runbook Fase 10), issues automáticas novas (triagem).

## Incidentes

Runbook: `docs/INCIDENT_RESPONSE.md` (inclui resposta LGPD). Canal: alerta →
triagem (log/Sentry/alerta) → mitigação (rollback por revert se código) →
post-mortem em `worklog.md` (+ DECISOES se mudar regra/processo).

## Regras

1. Alerta novo sem dono → registrar em PENDENCIAS_OPERADOR.md.
2. Métrica de infra **nunca** carrega PII (contagem, nunca identidade).
3. Mudança em logging/telemetria = verificação de artefato (D-505: release com
   sourcemaps anexados, linha de log com o campo esperado) + OBSERVABILITY.md
   atualizado no mesmo PR.

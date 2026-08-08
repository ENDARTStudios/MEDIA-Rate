# Observabilidade — MEDIA Rate API (T217, Fase 9.5)

## Stack escolhida

| Camada | Solução | Onde |
|---|---|---|
| Logs estruturados | **Pino** (nestjs-pino) com redact | `common/logger.config.ts` |
| Logs centralizados | **Loki** (LOKI_URL) — local via docker-compose | `common/loki-stream.ts` |
| Métricas | **prom-client** (Prometheus text) | `modules/metrics/` |
| Dashboard | **Grafana** (local via docker-compose) | docker-compose.yml |
| Uptime/alertas | T218 (próxima) | — |

Sem `LOKI_URL` configurada, os logs vão para **stdout** (logs nativos do
Railway — o Railway captura stdout automaticamente). Com `LOKI_URL`
definida (ex.: `http://localhost:3100` local, ou um Loki gerenciado em
produção), o `LokiStream` envia as linhas em batch (máx 200 ou 2s) para
`/loki/api/v1/push` com label `job=media-rate-api`.

## Métricas (GET /metrics)

Formato **Prometheus text** (não JSON):

- `http_requests_total` — counter por `{method, route, status}`.
- `http_request_duration_seconds` — histograma, buckets
  `0.01/0.05/0.1/0.5/1/5`.
- `http_errors_total` — counter de 5xx por `{method, route, status}`.
- Métricas de processo (`app_*`, default metrics do prom-client).

Coleta automática via `MetricsInterceptor` (global em `main.ts`). Apenas
métricas de **infra** — nunca PII, contagem de usuários ou emails.

### Proteção

`GET /metrics` aceita **uma** destas autorizações:

1. **IP allowlist** — env `METRICS_ALLOW_IPS` (separado por vírgula;
   ex.: `METRICS_ALLOW_IPS=10.0.0.5,::1`).
2. **Sessão com papel ADMIN** (RBAC).
3. **`X-Admin-Token`** (ADMIN_TOKEN env) — legado para ops.

Caso contrário → **403**. Não há rate limit extra além do global.

## Como acessar (local)

```bash
docker compose up -d loki grafana   # sobe Loki (:3100) + Grafana (:3000)
# API com LOKI_URL:
LOKI_URL=http://localhost:3100 npm run start:dev

# Métricas:
curl -H "X-Admin-Token: <ADMIN_TOKEN>" http://localhost:4000/metrics

# Grafana: http://localhost:3000 (admin/admin_dev)
#   → Data source: Loki (http://loki:3100) e Prometheus (http://host.docker.internal:4000/metrics)
```

## Configuração em produção

1. Defina `LOKI_URL` (Loki gerenciado ou auto-hospedado) — ou use apenas
   os logs nativos do Railway (sem `LOKI_URL`).
2. Defina `METRICS_ALLOW_IPS` com os IPs do Prometheus/Grafana do Operador.
3. `ADMIN_TOKEN` já é obrigatório em produção (usado também para /metrics).
4. Importe o dashboard Grafana com as 3 métricas acima.

## Segurança

- **Pino redact** já substitui `password`, `token`, `authorization`,
  cookies, `stripe_*` etc. por `[Redacted]` antes de qualquer destino.
- **LokiStream** recebe apenas linhas já redacted; falha de envio é
  silenciosa (nunca derruba a app).
- `/metrics` não expõe dados de usuários; protegido por RBAC/IP allowlist.

## Próximos passos (T218)

- Alertas (taxa de erro 5xx, latência p95, uptime check).
- Dashboard Grafana versionado no repo.

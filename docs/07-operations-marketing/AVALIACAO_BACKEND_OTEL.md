# Avaliação de Backend OpenTelemetry — MEDIA Rate (T355)

> Diretriz D-320: custo zero, só ferramentas gratuitas/open-source.
> Recomendação registrada em DECISOES.md (D-327). Implementação é tarefa
> separada (após a escolha).

## Critérios

| Critério | Grafana Cloud (free tier) | Jaeger self-hosted |
|---|---|---|
| Custo | **Zero** (free tier) | Zero (infra própria) |
| Setup | Signup + API key (minutos) | Docker + storage (horas) |
| Manutenção | **Zero** (SaaS) | Updates, disco, backup |
| OTLP nativo | **Sim** (OTLP/HTTP gateway) | Sim (all-in-one:4318) |
| UI | **Rica** (Tempo traces + dashboards + alerting) | Simples (traces only) |
| Escala free | **50 GB traces/mês** + 50 GB logs + 10k metrics | Depende do storage próprio |
| Privacidade | Dados em servidor terceiro (Grafana Labs) | Dados no próprio servidor |
| Retenção | 14 dias (free) | Configurável |

## Recomendação: **Grafana Cloud free tier**

**Justificativa:** para a escala do MEDIA Rate (1k → 50k usuários no Ano 1) o
free tier (50 GB traces/mês) é mais que suficiente e elimina TODA a carga de
operação (servidor, storage, updates, disco, backup). Jaeger self-hosted só se
justificaria se houvesse exigência de privacidade estrita (dados no próprio
servidor) ou volume acima do free tier — nenhum dos dois se aplica agora.

## Setup (quando o Operador criar a conta Grafana Cloud)

1. Criar conta free em https://grafana.com → Stack "Grafana Cloud Free".
2. Copiar o **endpoint OTLP** e gerar um **API token** (escopo traces:write).
3. No Railway (API) e Vercel (web), definir:

```
# API (apps/api)
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central-0.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64(<instance_id>:<api_token>)>
OTEL_SERVICE_NAME=media-rate-api

# Web (apps/web)
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central-0.grafana.net/otlp
# (o web OTel browser exige CORS habilitado na Grafana Cloud — ativar se for exportar do navegador)
```

4. Validar: gerar tráfego → traces aparecem em Grafana Cloud → Explore → Traces.

## Setup alternativo (Jaeger self-hosted, se privacidade estrita)

```yaml
# docker-compose.otel.yml
services:
  jaeger:
    image: jaegertracing/all-in-one:1.62
    ports: ["16686:16686", "4318:4318"]
    environment: [COLLECTOR_OTLP_ENABLED: "true"]
```
`OTEL_EXPORTER_OTLP_ENDPOINT=http://<host>:4318/v1/traces` (sem auth, só interno).

## Decisão

**D-327:** usar **Grafana Cloud free tier**. Revisar para Jaeger self-hosted
somente se o volume de traces ultrapassar o free tier ou se surgir requisito de
privacidade de dados on-prem.

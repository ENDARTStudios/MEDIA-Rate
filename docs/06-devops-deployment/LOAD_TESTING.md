# Load Testing — MEDIA Rate API (T220, 8.7)

Testes de carga com **k6** contra a API. Critério de Open Beta: **1.000 VUs**
com ramp-up progressivo e thresholds de performance.

## Cenários (k6-scripts/load-test.js)

| Cenário | Fluxo | Faixa de VUs |
|---|---|---|
| `healthCheck` | GET /health (páginas públicas) | 1–600 |
| `catalogBrowse` | GET /api/v1/midias?limit=20 (busca/catálogo) | 601–850 |
| `checkoutFlow` | POST /api/v1/checkout (cookie mockado; 200 ou 401 válidos) | 851–1000 |

**Escala (T220)**: ramp-up `0 → 1000 VUs em 5min`, sustain `10min`,
ramp-down `5min` (stages no `options.scenarios.load`). Configuração em
`k6-scripts/config.js` (`BASE_URL`, `VUS_MAX`, `STAGES`, distribuição).

## Thresholds

| Métrica | Threshold | Significado |
|---|---|---|
| `http_req_duration` | **p95 < 500ms** | latência do percentil 95 |
| `http_req_failed` | **rate < 1%** | erro HTTP < 1% do total |
| `http_reqs` | **count > 10000** | volume mínimo por execução |
| `latency_ms` / `errors` | p95 < 500ms / rate < 0.05 | compat T8.4 |

Falha em qualquer threshold → **exit code 99** (CI detecta).

## Como executar

### Instalação do k6

- **macOS**: `brew install k6`
- **Debian/Ubuntu**: `sudo gpg -k ... && sudo apt install k6` (ver
  https://k6.io/docs/getting-started/installation/)
- **Windows**: `choco install k6` ou baixar o binário
- **Docker**: `docker run --rm -i grafana/k6 run - < script.js`

### Smoke test (validação rápida do script)

```bash
k6 run --vus 10 --duration 30s k6-scripts/load-test.js
# Esperado: exit 0 (10 VUs → roteados para /health; thresholds com folga).
# Validado localmente: p95 ≈ 4ms, error 0%, ~110k requisições em 30s.
```

No smoke (CLI sobrescreve os cenários), os execs rodam **sem o sleep de
leitura do usuário** — validação de script não precisa de think time — o que
permite acumular volume (> 10k requisições) e validar todos os thresholds.

**Rate limit do alvo**: o teste de carga gera alto volume de um único IP.
Para o alvo não responder 429 (que conta como erro no threshold), suba o
limite global no ambiente alvo: `RATE_LIMIT_API_PER_MIN=1000000` (o default
é 100/min — insuficiente para qualquer run de carga).

### Teste completo (1.000 VUs)

```bash
k6 run k6-scripts/load-test.js
# ~20 minutos; exige a API alvo de pé.
```

### Alvo customizado

```bash
k6 run -e BASE_URL=https://staging.example.com k6-scripts/load-test.js
```

**NUNCA execute contra produção sem autorização explícita do Operador.**
Default: `http://localhost:4000` (staging/documentado).

## Como interpretar os resultados

- **p95 (http_req_duration)**: 95% das requisições abaixo deste valor.
  p95 < 500ms = boa experiência; p95 > 800ms = investigar (cache T210,
  índices, locks).
- **Error rate (http_req_failed)**: % de respostas não-2xx. < 1% esperado;
  acima disso, investigar 5xx/429 (rate limit) antes de culpar a carga.
- **Throughput (http_reqs)**: requisições por segundo em `iterations` e
  `http_reqs` do resumo. Compare com a execução anterior (baseline).
- **Thresholds** no final: se algum `✗` → exit 99. Use `k6 run --summary-trend-stats="avg,p(50),p(95),p(99)"`
  para mais detalhes no resumo.
- Falhas concentradas em um cenário (ex.: só checkout) apontam problema
  específico (auth/Stripe), não capacidade geral.

## Quando executar

- **Antes do Open Beta** (critério 8.7).
- Após mudanças de performance: cache (T210), busca tsvector (T208),
  índices novos, migrações.
- Após mudanças de infra (Redis, PostgreSQL, deploy).
- Execução completa leva ~20min — use o **smoke test** (30s) para validar o
  script antes de um run longo.

## Segurança

- Default `localhost`/staging; produção exige autorização do Operador.
- O script usa cookie mockado no checkout — sem credenciais reais.
- Thresholds previnem degradação não detectada.

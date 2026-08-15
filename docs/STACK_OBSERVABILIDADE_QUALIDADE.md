# Stack de Observabilidade + Qualidade (D-319 + D-320)

> Diretriz D-320 (custo zero): só ferramentas gratuitas/open-source. Datadog,
> NewRelic e Codecov tier pago foram **descartados**. Este doc é o guia único
> de implementação, operação e leitura dos outputs.

## 1. Visão geral

| Ferramenta | O que faz | Estado | Custo |
|---|---|---|---|
| Sentry | error tracking (free tier 5k/mês) | ✅ T293/T315 | free |
| OpenTelemetry | traces/metrics/logs backend-agnostic | ⏳ fase 1 | free |
| Grafana Cloud / Jaeger | UI de traces | 🔑 Operador escolhe (ambos free) | free |
| Playwright | testes e2e + visuais | ✅ T023 | free |
| coverage v8 | cobertura de código | ✅ T024 | free |
| Knip | código/deps não usadas | ⏳ fase 2 | free |
| Stryker | mutation testing | ⏳ fase 2 | free |
| Arch-contract (ou madge+dependency-cruiser) | regras de arquitetura | ⏳ fase 3 | free |
| Comilint (ou commitlint) | lint de commits | ⏳ fase 3 | free |
| Biome | lint+format (avaliação) | ⏳ fase 4 | free |

## 2. Fase 1 — OpenTelemetry (observabilidade neutra)

Objetivo: traces automáticos (HTTP + Prisma) + métricas customizadas, exportando
para qualquer backend (Grafana Cloud, Jaeger self-hosted, ou Datadog/NewRelic se
um dia for pago).

**Instalar (API):**
```bash
npm i -w apps/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http @prisma/instrumentation \
  @opentelemetry/sdk-metrics
```

**Instalar (web):**
```bash
npm i -w apps/web @opentelemetry/sdk-trace-web @opentelemetry/exporter-trace-otlp-http
```

**Config (API, `apps/api/src/common/otel.ts`):** NodeSDK com
`traceExporter: OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })`
(em dev, `ConsoleSpanExporter`), `instrumentations` com `getNodeAutoInstrumentations()`
+ `PrismaInstrumentation`. Métricas customizadas (incrementadas nos services):
`http_request_duration_seconds`, `auth_failures_total`, `mailer_sent_total{type}`.

**Redação (obrigatória):** antes de exportar, aplicar a MESMA política de redação
do Pino/Sentry (headers de auth, corpo, tokens) — nunca exportar PII.

**Env:**
```
OTEL_EXPORTER_OTLP_ENDPOINT=   # vazio em dev = console; em prod = endpoint OTLP
OTEL_SERVICE_NAME=media-rate-api
```

## 3. Fase 2 — Qualidade de código

### Knip (código/deps não usadas)

```bash
npm i -D knip
```
Config `knip.json` (raiz) para monorepo npm workspaces (ver arquivo). Roda como
job de CI **separado** (não bloqueia PR inicialmente):
```bash
npx knip
```
Critério: zero exports/deps não usadas (ou warning com baseline até limpar).

### Stryker (mutation testing)

```bash
npm i -D @stryker-mutator/core @stryker-mutator/typescript @stryker-mutator/vitest-runner
```
Config `stryker.conf.js`: `testRunner: "vitest"`, `mutator: "typescript"`,
`thresholds.high: 60` (subir progressivamente). **Roda semanalmente via cron**
(não em todo PR — é caro):
```bash
npx stryker run
```

## 4. Fase 3 — Governança

### Arch-contract (regras de arquitetura)

Regras a impor (modules não importam de outros modules exceto via interfaces;
`domain` não importa de `infra`). Se `arch-contract` não amadurecer no repo,
usar `madge` + `dependency-cruiser` (alternativa open-source mais madura):
```bash
npm i -D dependency-cruiser madge
```

### Comilint (lint de commits)

Substitui/complementa o `conventional-commit-guard`. Valida o CORPO além do
título (ex.: commits `feat`/`fix` com >5 arquivos exigem corpo explicativo).
Config `.comilintrc.yml`.

## 5. Fase 4 — Avaliação Biome (decisão técnica, NÃO substituição automática)

Benchmark real no repo: `time npx eslint .` vs `time npx biome check .`.
Substituir **apenas** se Biome for >2x mais rápido E não perder regras críticas
(security plugin). Documentar em DECISOES.md. Senão, manter ESLint+Prettier.

## 6. Integração CI (jobs novos)

Fase inicial: jobs **warning-only** (não bloqueiam). Após 1 sprint estável,
viram bloqueantes. Jobs:
- `otel-smoke`: build + subir API com OTEL em console, assert trace emitido.
- `knip`: `npx knip` (warning).
- `comilint`: `npx comilint` (warning).

## 7. Quando o Operador precisa agir

- Escolher backend de traces: **Grafana Cloud free tier** ou **Jaeger self-hosted**
  (ambos gratuitos — D-320). Definir `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Decisão Biome (técnica, Doer propõe).

> Nenhuma ferramenta paga. Qualquer proposta futura de tool paga exige ROI +
> aprovação explícita (D-320).

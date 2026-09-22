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

## Alertas (T218, 9.5.3)

Alertas calculados a partir das métricas existentes — sem segundo pipeline:

| Alerta | Threshold | Janela | Severidade |
|---|---|---|---|
| `5xx_rate` | 5xx > 1% do total | 5min deslizante | CRITICAL |
| `auth_failures` | falhas de login > 50 | 1min deslizante | WARNING |

- **Histerese de 10%**: resolve apenas quando cair abaixo de 90% do
  threshold (`5xx_rate < 0.9%`, `auth_failures < 45`) — evita flapping.
- Janelas: ring buffers de timestamps em memória (sem dependência externa).
- Transição → log Pino `error` (active) / `info` (resolved) + audit_log
  (`ALERT_TRIGGERED` / `ALERT_RESOLVED`). Nunca loga dados de usuário.
- **Status**: `GET /api/v1/admin/alerts/status` (RBAC `@Roles('ADMIN')`;
  non-admin → 403) retorna `{ alertas: [{nome, estado, threshold,
  valorAtual, janela, ultimoDisparo}], atualizadoEm }`.
- **Canal de alerta**: log crítico + Loki (já configurado) + endpoint de
  status. Nenhum serviço externo pago (PagerDuty/Opsgenie) sem aprovação
  do Operador.

### UptimeRobot free (9.5.4) — guia para o Operador

A criação da conta é **ação do Operador** (serviço externo). Passo a passo:

1. Crie uma conta gratuita em https://uptimerobot.com.
2. Add New Monitor → **HTTP(s)**.
3. URL: `https://<api-do-mediarate>/health` — caminho REAL do healthcheck
   (T230: o controller expõe `GET /health`; o caminho com prefixo
   `api/v1` NÃO existe e o monitor ativo em produção usa `/health`,
   confirmado em 2026-08-09).
   O `/health` não exige auth e é excluído do log de requisições.
4. Interval: **5 minutes** (plano free) · Timeout: 30s.
5. Alert when down → marque **Down 2 times** (evita falso positivo em
   restart) e **Notify**: email.
6. (Opcional) o `health-check.yml` do GitHub Actions já faz cron a cada 5
   minutos como fallback.

## Sentry server-side (T452, F18)

- **Erros**: `GlobalExceptionFilter` captura 5xx via `capturarSentry` com
  `correlation_id`/`http_*` e `user.id` (nunca e-mail/nome).
- **Performance**: `SentryTracingInterceptor` abre uma transação
  `http.server` por requisição (nome = `MÉTODO rota`) e registra
  `http.status_code`. No-op sem `SENTRY_DSN`.
- **Release tracking**: `SENTRY_RELEASE` → `RAILWAY_GIT_COMMIT_SHA` →
  `GIT_COMMIT` (nessa ordem). Correlaciona erros/transações com o commit.
- **PII**: `sendDefaultPii: false` + `redactEvent` (headers/body/extra
  sensíveis). Nunca envia IP/cookies/headers automaticamente.
- **Env**: `SENTRY_DSN` (obrigatório p/ ativar), `SENTRY_TRACES_SAMPLE_RATE`
  (0..1; default 0.1 em produção), `SENTRY_RELEASE` (opcional).
- **Sourcemaps (web)**: o job `build` do CI roda
  `sentry-cli sourcemaps upload --release <sha>` **apenas** quando
  `SENTRY_AUTH_TOKEN` existe (secrets) + vars `SENTRY_ORG`/`SENTRY_PROJECT`.
  Sem eles, é no-op.

## PostHog — funis e feature flags (T452, F18)

- **Consentimento**: analytics só carrega com consentimento `analytics`
  (T432). Sem consentimento, nada é enviado. `identify` envia apenas
  `id` + `plan` (sem PII).
- **Funis de conversão** (eventos canônicos):
  `user_registered` → `trial_started` | `checkout_completed` →
  `subscription_activated`. Emitidos no `PaymentService` (checkout/webhook).
- **Feature flags (rollout gradual)**:
  - `cloudflare_migration` — decide CDN/endpoint (Vercel vs Cloudflare)
    durante a migração. **Default OFF** → comportamento atual preservado.
    **Criada** em 2026-09-14 via CLI (PostHog id **886344**, ativa com
    rollout 0%; T454 a eleva por percentual quando a migração avançar).
  - Uso no web: `flagAtiva(posthog, FEATURE_FLAGS.CLOUDFLARE_MIGRATION)`
    (`apps/web/src/lib/posthog.ts`) — nunca lança; erro/ausência do SDK cai
    no fallback (OFF).
  - Ajustar rollout (Operador; dashboard do PostHog **ou** CLI — a Personal
    API key precisa do scope `feature_flag:write`):

    ```bash
    posthog-cli --host https://us.posthog.com --dotenv-file .env api call \
      update-feature-flag '{"id":886344,"filters":{"groups":[{"properties":[],"rollout_percentage":50}]}}'
    ```

### Env (web)

`NEXT_PUBLIC_ANALYTICS_WRITE_KEY` (PostHog), `NEXT_PUBLIC_POSTHOG_HOST`,
`NEXT_PUBLIC_SENTRY_DSN`. Ausentes ⇒ SDKs inerte (no-op), sem quebrar a UI.

## Upload de assets — Cloudflare R2 (T453, F18)

- **Porta/adapters**: `AssetUploadService` depende de `StorageAdapter`
  (`storage.port.ts`). `selecionarStorage()` escolhe em 3 estados (matriz
  abaixo): `R2Storage` (S3 via `@aws-sdk/client-s3`), `UnconfiguredStorage`
  (fail-closed) e `InMemoryStorage` (dev/test).
- **Rota**: `POST /api/v1/admin/assets/:midiaId/:tipoMidia` (admin-only,
  rate limit 10/min, bodyLimit 12 MiB).
- **Validação**: magic bytes (whitelist JPEG/PNG/WebP/AVIF — nunca extensão),
  limite 10 MiB (413), tipo inválido (415).
- **Chave content-addressed**: `media/{tipo}/{midiaId}/{sha256}.{ext}` —
  nenhum fragmento de filename do usuário entra no path.
- **Audit**: `MEDIA_ASSET_UPLOADED` (usuario, midia, sha256, tamanho, MIME) —
  append-only, sem PII.
- **Seleção de storage (3 estados)**:
  (a) **produção com env R2 completa** → `R2Storage` (persiste no bucket);
  (b) **produção sem env R2** → `UnconfiguredStorage`: **503
  `STORAGE_UNAVAILABLE` + warn de boot** (fail-closed, **NUNCA grava em
  memória** — evita perda silenciosa de assets);
  (c) **dev/test** → `InMemoryStorage`.
- **Env (Railway)**: `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY` e, opcional, `R2_PUBLIC_BASE_URL` (CDN). As
  credenciais nunca vão ao cliente/log.
- **UI**: `/admin/upload` (interna, noindex). Ativação em produção após o
  Operador provisionar bucket + token escopado.
- **Verificação de artefato (D-505)**: após o primeiro deploy com
  sourcemaps, inspecionar **UMA release no Sentry via UI** (Settings →
  Releases → abrir a release do merge) e confirmar que **arquivos estão
  anexados** — `productionBrowserSourceMaps` era obrigatório no
  `next.config.ts`; sem ela o step saía **0 (sucesso vazio)** (exit 0 sem
  cumprir a função — release "fantasma" criada só pelo tracking da
  integração GitHub). **Política**: todo step novo de observabilidade no CI
  precisa de verificação de "artefato produzido" documentada no runbook —
  exit code verde é condição necessária, não suficiente.
- **Verificação via CLI (D-524/T468)**: o token `org:ci` NÃO lista
  releases/arquivos via REST (401/404), mas o `npx @sentry/cli releases
  list` FUNCIONA (com SENTRY_AUTH_TOKEN/ORG/PROJECT do .env). Release
  `91a5e31` verificada em 2026-09-19 (764 arquivos confirmados antes via UI
  pelo Operador; CLI mostra a release registrada, 0 novos eventos em 40h —
  coerente com T466 stale). Triagem de issues: via UI (issues API → 401 com
  este token).

## Logs estruturados e CLI de erros (T027 / D-527; correção item 14 #148)

- **Fonte única de request logging: nestjs-pino** (`AppLoggerModule` →
  `common/logger.config.ts`, T1.8/T217). O T027 chegou a ligar também o
  logger nativo do Fastify (`FastifyAdapter({ logger })`), o que
  **duplicava** cada linha de request no Railway (shapes `reqId` vs
  `req{id}`); o bloco foi removido em 2026-09-21 (item 14 da #148).
  **Nunca** adicionar `logger:` ao FastifyAdapter sem remover o
  nestjs-pino (ou vice-versa) — um logger de requests, apenas.
- **Redaction**: `authorization`, `cookie`, `x-csrf-token` (e campos de
  corpo sensíveis: password/token/stripe_*) viram `[Redacted]` antes de
  qualquer destino. `LOG_LEVEL` controla o ruído (produção: `info`).
- **Agregação**: os logs JSON vão para o stdout e são agregados nativamente pelo
  Railway (dashboard externo — Logs do serviço "MEDIA Rate").
- **CLI de erros**: `node scripts/logs-errors.mjs [--minutos 30]` resume 4xx/5xx,
  rotas mais atingidas e amostra de erros a partir dos logs nativos do Railway.
- **Audit trail**: `AuditLogService` registra mutações de watchlist
  (add/move/remove, T027/D-529) com cadeia de hash — visível nos logs
  como `Audit: <acao> em <entidade>/<id>`.
- **Métricas**: `/metrics` (Prometheus) expõe `http_requests_total` por
  {método, rota, status} (4xx e 5xx distinguíveis), `http_request_duration_seconds`
  e `http_errors_total`; `/admin/alerts/status` expõe ring buffers/histerese (T218).
- **Params UUID** (item 13 #148): rotas com `:id`/`:midiaId` que mapeiam
  colunas `@db.Uuid` usam `UuidParamPipe` (`common/pipes/uuid-param.pipe.ts`)
  — id malformado → **404** sem tocar o Prisma (antes: P2023 → 500).

## Alertas métricos automatizados (T040 / D-538)

Além dos alertas in-app do `AlertsService` (T218: `GET /admin/alerts/status`),
o workflow **`alertas-metricos.yml`** (schedule 15 min + manual) avalia os
thresholds e **abre/atualiza uma issue** (`label alerta-metrico`) com dedup:

- **5xx:** taxa > 1% (janela 5 min) OU >= 5 erros absolutos → CRITICAL.
- **auth_failures:** > 50 em 1 min OU >= 10 em 5 min → WARNING.

Lógica pura em `scripts/ci/metric-alerts.mjs` (self-test determinístico:
`node scripts/ci/metric-alerts.self-test.mjs`). Thresholds configuráveis por env
**não-secreta**: `ALERT_5XX_PCT`, `ALERT_5XX_ABS`, `ALERT_AUTH_1MIN`, `ALERT_AUTH_5MIN`.

**Dry-run por padrão.** O workflow só **age** (issue) quando a fonte é LIVE:
`vars.METRICS_URL` + `secrets.ADMIN_TOKEN` (coleta de `/metrics`, Prometheus
text, protegido por `X-Admin-Token`). Sem isso, usa o fixture e roda em dry-run
— nunca abre issue falso. Nenhuma infra paga, nenhum deploy.

## Uptime sintético de endpoints públicos (T042 / D-539)

Workflow **`uptime-check.yml`** (schedule 10 min + manual) faz **GET/HEAD** em
rotas públicas e **somente leitura** (timeout 10 s):

- API: `/health`.
- Web: `/pt-BR`, `/en-US`, `/es-ES`, `/pt-BR/catalog`, `/pt-BR/pricing`, `/pt-BR/login`.

Lógica pura em `scripts/ci/uptime-check.mjs` (self-test: `node scripts/ci/uptime-check.self-test.mjs`).
**Dedup de issue** (label `uptime`): cria só na 1ª falha; em falha contínua
**atualiza o corpo** da issue (sem comentar em loop); **fecha** na recuperação.
Permissões mínimas (`contents: read`, `issues: write`), `concurrency` ativa.
**Sem** secret, credencial, cookie ou endpoint autenticado.

**Relação com UptimeRobot (externo):** este monitor é **sintético, no CI** — roda
dos runners do GitHub e **não** é distribuído (multi-região). Ele **não substitui**
o UptimeRobot externo (ver P015); os dois se complementam.

### UptimeRobot free (P015) — guia para o Operador

1. Conta gratuita em https://uptimerobot.com.
2. Add New Monitor → **HTTP(s)** para `https://media-rate-production.up.railway.app/health`
   e (opcional) `https://mediarate.app/pt-BR`.
3. Interval: 5 min · Timeout: 30 s · Alert when down 2 vezes → e-mail.

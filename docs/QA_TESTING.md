# QA_TESTING — Smoke de produção (padrão validado)

Smoke executado e validado nas promoções T027/T028/T030/T032. Usar este checklist
após **todo** merge em `main`; resultado no PR/issue com data.

## Preparo

- Conta de smoke: `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` no `.env` raiz (conta
  verificada em produção). **Uso de leitura + limpeza** — nunca deixar resíduo.
- mediarate.app responde **429 para client sem browser UA** — enviar
  `User-Agent: Mozilla/5.0 …`.
- Client de API: jar de cookies (`sess`, `csrf_token`, `refresh`) + header
  `x-csrf-token` com o valor do cookie `csrf_token`.
- **DELETE sem body: NÃO enviar `content-type: application/json`** (Fastify responde
  400 "Body cannot be empty" — comportamento conhecido, não bug).

## Checklist mínimo (todo merge)

1. `GET https://media-rate-production.up.railway.app/health` → **200** `status:ok`
   (uptime baixo = deploy novo no ar).
2. Home nos 3 locales (`/pt-BR`, `/en-US`, `/es-ES`) com UA de browser → **200**,
   **0** chaves cruas/`MISSING_MESSAGE` no HTML.
3. Logs Railway (`railway logs --service "MEDIA Rate"`) → **0** `statusCode":5xx`
   recentes; linha de request com `responseTime` (1 linha por request — D-531).
4. Sanity autenticado: `GET /api/v1/watchlist` → 200; `GET /api/v1/interacoes?limit=1`
   → 200 com envelope (`porStatus` presente).

## Smoke específico por mudança (exemplos reais)

| Mudança | Verificação |
|---|---|
| Máquina de estados (D-528) | add COMPLETED → move p/ DROPPED = **400 "(D-528)"**; move CONCLUIDO→WATCHING = 200 com interação projetada CONSUMINDO; restaurar + deletar entry (204) |
| Params UUID (D-531) | `PATCH /watchlist/nao-uuid/move` = **404** (antes 500); UUID válido inexistente = 404 pelo service (sem falso bloqueio) |
| Logs/redaction | 0 `x-csrf-token` nos logs; 1 "request completed" por request |
| Páginas/SSR | página alvo 200 logado e deslogado; deep link deslogado = 307 com callbackUrl completo (path+query) |

## Achando um UUID de mídia no PROD

Catálogo de produção é esparso (curadoria) — `GET /api/v1/midias?limit=5` retorna
UUIDs (search/trending podem voltar vazios legtitimamente).

## Resíduo e evidência

- Limpar o que criou (DELETE entry; interação residual na conta de teste é aceitável
  e documentada).
- Registrar no PR/issue: http codes, trecho de log (sem credenciais), data/hora.
- Falha crítica → rollback por revert autorizado ([PRODUCTION_DEPLOY](PRODUCTION_DEPLOY.md)).

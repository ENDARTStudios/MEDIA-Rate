# Rate limit admin + anti-probing sanitizado (T203)

**Data:** 2026-10-12 · **Fase:** F08-tests-security · **Tarefa:** T203-admin-rate-limit-anti-probing-hardening
**Resolve:** achado secundário **`ADMIN_RATE_LIMIT_WEAK`** (T201). Infraestrutura **existente**
(`@fastify/rate-limit` + sliding window Redis/fallback + Pino) — **nenhuma dependência nova**,
auth core/guards/schema intocados. GO permanece SUSPENSO até REVIEW; step-up/MFA = **T204**
(design próprio — não feito pela metade, por decisão do packet).

## 1. O que foi implementado

| Controle | Detalhe |
|---|---|
| **Rate limit admin (leituras)** | `/api/v1/admin/*` **GET → 60/min** por sessão(hash)/IP+rota (`RATE_LIMIT_ADMIN_PER_MIN`) — mais estrito que o global (100/min); cobre o **probe do gate** do frontend (`/admin/backfills/status`) sem impedir page load |
| **Rate limit admin (destrutivas)** | `/api/v1/admin/*` **POST/PATCH/PUT/DELETE → 10/min** (`RATE_LIMIT_ADMIN_DESTRUCTIVE_PER_MIN`) — purge LGPD, ban/desbanir, plano, moderação, backfills |
| **Anti-probing sanitizado (429)** | `errorResponseBuilder` em rotas admin → `adminProbingMonitor.registrar("RATE_LIMIT", rota, sess)`; excedente da janela (5/min) loga `ADMIN_RATE_LIMIT_EXCEEDED` **com hash de sessão** — nunca IP/UA/token cru |
| **Anti-probing sanitizado (403)** | `GlobalExceptionFilter`: 403 em `/api/v1/admin/*` → `registrar("NEGADO", …)`; excedente loga `ADMIN_ACCESS_DENIED_REPEAT` (mesma sanitização) |
| **Aplicação** | `aplicarRateLimitAdmin(routeOptions)` (nova, no `rate-limit.config.ts`) chamada pelo hook `onRoute` do `main.ts` e replicada no helper de segurança dos e2e; **não sobrescreve** rate limit já aplicado (ex.: upload de assets) |
| **Mecanismo** | o mesmo de sempre (D-558): sliding window (Redis ZSET + fallback memória), keyGenerator sessão-hash/IP+rota; **rate limit não substitui autorização** — ordem Auth → CSRF → Roles → Plan preservada |

## 2. Descoberta técnica relevante (bug de ordem documentado)

O hook `onRoute` que **escreve** `config.rateLimit` deve ser registrado **antes** do
`register(rateLimit)` — o plugin lê a config no **seu** `onRoute` no boot; na ordem inversa o
limite por rota morre silenciosamente (já documentado no `main.ts` como "provado em
produção"). O helper de testes e2e (`apply-security.ts`) foi alinhado ao main (hook antes do
plugin) — é o que permite o e2e novo exercitar os limites reais.

**Descoberta adicional:** 429 por rota **não herda** o `errorResponseBuilder` global — cada
`config.rateLimit` recebe o builder exportado (`resposta429Padrao`, agora função), mantendo o
envelope D-558 e o registro anti-probing.

**Contrato real do corpo 429** (documentado no spec e2e): `{statusCode, message}` genérica —
sem stack/rota interna/detalhe de store (o throw do builder é normalizado pelo handler de
erro do Fastify).

## 3. TDD (vermelho → verde; sem rede/produção/credencial admin)

- **RED:** módulo do monitor inexistente + helpers admin ausentes.
- **GREEN:** `admin-probing-monitor.spec.ts` (novo, 7 casos: janela, limite/excedente, hash
  sem token cru, anônima, expiração, não-mistura de chaves, singleton);
  `rate-limit-config.spec.ts` (+7: valores 60/10 + env override, GET vs destrutivas,
  preserva assets, não-admin intocado, 429 admin registra probing **com token fora de
  chave/log**, 429 não-admin não registra); `admin-rate-limit.e2e.spec.ts` (novo, 4 casos com
  AppModule real: burst anônimo destrutiva **11ª = 429** com as 10 primeiras caindo no 401 do
  guard — **sem bypass e sem mutação**; corpo 429 sanitizado; leitura 61ª = 429; rota
  não-admin não herda limite admin) — **29/29** nos focados; suíte API completa
  **1395/1395** (165 arquivos); `tsc` API 0; `eslint` 0; `prettier` limpo.
- Limites calibrados: burst legítimo do ADMIN (navegação/purge manual) fica muito abaixo de
  60/10 por minuto; env permite apertar sem deploy de código.

## 4. Não feito (deliberado) — T204

**Step-up/MFA/anti-racking avançado** exigiria auth core/cookie/schema/dependência nova —
**não implementado pela metade**. Também registrado (candidate, não incidente): o **probe do
gate** da T202 depende de endpoint admin existente — refinamento futuro (endpoint dedicado ou
flag admin em `/auth/me`) pertence a um design de auth hardening (T204+).

## 5. Confirmações

Nenhuma dependência/auth core/infra/segredo/produção/GitHub setting alterados; nenhum alerta
interagido; nenhum purge executado; nenhum IP/UA/token/e-mail em logs ou registros (só hash
de sessão, rota e contagem). Contaminação `123ce28e` ausente; PR com required verdes e smoke
passivo 7/7 (STATUS).

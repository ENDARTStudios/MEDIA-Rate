# Probe dedicado do gate admin (T206) — `GET /api/v1/admin/gate`

**Data:** 2026-10-13 · **Fase:** F08-tests-security · **Tarefa:** T206-admin-gate-probe-refinement
**Autorização:** Operador ("Autorizado", interpretação conservadora do Thinker). Resolve o
acoplamento do gate (T204/Opção B). **Step-up/MFA NÃO implementado** (T205-Fase 1 vem depois,
após REVIEW). GO permanece SUSPENSO.

## 1. O que foi implementado

| Arquivo | Mudança |
|---|---|
| `apps/api/src/modules/admin/admin-gate.controller.ts` (novo) | **`GET /api/v1/admin/gate`** — `@Roles("ADMIN")` + cadeia global de guards (Auth → CSRF → Roles → Plan via `APP_GUARD`); payload **mínimo `{ok:true}`** — nunca papel/e-mail/id/sessão/IP/UA/token; idempotente, sem efeito colateral |
| `apps/api/src/modules/admin/admin.module.ts` | `AdminGateController` registrado nos controllers |
| `apps/api/src/common/rate-limit.config.ts` | **inalterado** — o gate já cai no rate limit admin de leitura (60/min) via `aplicarRateLimitAdmin` (url `/api/v1/admin/gate` começa com `/api/v1/admin/`) |
| `apps/web/src/lib/admin-auth-server.ts` | Probe **primário** = `/api/v1/admin/gate`; **fallback** ao probe antigo (`/admin/backfills/status`) **apenas em 404** (compatibilidade de rollout); 200=ADMIN; **403 = negação explícita SEM fallback**; 401/5xx/erro/timeout/JSON inválido = **fail-closed** (ambos os probes); payload 200 validado como objeto |

Ordem de guards, RolesGuard (banco por request) e rate limit: **inalterados** — o endpoint só
consome a infraestrutura existente. Nenhuma dependência, schema, auth core ou infra alterados.

## 2. TDD (vermelho → verde; sem rede/produção/credencial admin)

- **API** — `admin-gate.spec.ts` (novo, 5 casos com `APP_GUARD` fakes na ordem real
  Auth→Roles): ADMIN → 200 `{ok:true}`; **payload não vaza** role/email/id/session/ip/agent/
  token/cookie (Object.keys === ["ok"]); USER → 403; anônimo → 401; gate coberto pelo rate
  limit de leitura (`aplicarRateLimitAdmin` → 60).
- **Web** — `admin-auth-server.spec.ts` (reescrito, 11 casos): gate 200 → ADMIN sem fallback
  (1 chamada); gate **403 → nega SEM fallback** (decisão explícita de permissão); gate 404 →
  fallback antigo (200 → ADMIN; 403 → negado; erro → fail-closed); gate 401 → fail-closed sem
  fallback; 5xx/erro de rede/JSON inválido → fail-closed; sem cookie → nem consulta; probe
  carrega o cookie da sessão.
- **GREEN:** API 5/5 + web 16/16 (gate+layout); suíte API completa **1399/1399** (165
  arquivos); suíte web completa **591/591** (86 arquivos); `tsc` API e web **0**; `eslint` 0;
  `prettier` limpo.

## 3. Limitações e follow-ups

- O **fallback antigo** (`/admin/backfills/status`) permanece por compatibilidade de rollout —
  remoção apenas em tarefa futura após estabilização (design T204/§4).
- **Step-up/MFA** não implementado aqui (T205-Fase 1, packet próprio, após REVIEW desta).
- Suítes locais rodam com working tree contendo trabalho concorrente do Operador (landing);
  CI é a autoridade (roda apenas o diff desta branch).

## 4. Confirmações

Nenhuma dependência/auth core/guards/schema/infra/produção/segredo alterados; nenhum alerta
interagido; nenhuma credencial admin usada. Contaminação `123ce28e` ausente; PR com required
verdes e smoke passivo 7/7 (STATUS).

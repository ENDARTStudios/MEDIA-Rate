# T088 — Evidência: smoke autenticado em `main` (ambiente efêmero)

**Data (UTC):** 2026-09-25 · **Autor:** Doer · **Fase:** F08-qualidade
**Commit avaliado (`main`):** `c5ec1bf` · **Método:** `workflow_dispatch` do `smoke-auth.yml` (efêmero).

## Resultado

| Campo | Valor |
|---|---|
| Run | `36197739124` (workflow_dispatch, **success**, 1m22s) |
| Job | `Smoke autenticado (efêmero)` — `108277336016` |
| Self-test offline | **14 ok / 0 fail** |
| `login` | **200** |
| `auth_me` | **200** |
| `interacoes` | **200** |
| `internas_ausentes` | **true** (allowlist; sem `usuario_id`/`tenant_id`/`created_at`/`tipo`/`rating`/`comentario`) |
| `production_access` | **false** |
| `credential_leak_detected` | **false** |
| Senha fixture nos logs | **AUSENTE** (`Senha@123` não aparece) |

`smoke-auth: OK`. **Um único login**; **zero** mutação; **zero** acesso a produção.

## Limitações

- Executa em **ambiente efêmero** (Postgres/Redis locais no runner) — **não** é monitor de produção.
- Cobertura read-only após login (sem `PUT`/`POST` de interações).
- O `SMOKE_TEST_*` foi **removido** do `env` (T085); a fixture é inerte e local.

## Recomendação (única)

Manter o smoke como **evidência de CI** (não obrigatório). O **GO de Beta** continua condicionado a **P012**
(staging/environment) e às pendências **P013–P017** do Operador — **Beta não declarada pronta**.

# Smoke autenticado (T084/D-556)

Smoke **determinístico** que autentica **uma vez** e valida endpoints críticos
(read-only) em ambiente **efêmero** (Postgres/Redis locais). Não toca produção.

## O que valida

1. `POST /api/v1/auth/login` → **200** + presença dos cookies de sessão (apenas **nomes**).
2. `GET /api/v1/auth/me` → **200**.
3. `GET /api/v1/interacoes?limit=1` → **200** + envelope `{items,total,porStatus,nextCursor}`
   e, quando há item, **allowlist** confirmada (ausência de `usuario_id`, `tenant_id`,
   `created_at`, `tipo`, `rating`, `comentario`).

**Um único login** por execução; aborta em `!= 200` **sem retry** (evita rate limit/lockout).

## Segurança

- Recusa `SMOKE_BASE_URL` que não seja **localhost/loopback** (bloqueia marcadores de produção).
- A saída contém **apenas** status HTTP, **nomes** de cookie/chave, contadores e booleanos.
- **Nunca** imprime cookie/`Set-Cookie`/token/senha/e-mail/IP/corpo/stack trace.
- Cookie jar **em memória** (sem arquivo; nada é commitado/publicado).

## Como rodar

```bash
# efêmero/local (API em :4000, DB/Redis locais)
SMOKE_TEST_EMAIL=... SMOKE_TEST_PASSWORD=... SMOKE_BASE_URL=http://localhost:4000 \
  node scripts/ci/smoke-auth.mjs

# self-test offline (sem rede)
node scripts/ci/smoke-auth.self-test.mjs
```

**Workflow:** `.github/workflows/smoke-auth.yml` (não obrigatório; `permissions: contents: read`),
dispara em `pull_request` (paths de smoke/docs) e `workflow_dispatch`. Sobe Postgres 16 + Redis 7
efêmeros, aplica migrations locais, provisiona usuário, sobe a API e roda o smoke. **Rollback/desativação:**
remover/branquear o workflow — sem impacto em produção.

## Limites

- Não executa **mutações** (read-only após login); `PUT`/`POST` de interações fica fora do escopo.
- A validação de campos internos depende de haver **ao menos um item** (sem itens → `internas_ausentes=true`).
- **Não** substitui o E2E de jornada (`docs/E2E.md`) nem o uptime/alertas.

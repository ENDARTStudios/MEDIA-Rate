# R2-TEST-MEDIA — política e registro do media de teste para uploads E2E (D-506)

## Política

**Nenhum upload E2E em produção toca media real sem decisão documentada.**
Uploads de validação usam exclusivamente um **media de teste dedicado**
(`media-test-r2-upload`), isolado e auditável — o poster substituído é o do
próprio media de teste. Exceções (tocar media real) passam por ESCALATE.

## Estado

| Ambiente | Media de teste | Estado |
|---|---|---|
| **Local (dev)** | `475eb2dd-ae7f-45bd-99b7-3cea13db806e` (fonte `r2-e2e-test`/`manual`, FILME) | ✅ criado 2026-09-15 — fixture da perna dev |
| **Produção** | slug `media-test-r2-upload` (FILME, título "R2 Upload Test — pode deletar") | ⏳ pendente — criação exige acesso ao banco de produção |

## Bloqueio atual (2026-09-15)

O `DATABASE_URL` disponível aponta para `postgres.railway.internal` (rede
privada Railway) — **inalcançável fora dela**; logo a criação do media de
teste em produção e a perna "produção 201" dependem do Operador:
1. disponibilizar a **URL pública proxy** do Postgres (a mesma ação resolve
   o incidente do workflow Deploy — ver D-503/STATUS T461); ou
2. criar o media via `railway run` no serviço API.

## Diagnóstico da tentativa local (2026-09-15)

- Cadeia **provada até o PutObject**: register → promoção ADMIN → login
  (cookie + CSRF) → `POST /api/v1/admin/assets/{midiaId}/FILME` passou por
  AuthGuard/RolesGuard/CSRF/magic-bytes/limite e chegou ao `R2Storage`
  (seleção correta: com env R2 completa o adapter é o real, não o
  fail-closed nem o InMemory).
- **Falha no TLS para `*.r2.cloudflarestorage.com` a partir desta
  rede/máquina** (`EPROTO ssl alert 40` em curl e Node — middlebox local
  filtrando o endpoint S3; `api.cloudflare.com`/Sentry/PostHog funcionam).
  Railway não usa esta rede — o endpoint S3 funciona lá.
- Probe via API REST do Cloudflare (`api.cloudflare.com/.../objects/`)
  inconclusivo (token `org:ci` sem escopo R2 REST — erro 7003 de roteamento).

## Pós-validação

Media de teste pode ser **soft-deletado** (LGPD-friendly) ou mantido como
fixture — decisão do Operador. Registrar aqui o que foi decidido.

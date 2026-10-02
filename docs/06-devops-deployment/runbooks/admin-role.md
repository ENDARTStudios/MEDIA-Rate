# Runbook — promover/remover papel ADMIN (RBAC)

> T119 / BETA-GAP-03 · 2026-09-28 · sanitizado (sem segredos/PII).

## Quando usar

- Conceder acesso administrativo técnico a uma conta (Beta), **sem depender de
  plano pago** e **sem endpoint público**.
- Remover acesso administrativo.

## Pré-requisitos

- `DATABASE_URL` acessível. Em produção, abrir túnel:
  `railway connect postgres --tunnel-only` e apontar `DATABASE_URL` para o túnel.
- Rodar a partir de `apps/api`.

## Promover

```bash
# forma explícita (recomendada)
npm run db:set-role -- grant ADMIN user@example.com
# ou via env
ROLE_ACTION=grant ROLE_NAME=ADMIN ROLE_EMAIL=user@example.com npm run db:set-role
```

## Remover

```bash
npm run db:set-role -- revoke ADMIN user@example.com
```

- Papéis válidos: `USER | ADMIN | MODERADOR | CURATOR`.
- O comando é idempotente e não-destrutivo (não apaga usuário; remoção só da
  linha de papel). **Recusa** remover o **último** `ADMIN` (anti-lockout).
- Saída sanitizada: `[set-role] acao=… papel=… usuario=<uuid>` (sem e-mail).

## Verificação

1. Autenticar com a conta promovida e chamar `GET /api/v1/admin/stats` → `200`.
2. Autenticar com conta comum (`USER`, qualquer plano) → `403`.
3. Confirmar que o acesso **não** muda conforme o plano (FREE ou PREMIUM).

## Rollback

- `revoke ADMIN <email>` (reverte a promoção).

## Segurança

- Nunca criar endpoint público de autopromoção.
- Nunca commitar e-mail/segredo; o log da CLI não imprime e-mail.
- Sem alteração de billing/Stripe/entitlement.

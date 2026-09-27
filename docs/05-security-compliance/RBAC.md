# RBAC (Controle de Acesso por Papel)

> **Pilar:** `docs/05-security-compliance/` · **Última revisão:** 2026-09-28 (T119 / BETA-GAP-03)

## Objetivo

Descrever o mecanismo de papéis (RBAC) do MEDIA Rate, como ele é aplicado no
backend, como promover/remover papéis com segurança e como verificar.

## Escopo

- **Cobre:** modelo de papéis, guards, decorators, endpoints protegidos,
  promoção/remoção interna, auditoria e testes de autorização.
- **Não cobre:** entitlements de plano (ver `PLAN`/`PlanGuard`) e criptografia de
  colunas (`lgpd-column-encryption-plan.md`).

## Modelo

- **`Papel`** (tabela `papel`) — enum imutável `PapelNome` (`schema.prisma:72-78`):
  `USER` (padrão), `ADMIN`, `MODERADOR`, `CURATOR`.
- **`UsuarioPapel`** (tabela `usuario_papel`, N:N) — `usuario_id`, `papel_id`,
  `atribuido_em`, `atribuido_por` (`schema.prisma:177-189`).
- **Independente de plano:** o plano vive em `UsuarioPlano` e é checado por
  `PlanGuard`. Papel e plano são eixos separados — **plano pago NÃO concede
  admin** e um usuário `FREE` com papel `ADMIN` acessa o admin. O registro
  público cria apenas `UsuarioPlano(FREE) + UsuarioPapel(USER)`
  (`auth.service.ts:137-170`); o DTO de registro (`auth.dto.ts`) é um `z.object`
  sem `role`/`papeis`, então payloads públicos não concedem papel.

## Enforçamento (backend)

- **Decorator** `@Roles('ADMIN', ...)` (`common/decorators/roles.decorator.ts`)
  marca rota com OR lógico.
- **`RolesGuard`** (`common/guards/roles.guard.ts`) — guard **global**
  (`app.module.ts:100-109`, ordem `Auth → CSRF → Roles → Plan`). Lê os papéis do
  banco a cada request (sem cache → revogação tem efeito imediato); sem papel
  exigido → 403.
- **`PlanGuard`** — separado; só atua quando há `@RequirePlan(...)` → 402.
- Rotas admin protegidas (exemplos): `GET /api/v1/admin/stats` e
  `GET /api/v1/admin/diagnostics` (`@Roles('ADMIN')`), feature flags, upload de
  assets, `relacoes`/`curadoria` (CURATOR/ADMIN). O `AuthGuard` garante **401**
  para anônimo; o `RolesGuard` garante **403** para autenticado sem papel.

## Promoção/remoção segura

**Não existe endpoint público de autopromoção.** Papéis são atribuídos apenas
por mecanismo interno com acesso ao banco:

- **CLI:** `apps/api/prisma/set-role.ts` (`npm run db:set-role`), idempotente e
  não-destrutivo; valida `PapelNome`; recusa remover o último `ADMIN` (anti-lockout);
  log sanitizado (sem e-mail/segredo). Ver runbook:
  `docs/06-devops-deployment/runbooks/admin-role.md`.
- **Seed de teste:** `npm run db:provision:test-users` cria `admin@mediarate.test`
  (PREMIUM+ADMIN) e `admin-free@mediarate.test` (FREE+ADMIN) — este último prova
  que o acesso admin independe de plano.

## Auditoria

Ações administrativas registram trilha sanitizada via `AuditLogService`
(ex.: `ADMIN_STATS_VIEWED`), com `usuarioId` (sem PII/segredo) — ver
`admin.controller.ts`.

## Como verificar

1. `cd apps/api && NODE_ENV=test npx vitest run test/admin-rbac.spec.ts`
   (guards reais: FREE+ADMIN → 200; PREMIUM sem ADMIN → 403; comum → 403;
   `@RequirePlan` separado → 402; registro não autopromove).
2. `auth-guard.spec.ts` cobre 401 de anônimo em `/api/v1/admin/stats`.
3. Em ambiente efêmero/staging: `npm run db:set-role -- grant ADMIN <email>` e
   conferir `GET /api/v1/admin/stats` com sessão do usuário (200) e com sessão
   comum (403).

## Referências

- `docs/README.md` (índice) · `apps/api/src/common/guards/roles.guard.ts`
- `docs/06-devops-deployment/runbooks/admin-role.md`

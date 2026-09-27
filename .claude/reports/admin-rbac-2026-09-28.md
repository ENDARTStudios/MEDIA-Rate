# BETA-GAP-03 / T119 — Administrador técnico (RBAC) sem depender de plano pago

**Data:** 2026-09-28 · **Branch:** `feat/t119-beta-gap-03-admin-rbac` (de `origin/main` `00503e6d`)
**Regra:** descoberta com evidência antes de codar; opção menos destrutiva.

## 1. Descoberta — o mecanismo JÁ EXISTE (Opção 1)

| Evidência | Arquivo/linha |
|---|---|
| Decorator de papel | `apps/api/src/common/decorators/roles.decorator.ts` |
| Guard de RBAC (403; papéis do banco a cada request, sem cache) | `apps/api/src/common/guards/roles.guard.ts:31-68` |
| Guard global registrado (ordem Auth→CSRF→Roles→Plan) | `apps/api/src/app.module.ts:100-109` |
| Modelo de papéis (`Papel`/`UsuarioPapel`, enum `USER/ADMIN/MODERADOR/CURATOR`) | `apps/api/prisma/schema.prisma:72-78,168-189` |
| Endpoints admin `@Roles('ADMIN')` | `admin.controller.ts` (`/admin/stats`, `/admin/sentry-test`), `diagnostics.controller.ts` |
| Registro cria apenas `USER` (sem autopromoção) | `auth.service.ts:137-170`; DTO sem `role` (`auth/dto/auth.dto.ts`) |
| Auditoria de ação admin | `admin.controller.ts` (`ADMIN_STATS_VIEWED` via `AuditLogService`) |
| Testes existentes | `rbac.spec.ts` (guard unit), `admin-stats.e2e.spec.ts` (com **guards fake**), `auth-guard.spec.ts` (401) |

**Decisão:** **Opção 1** — reutilizar o mecanismo existente; corrigir apenas as lacunas. **Sem schema novo, sem migration.**

## 2. Lacunas encontradas (corrigidas neste ciclo)

1. **Nenhum teste provava que admin independe de plano** (o e2e usava guards fake; o admin-fixture é PREMIUM). → novo `admin-rbac.spec.ts` com guards REAIS.
2. **UI `/admin` renderizava MOCK** para qualquer usuário logado (sem checar papel). → passa a consumir `GET /api/v1/admin/stats` real e mostra 401/403 honesto.
3. **Sem fixture FREE+ADMIN** para provar independência de plano. → `admin-free@mediarate.test` em `db:provision:test-users`.
4. **Sem CLI genérica** de promoção/remoção (só seed de teste). → `apps/api/prisma/set-role.ts` + `npm run db:set-role` (idempotente, anti-lockout, log sanitizado).

## 3. Mudanças

- `apps/api/test/admin-rbac.spec.ts` (novo) — guards reais: FREE+ADMIN→200; PREMIUM+ADMIN→200; PREMIUM sem ADMIN→403; comum→403; `@RequirePlan`→402 (eixo separado); registro não autopromove.
- `apps/api/prisma/provision-test-users.ts` — fixture `admin-free@mediarate.test` (FREE+ADMIN).
- `apps/api/prisma/set-role.ts` (novo) + `apps/api/package.json` (`db:set-role`).
- `apps/web/src/app/[locale]/admin/page.tsx` + `apps/web/src/components/admin/AdminOverview.tsx` (novo) — overview admin real, sem mock.
- Docs: `docs/05-security-compliance/RBAC.md`, `docs/06-devops-deployment/runbooks/admin-role.md`, `docs/04-api-integrations/API.md`, `docs/03-development-process/TESTING.md`, `docs/02-architecture-design/ARCHITECTURE.md`, `DECISOES.md` (D-559).

## 4. Testes (locais)

- `admin-rbac.spec.ts` 6/6; `rbac.spec.ts` 5/5; `admin-stats.e2e.spec.ts` 3/3 → **14/14**.
- `tsc -p apps/api` = 0; `tsc -p apps/web` = 0; eslint/prettier nos arquivos alterados = 0.

## 5. Critérios de aceitação (BETA-GAP-03)

1. Descoberta evidenciada — secções 1-2.
2. Admin independente de plano — teste FREE+ADMIN 200 / PREMIUM sem ADMIN 403.
3. RBAC enforced — 401 (anônimo, `auth-guard.spec`) / 403 (autenticado sem papel); UI não renderiza dados a não-admin; sem rota pública de atribuição.
4. Promoção segura — CLI interna; sem endpoint público; sem hardcode; log sanitizado.
5. Auditoria — `ADMIN_STATS_VIEWED` (actor id, ação, recurso, timestamp; sem PII).
6. Testes — ver §4.
7. Docs — §3.
8. Merge seguro — preencher no fechamento (PR/run/smoke).

## 6. PR / merge / smoke

_(preenchido após merge)_
- Commit da correção: `(a preencher)`
- PR: `(a preencher)` · merge commit: `(a preencher)`
- Required checks: `(a preencher)` · `123ce28e` ancestry: `(a preencher)`
- Smoke 7/7: `(a preencher)`

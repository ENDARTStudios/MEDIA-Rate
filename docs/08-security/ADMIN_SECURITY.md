# Política de segurança da Área de Administrador (ADMIN_SECURITY)

**Origem:** T201 (auditoria da superfície `/admin/lgpd` após relato do Operador, 2026-10-12).
Aplica-se a **qualquer** rota `/admin/*` (web) e `/api/v1/admin/*` (API), hoje e no futuro.

## Princípios (não negociáveis)

1. **Deny-by-default, server-side.** Nenhuma superfície administrativa pode existir para quem
   não é ADMIN. A autorização **sempre** acontece no servidor antes de qualquer renderização —
   "o botão está desabilitado/escondido" ou "a API recusa depois" **não** são proteção.
2. **Se não é admin, não vê nada.** Não-admin recebe redirect/403 genérico (sem detalhar o
   motivo); anônimo recebe login. Nenhum shell admin, aba, tabela, contador ou **controle
   destrutivo** pode aparecer no DOM de não-admin — estrutura e nomes de endpoint também são
   information disclosure (probing/confusão).
3. **Defesa em profundidade nas 3 camadas** — as três são obrigatórias, nenhuma substitui a
   outra:
   - **Edge (middleware):** rotas privadas exigem sessão (anônimo → login). Hoje `/admin` está
     em `privateRoutePrefixes`;
   - **Render (layout server component):** o layout de `/admin/*` valida **sessão + papel
     ADMIN** (mesma fonte do RolesGuard) **antes** de renderizar; não-admin → 403/redirect;
   - **API:** todo endpoint admin com `@Roles("ADMIN")` + guards globais
     `AuthGuard → CsrfGuard → RolesGuard → PlanGuard`; `RolesGuard` lê papéis do **banco por
     request** (revogação vale no request seguinte).

## Ações destrutivas (purge, ban, remoções, backfills)

Exigem **todas** as camadas: `ADMIN` (server-side) + **CSRF** (double-submit global) +
**audit log imutável** (ex.: `LGPD_USUARIO_PURGADO` "prova que aconteceu; sobrevive ao
delete") + validação Zod da entrada + resposta sem stack/PII. Recomendado (T202+):
**rate limit estrito específico de admin** e step-up (re-confirmar senha) nas ações
irreversíveis; MFA como follow-up estratégico.

## Estado atual (2026-10-12)

- ✅ API: `@Roles("ADMIN")` em todos os endpoints do `AdminController`; CSRF global; audit no
  purge e nas ações admin; `RolesGuard` banco-por-request.
- ✅ Web: **gate server-side implementado (T202)** — `admin/layout.tsx` valida sessão + papel
  `ADMIN` via `getServerAdminGate()` (probe ao endpoint `@Roles("ADMIN")`, fail-closed)
  **antes** de renderizar o `AdminShell`/páginas; não-admin recebe mensagem genérica
  (`admin.acessoNegado`) sem nenhuma superfície administrativa; anônimo vai para login;
  página LGPD com early-return na negação. Como re-verificar:
  `rg -n "getServerAdminGate" apps/web/src/app/[locale]/admin/layout.tsx` (gate presente) e
  specs `apps/web/test/admin-layout-auth.spec.tsx` / `admin-auth-server.spec.ts`.
- ✅ API: **rate limit admin específico (T203)** — `/api/v1/admin/*` leituras **60/min**
  (`RATE_LIMIT_ADMIN_PER_MIN`), destrutivas **10/min**
  (`RATE_LIMIT_ADMIN_DESTRUCTIVE_PER_MIN`), sliding window por sessão(hash)/IP+rota com
  fallback local; aplicado por `aplicarRateLimitAdmin` no hook `onRoute` (antes do registro
  do plugin — bug de ordem documentado no main.ts); **anti-probing sanitizado**: 403/429
  repetidos em rotas admin alimentam `AdminProbingMonitor` (hash de sessão — nunca IP/UA/
  token) e excedente loga `ADMIN_ACCESS_DENIED_REPEAT`/`ADMIN_RATE_LIMIT_EXCEEDED`. Como
  re-verificar: specs `apps/api/test/admin-rate-limit.e2e.spec.ts`,
  `admin-probing-monitor.spec.ts` e relatório
  `docs/08-security/reports/admin-rate-limit-hardening-2026-10-12.md`.
- ⏳ Pendente (T204 design produzido — **nada implementado**): step-up (Fase 1: re-auth de
  senha, janela curta), MFA (Fase 2: TOTP; Fase 3: WebAuthn) e refinamento do probe do gate
  (T206: endpoint dedicado `GET /api/v1/admin/gate`). Design completo:
  `docs/08-security/SECURITY_AUTH_DESIGN.md` +
  `docs/08-security/reports/admin-stepup-mfa-probe-refinement-design-2026-10-13.md`.
  Implementação só mediante autorização explícita (T205/T206, template de decisão no design).

## Como auditar (read-only)

`rg -n "@Roles" apps/api/src/modules/admin/admin.controller.ts` (todos os handlers),
`apps/api/src/app.module.ts` (ordem dos `APP_GUARD`), `apps/web/src/app/[locale]/admin/layout.tsx`
(validação server-side presente?) e o relatório
`docs/08-security/reports/admin-authz-surface-audit-2026-10-12.md`.

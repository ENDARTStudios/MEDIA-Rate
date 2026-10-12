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
- ❌ Web: layout/páginas `/admin/*` são `"use client"` **sem validação** — shell + botão
  destrutivo renderizam para qualquer autenticado (achado T201
  `ADMIN_UI_LEAK_SERVER_BOUNDARY_MISSING`). **Correção = T202** (layout server component
  validando ADMIN antes de renderizar + páginas com early-return no 403 + rate limit admin).

## Como auditar (read-only)

`rg -n "@Roles" apps/api/src/modules/admin/admin.controller.ts` (todos os handlers),
`apps/api/src/app.module.ts` (ordem dos `APP_GUARD`), `apps/web/src/app/[locale]/admin/layout.tsx`
(validação server-side presente?) e o relatório
`docs/08-security/reports/admin-authz-surface-audit-2026-10-12.md`.

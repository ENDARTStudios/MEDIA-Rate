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
delete") + validação Zod da entrada + resposta sem stack/PII + **rate limit estrito
específico de admin (T203)** + **step-up por re-auth de senha (T205 Fase 1)**. MFA
(TOTP/WebAuthn) permanece como follow-up estratégico.

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
- ✅ **Probe dedicado (T206)** — `GET /api/v1/admin/gate` (`@Roles("ADMIN")`, payload mínimo
  `{ok:true}`, rate limit de leitura); probe do frontend usa-o como **primário** com
  **fallback automático** ao probe antigo apenas em 404; 403 é negação explícita (sem
  fallback); fail-closed em erro/timeout. Como re-verificar: specs
  `apps/api/test/admin-gate.spec.ts` / `apps/web/test/admin-auth-server.spec.ts` e relatório
  `docs/08-security/reports/admin-gate-probe-refinement-2026-10-13.md`.
- ✅ **Step-up por re-auth de senha (T205 Fase 1)** — `POST /api/v1/admin/step-up`
  (`@Roles("ADMIN")`, reusa `PasswordService.verify` — **não modificado**) concede uma
  **marca TTL** (default 900 s, `ADMIN_STEPUP_TTL_SECONDS`) no `CacheService` compartilhado,
  chave `admin:stepup:<sha256(sessao_id)[:32]>`. `AdminStepUpGuard` (aplicado à **classe**
  de `AdminController`/`FeatureFlagsController`/`AssetUploadController`) exige a marca em
  **toda** rota mutante admin, respondendo **428** `{code:"ADMIN_STEPUP_REQUIRED"}` quando
  ausente/inválida — **fail-closed** (erro de storage → nega). Senha errada → 401 genérico +
  audit `ADMIN_STEPUP_FAIL` + anti-probing `STEPUP_FAIL`; sucesso → `ADMIN_STEPUP_SUCCESS`.
  Rollback sem deploy: `ADMIN_STEPUP_REQUIRED=0`. Web: wrapper `comStepUp` + diálogo no
  layout admin. Como re-verificar: specs `apps/api/test/admin-stepup*.spec.ts` e
  `apps/web/test/admin-stepup-*.spec.ts*` e relatório
  `docs/08-security/reports/admin-stepup-fase1-2026-10-13.md`.
- ⏳ Pendente parcialmente: **T205 Fase 1 IMPLEMENTADA (2026-10-13)** — ver bullet acima.
  Seguem pendentes: MFA (Fase 2: TOTP; Fase 3: WebAuthn) e timeout de sessão admin.
  Design completo: `docs/08-security/SECURITY_AUTH_DESIGN.md` +
  `docs/08-security/reports/admin-stepup-mfa-probe-refinement-design-2026-10-13.md`.
- ✅ **Incidente INC-2026-10-11** — encerrado formalmente com **risco residual aceito, sem purge**
  (T210, 2026-10-13, `CLOSED_RISK_ACCEPTED_NO_PURGE`); a frente admin (T201–T206 + T205 Fase 1)
  faz parte do pacote de hardening consolidado nesse encerramento.
  Relatório: `docs/08-security/reports/incident-2026-10-11-formal-closure-risk-acceptance-2026-10-13.md`.

## Governança do kill-switch `ADMIN_STEPUP_REQUIRED=0` (mudança sensível)

O kill-switch do step-up **não é uma feature flag inocente**: desligá-lo remove a exigência de
re-auth de senha nas ações destrutivas admin. Política mínima:

- **default:** habilitado (step-up **exigido**);
- **desabilitar:** apenas por **decisão operacional explícita**, documentada;
- **registro:** worklog / mudança sensível, com **janela curta**;
- **monitoramento:** picos de `ADMIN_STEPUP_FAIL` e ações destrutivas admin **sem** step-up;
- **reativação:** imediata após a contingência.

Além disso, **todo novo endpoint admin mutante** deve herdar o `AdminStepUpGuard` (ou ser
explicitamente classificado como não destrutivo, com justificativa revisada); a **metadata spec**
deve continuar falhando quando uma rota mutante admin não estiver coberta.

## Dados, backups e segredos (política)

- **Backup contém dados pessoais** (contas, sessões, consentimentos, auditoria) → tratado como
  **artefato de dado pessoal**: destino **privado e cifrado**, **least privilege**, retenção definida,
  **logs sanitizados** e procedimento de exclusão/purga alinhado ao fluxo LGPD (admin-only).
- **Backup nunca loga** `DATABASE_URL`, senha, token, cookie ou connection string — apenas **nomes** de
  variáveis. O alerta de falha de backup reporta **estado/idade**, nunca credencial, path ou PII.
- **Restore de ensaio** só em **ambiente efêmero/staging/local seguro** — **nunca produção** —, com
  validação por **contagens agregadas** (sem listar PII) e integridade da cadeia SHA-256 do `audit_log`.
- **Design e decisão pendentes:** `docs/08-security/reports/backup-operational-readiness-design-2026-10-13.md`
  (opções A–E, política de destino/segredos/PII, alerta, drill, RPO/RTO). **Nada implementado.**

## Como auditar (read-only)

`rg -n "@Roles" apps/api/src/modules/admin/admin.controller.ts` (todos os handlers),
`apps/api/src/app.module.ts` (ordem dos `APP_GUARD`), `apps/web/src/app/[locale]/admin/layout.tsx`
(validação server-side presente?) e o relatório
`docs/08-security/reports/admin-authz-surface-audit-2026-10-12.md`.

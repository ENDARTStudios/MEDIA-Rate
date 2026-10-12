# T205 Fase 1 — step-up por re-auth de senha em ações administrativas destrutivas

**Data:** 2026-10-13 · **Autorizada por:** Operador (pacote `DECISAO_OPERADOR_ADMIN_STEPUP_MFA`
— "Autorizado", interpretado conservadoramente: **somente T206 + T205 Fase 1**).
**Base do design:** `docs/08-security/reports/admin-stepup-mfa-probe-refinement-design-2026-10-13.md`
§5 · Doc vivo: `docs/08-security/ADMIN_SECURITY.md`, `docs/08-security/SECURITY_AUTH_DESIGN.md`.

**Escopo executado:** Fase 1 (step-up por senha). **NÃO** implementado: TOTP, WebAuthn,
passkeys, backup codes, MFA obrigatório, IP allowlist, device binding, timeout de sessão
admin. Nenhuma alteração de auth core/schema/migrations/dependências/infra.

## O que foi entregue

### API — step-up (reuso do `PasswordService` existente, **não modificado**)

| Arquivo | Papel |
|---|---|
| `apps/api/src/modules/admin/admin-stepup.service.ts` | `stepUp(usuarioId, sessaoId, senha)`: carrega `password_hash`, chama `PasswordService.verify` (argon2id+pepper); em sucesso grava **marca TTL** no `CacheService`; `temMarca(sessaoId)` **fail-closed** (erro/storage → `false`); `marcar(sessaoId)`. |
| `apps/api/src/modules/admin/admin-stepup.guard.ts` | `AdminStepUpGuard` (classe) — método mutante em `/api/v1/admin/*` sem marca válida → **HTTP 428** `{code:"ADMIN_STEPUP_REQUIRED"}`; GET/HEAD/OPTIONS e o próprio `/admin/step-up` liberados; kill-switch `ADMIN_STEPUP_REQUIRED=0`. |
| `apps/api/src/modules/admin/admin-stepup.controller.ts` | `POST /api/v1/admin/step-up` (`@Roles("ADMIN")`, Zod `{senha}`): valida a senha; erro → **401 sanitizado** ("Credencial inválida.") + `AuditLog` `ADMIN_STEPUP_FAIL` + anti-probing `STEPUP_FAIL`; sucesso → `{ok:true, expiresIn}` + `AuditLog` `ADMIN_STEPUP_SUCCESS`. Nunca loga/retorna senha ou hash. |
| `apps/api/src/modules/admin/admin-stepup.module.ts` | `@Global()` — fornece/exporta `AdminStepUpService`+`AdminStepUpGuard`; monta o controller. Importado no `AppModule`. |
| `apps/api/src/common/rate-limit.config.ts` | Caso especial: `POST /api/v1/admin/step-up` → **6/min** (`RATE_LIMIT_ADMIN_STEPUP_PER_MIN`), com `resposta429Padrao`. |
| `apps/api/src/common/admin-probing-monitor.ts` | `NegacaoAdmin` estendido com `"STEPUP_FAIL"`. |

**Guard aplicado à CLASSE** de `AdminController`, `FeatureFlagsController` e
`AssetUploadController` (toda rota mutante admin). O guard roda **depois** da cadeia global
`Auth → CSRF → Roles → Plan`: 401/403/CSRF acontecem antes do 428. `AdminStepupModule` foi
adicionado aos `imports` de `AdminModule`, `FeatureFlagsModule` e `UploadModule` para que o
guard resolva a dependência também em TestModules isolados (o `@Global` sozinho só vale se o
módulo estiver no grafo).

**Marca TTL:** chave `admin:stepup:<sha256(sessaoId)[:32]>`, TTL default **900 s**
(`ADMIN_STEPUP_TTL_SECONDS`). O store é o `CacheService` compartilhado (`@Global`, Redis com
fallback local) — satisfaz o requisito de store distribuído da Fase 1, **sem** infra nova.

### Web

| Arquivo | Papel |
|---|---|
| `apps/web/src/lib/admin-stepup-client.ts` | `comStepUp(op)`: executa a operação; se a API responder **428**, dispara o evento `admin:stepup-required`, aguarda a senha e faz **um** retry; cancelamento propaga o erro original. |
| `apps/web/src/components/admin/AdminStepUpDialog.tsx` | Diálogo (client): label associado, foco inicial, `Escape` cancela, `aria-live` no erro, botões desabilitados durante a chamada; a senha vive só no estado efêmero do input (nunca em storage/log). |
| `apps/web/src/app/[locale]/admin/layout.tsx` | Monta `<AdminStepUpDialog />` **após** o gate ADMIN (só existe para ADMIN). |
| 4 páginas admin (`lgpd`, `usuarios`, `catalogo`, `diagnostics`) | Ações destrutivas embrulhadas em `comStepUp`. |
| `messages/{pt-BR,en-US,es-ES}.json` | Chaves `admin.stepup{Titulo,Label,Confirmar,Cancelar,Erro}` nos 3 locales. |

## Evidência

- **API** `NODE_ENV=test npx vitest run`: **168/168 arquivos, 1422/1422 testes**.
- **Web** `NODE_ENV=test npx vitest run`: **89/89 arquivos, 607/607 testes**.
- **TDD:** `admin-stepup.service.spec.ts` (8), `admin-stepup.spec.ts` (7),
  `admin-stepup-guard.spec.ts` (8) [API]; `admin-stepup-client.spec.ts` (5),
  `admin-stepup-dialog.spec.tsx` (5) [web].
- `tsc --noEmit` API **0** e web **0**; `eslint` **0** nos arquivos tocados.
- **Adaptação de spec pré-existente:** `apps/api/test/sentry-e2e.spec.ts` montava o
  `AdminController` real num TestModule pelado; passou a neutralizar o guard com
  `overrideGuard(AdminStepUpGuard)` (a classe agora tem guard de classe) — sem perda de
  cobertura do alvo (filtro de exceção/Sentry).

## Garantias

- **Fail-closed:** ausência de marca, erro de storage ou ausência de sessão → 428 (nunca
  libera a ação destrutiva).
- **Sem vazamento:** 401 genérico; audit com `{entidade, entidadeId, acao, usuarioId}`;
  anti-probing por **hash de sessão** (nunca IP/UA/token/senha).
- **Rollback:** `ADMIN_STEPUP_REQUIRED=0` desliga o guard sem deploy de código.
- **Sem mudanças proibidas:** `AuthGuard`/`RolesGuard`/`CsrfGuard`/`PlanGuard`,
  `PasswordService`, sessão/cookies/tokens, schema, migrations, `package.json` e infra —
  **intactos**.

## Pendente / fora de escopo (não executar sem novo packet)

- Remoção do *fallback* do probe antigo (T206 → tarefa futura).
- TOTP (Fase 2) e WebAuthn (Fase 3) — exigem migration/enrollment/backup codes.
- Timeout de sessão admin (idle/absolute) e revogação total em mudança de role.
- **GO para convites: continua SUSPENSO** (declaração formal explícita do Operador).

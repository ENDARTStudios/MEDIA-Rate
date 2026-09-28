# T133 — Audit logging de auth (Fase 3.7) — descoberta + decisão

**Data:** 2026-09-28 · **Branch:** `feat/t133-auth-audit-wiring` (base `3058ceb7`)
**Tipo:** discovery-first. Sem alteração de código de produto.

## 1. Estado real da Fase 3.7 (não confiei no checkbox)

`PLANO_MESTRE.md:115` — `[x] 3.7 Audit logging para auth (T213)`. **Verifiquei no código
e nos testes: o wiring é real e completo.**

## 2. Evidência de código — `apps/api/src/modules/auth/auth.service.ts` (+ email-verification)

| Evento | Linha |
|---|---|
| `USER_REGISTERED` | `auth.service.ts:181` |
| `EMAIL_VERIFICATION_SENT` | `:196` |
| `USER_LOGIN_FAILED` (`motivo: invalid_credentials`) | `:248` |
| `USER_LOGIN_FAILED` (`motivo: email_not_verified`) | `:284` |
| `USER_LOGIN_SUCCESS` | `:324` |
| `USER_LOGIN_SOCIAL` | `:411` |
| `TOKEN_REFRESH_REUSE_DETECTED` / `SESSION_REVOKED_ALL` | `:456` / `:463` |
| `TOKEN_REFRESHED` | `:479` |
| `PASSWORD_RESET_REQUESTED` / `PASSWORD_RESET_COMPLETED` | `:522` / `:580` |
| `USER_LOGOUT` | `:613` |
| `EMAIL_VERIFIED` / `EMAIL_VERIFICATION_RESENT` | `email-verification.service.ts:100` / `:130` |

## 3. PII / sanitização (D-545 — T055)

`AuditLogService.log()` aplica `sanitizarPii`/`mascararIpInet` na **persistência**
(`common/audit-log.service.ts:63-78`): chaves de e-mail → `mascararEmail`; IP `@db.Inet`
→ rede coarsenada; chaves sensíveis (`user_agent`, `senha`, `token`, `cookie`, …) →
`[Redacted]`. A resposta de login **não** revela existência de conta (`Credenciais
inválidas` genérico). ⇒ **Sem SECURITY_FINDING** no escopo da 3.7.

## 4. Testes (evidência)

`apps/api/test/auth-audit.spec.ts` (T213): `USER_REGISTERED`, `USER_LOGIN_SUCCESS`,
`USER_LOGIN_FAILED` (senha/inexistente), `USER_LOGOUT`, `PASSWORD_RESET_REQUESTED/COMPLETED`,
`TOKEN_REFRESH_REUSE_DETECTED`+`SESSION_REVOKED_ALL` — com asserções de que **senha** e
**token** nunca aparecem no payload. **23/23 verdes** (`auth-audit.spec` + `auth-service.spec`).

## 5. Decisão

**Fase 3.7 = coberta** (eventos + testes + minimização de PII). **Desfecho: DONE sem
alteração de código**, com **docs-only enrichment** da linha 3.7 do `PLANO_MESTRE.md`
(adicionada a evidência T213/T133 + D-545). Não abri PR vazio: a mudança é o
enriquecimento de evidência + este relatório.

## 6. Follow-up registrado (NEEDS_OPERATOR_DECISION)

`AuditLogService.log()` **propaga** erro de DB; `auth.service` usa `await this.auditLog.log(...)`
sem `catch` → **política fail-closed** (falha de auditoria derruba a operação de auth).
Isso **não** é parte da definição da 3.7 e mudá-lo altera semântica de segurança/auth
(não alterei nesta tarefa, conforme "não alterar comportamento de auth").
**Recomendação:** decisão explícita (ADR) fail-open (não bloqueante + log sanitizado de
erro) **vs** fail-closed — registrado em `PENDENCIAS_OPERADOR.md`.

## 7. PR / merge

- Commit: `(a preencher)` · PR: `(a preencher)` · base `3058ceb7`.

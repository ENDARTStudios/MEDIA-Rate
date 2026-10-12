# Arquitetura de autenticação/autorização admin — estado e roadmap (SECURITY_AUTH_DESIGN)

**Última atualização:** 2026-10-13 (T204 — design docs-only; **nada implementado além do
listado como existente**) · Design completo:
`docs/08-security/reports/admin-stepup-mfa-probe-refinement-design-2026-10-13.md`
**GO para convites: SUSPENSO** (decisão formal do Operador).

## Implementado (verificado, T201–T203)

1. **Gate server-side do render** — `admin/layout.tsx` valida sessão + papel ADMIN via
   `getServerAdminGate()` (probe fail-closed ao endpoint `@Roles("ADMIN")`) antes de
   qualquer HTML administrativo; não-admin → mensagem genérica; anônimo → login.
2. **Autorização API** — `@Roles("ADMIN")` em todos os endpoints do `AdminController`;
   guards globais **Auth → CSRF → Roles → Plan**; `RolesGuard` lê papéis do **banco por
   request**.
3. **Rate limit admin** — leituras 60/min, destrutivas 10/min (env-configurável), sliding
   window por sessão-hash/IP+rota; aplicado por `aplicarRateLimitAdmin` (hook `onRoute`
   **antes** do registro do plugin — bug de ordem).
4. **Anti-probing sanitizado** — `AdminProbingMonitor`: 403/429 repetidos por hash de sessão
   (+rota+tipo); logs `ADMIN_ACCESS_DENIED_REPEAT`/`ADMIN_RATE_LIMIT_EXCEEDED` (sem IP/UA/token).
5. **Audit** — toda ação destrutiva grava trilha imutável (hash de cadeia).

## Roadmap proposto (NÃO implementado — exige autorização)

| Fase | O quê | Packet |
|---|---|---|
| **T206** | **Probe dedicado**: `GET /api/v1/admin/gate` (`@Roles("ADMIN")`, `{ok:true}` apenas) substituindo o probe atual em `/admin/backfills/status` — com fallback automático ao probe antigo | design §4 |
| **T205-Fase 1** | **Step-up por re-auth de senha**: `POST /api/v1/admin/step-up` (reusa `PasswordService.verify` argon2id+pepper); janela curta (15 min default); todas as destrutivas exigem a marca; flag de feature p/ rollback | design §5 |
| **T205-Fase 2** | **TOTP** para destrutivas (enrollment + backup codes obrigatórios; migration) | design §5 |
| **T205-Fase 3** | **WebAuthn/passkeys** (futuro) | design §5 |
| Transversal | Sessão ADMIN: idle/absolute timeout curtos; revogação total em mudança de role | design §5 |

**Critérios de não-aceite** (rejeitam qualquer proposta): bypass client-side; log de PII;
MFA sem recuperação segura; step-up que não cubra todas as destrutivas; endpoint admin sem
RolesGuard; dependência nova sem aprovação; mudança de auth core sem packet.

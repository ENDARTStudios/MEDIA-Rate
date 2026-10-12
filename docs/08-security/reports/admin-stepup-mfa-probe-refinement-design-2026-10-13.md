# Design — Step-up/MFA admin e refinamento do probe do gate (T204)

**Data:** 2026-10-13 · **Fase:** F08-tests-security · **Tarefa:** T204-admin-stepup-mfa-probe-refinement-design
**Natureza:** **docs-only / read-only — NADA foi implementado.** Este documento é a base de
decisão para a eventual **T205** (implementação step-up/MFA) e **T206** (refinamento do probe),
mediante autorização explícita do Operador (template no §8). **GO permanece SUSPENSO.**

## 1. Sumário executivo

A área admin está protegida hoje por: gate server-side fail-closed no render (T202), `@Roles`
no banco por request + ordem Auth→CSRF→Roles→Plan (API), rate limit 60/10 min por
sessão-hash/IP+rota, anti-probing por hash de sessão, CSRF global e audit em toda ação
destrutiva (T201–T203). O que falta é **evolução de arquitetura**, não correção:

1. **Step-up/MFA** para ações destrutivas (hoje: ADMIN+CSRF+rate limit+audit);
2. **Refinamento do probe** do gate (hoje acoplado a `GET /admin/backfills/status`).

Recomendações: **Opção B** (endpoint dedicado `GET /api/v1/admin/gate`) como evolução do
probe, com a Opção A (probe atual) como fallback de compatibilidade; e **Fase 1**
(step-up por re-auth de senha com janela curta) como primeiro incremento de step-up — ambas
**sem dependência nova e sem mudança profunda de auth core**. TOTP (Fase 2) e WebAuthn
(Fase 3) vêm depois, cada qual com packet próprio e plano de recuperação obrigatório.

## 2. Estado real (verificado em código, 2026-10-12/13)

| Controle | Onde | Estado |
|---|---|---|
| Gate server-side do render | `apps/web/src/lib/admin-auth-server.ts` + `admin/layout.tsx` | ✅ fail-closed, probe a `@Roles("ADMIN")` |
| Autorização API | `AdminController` (`@Roles("ADMIN")` em todos) + `RolesGuard` (banco por request) | ✅ |
| Ordem de guards | `app.module.ts`: Auth → CSRF → Roles → Plan | ✅ |
| CSRF | `CsrfGuard` global (double-submit) | ✅ |
| Rate limit admin | `rate-limit.config.ts`: leituras 60/min, destrutivas 10/min (T203) | ✅ |
| Anti-probing | `AdminProbingMonitor` (403/429 repetidos, hash de sessão) | ✅ |
| Audit destrutivas | `LGPD_USUARIO_PURGADO`, `ADMIN_USUARIO_BANIDO`, `ADMIN_PLANO_ALTERADO`, `ADMIN_MODERACAO_*` | ✅ |
| Senha | `PasswordService.verify` — **argon2id + pepper** (reutilizável para step-up) | ✅ base pronta |
| Sessão | token opaco (sha256 no banco), refresh rotativo com **família de rotação** (reuse revoga tudo), `revoked_at` | ✅ |
| Feature flags | `feature-flags.service` + toggle no diagnostics | ✅ mecanismo de rollout |
| **Step-up** | — | ❌ não existe |
| **MFA (TOTP/WebAuthn)** | — | ❌ não existe |
| Probe dedicado | probe hoje = `GET /admin/backfills/status` | ⚠️ acoplado a endpoint de backoffice |

## 3. Threat model (STRIDE — área admin)

| Ameaça | Cenário | Controle atual | Gap residual |
|---|---|---|---|
| **Spoofing** | Sessão admin roubada (cookie vazado/malware na máquina do Operador) → atacante usa a área admin como o legítimo | Token opaco revogável; revogação em massa possível; rate limit; CSRF | **Sem step-up**: destrutivas são executáveis com a sessão roubada dentro do rate limit → Fase 1/2 mitigam |
| **Tampering** | Alteração de role/purge/ban/plano/moderação/backfill | RolesGuard banco-por-request; audit imutável (hash cadeia); CSRF | Coberto para execução; step-up adiciona fricção pós-roubo |
| **Repudiation** | Ação admin sem trilha suficiente | Audit em toda destrutiva; `ADMIN_ACCESS_DENIED_REPEAT`/`ADMIN_RATE_LIMIT_EXCEEDED` (T203) | Step-up/MFA exigem **novos eventos** (§7) |
| **Information Disclosure** | Shell/endpoints/contadores para não-admin; PII em logs | T202 (não-admin vê só mensagem genérica); monitor por hash; 429/403 sanitizados | Coberto; flag admin em `/auth/me` (Opção C) **aumentaria** superfície — evitada |
| **Denial of Service** | Probing/brute force; rate limit bloqueando ADMIN legítimo | 60/10 min + anti-probing; env-configurável (sem redeploy) | Fase 1 adiciona fricção só na destrutiva; janela de step-up evita re-pedido constante |
| **Elevation of Privilege** | Não-admin obtendo acesso visual/funcional; endpoint admin sem RolesGuard; gate bypass | T202/T203; probe fail-closed | Coberto; Opção D (validação web→banco) **proibida** — quebraria boundary |

## 4. Refinamento do probe do gate — opções comparadas

| Opção | Descrição | Prós | Contras | Veredito |
|---|---|---|---|---|
| **A (atual)** | Probe `GET /admin/backfills/status` (`@Roles("ADMIN")`) | Zero mudança; fail-closed; rate-limited | Acoplamento semântico a backoffice; se o endpoint mudar/sumir, o gate degrada (fail-closed → admin legítimo perde acesso) | **Fallback de compatibilidade** |
| **B (recomendada)** | Endpoint dedicado `GET /api/v1/admin/gate` — `@Roles("ADMIN")`, handler síncrono, retorna só `{ ok: true }` (200/403; **nunca** papel nem detalhe) | Semântica clara; barato; testável; sem acoplamento; rate limit admin de leitura já o cobre via `aplicarRateLimitAdmin` | Mudança de API (rota nova); exige os mesmos guards (herdados do módulo) | **Recomendada — T206** |
| C | `isAdmin` em `/auth/me` | Simples p/ frontend | Amplia informação p/ QUALQUER autenticado; cache/invalidação; vaza papel se mal feito | Rejeitada (superfície↑) |
| D | Web valida direto no banco | — | Quebra boundary web↔API; duplica auth | **Proibida** |
| E | Token/claim temporário de gate | Menos probes | Complexidade + revogação + nova superfície de token | Rejeitada para o porte atual |

**Estratégia:** T206 implementa a Opção B e troca o probe do `admin-auth-server.ts`
(1 linha: URL do probe), **mantendo a Opção A como fallback automático** (404 do gate novo →
probe antigo), com removida a fallback numa release seguinte. Sem dependência nova.

## 5. Step-up/MFA — roadmap faseado

### Fase 0 — já implementado (T202/T203)
ADMIN + CSRF global + rate limit destrutivo 10/min + audit + gate server-side fail-closed +
anti-probing. **Nenhuma ação.**

### Fase 1 — step-up por re-auth de senha (recomendada; T205)
- **Gatilho:** qualquer `POST/PATCH/DELETE` em `/api/v1/admin/*` destrutiva (purge, ban/
  desbanir, plano, moderação, backfills, upload de asset) exige step-up válido.
- **Mecanismo (sem auth core novo):** `POST /api/v1/admin/step-up { senha }` →
  `PasswordService.verify` (argon2id+pepper, já existe) → marca a sessão como
  "step-up recente" (janela curta, **default 15 min**, env-configurável). As rotas destrutivas
  passam a exigir a marca (guard dedicado no AdminController, **após** Roles/CSRF).
- **UX:** o painel pede a senha uma vez a cada janela ao executar a primeira destrutiva; erros
  genéricos ("Credencial inválida."), rate limit próprio (6/min), audit
  `ADMIN_STEPUP_SUCCESS`/`ADMIN_STEPUP_FAIL` (hash de sessão, sem PII), e falhas repetidas
  alimentam o `AdminProbingMonitor`.
- **Sem dependência nova**; sem schema novo (marca pode viver em memória/Redis da sessão com
  TTL — decidir na T205; persistência em `Sessao` seria migration → packet separado).
- **Critérios de aceite:** todas as destrutivas exigem marca; expiração respeitada; falha não
  revela se a senha ou o papel falhou; ADMIN legítimo não é bloqueado (fluxo de re-pedido
  claro); audit completo; flag de feature para rollback imediato.
- **Riscos:** bloqueio do Operador (mitigação: a própria senha dele; sem lockout agressivo —
  entra no anti-probing existente).

### Fase 2 — TOTP (após Fase 1 estável; packet próprio)
- Enrollment opt-in do ADMIN → obrigatório para destrutivas; **backup codes** impressos no
  enrollment (uso único, hash no banco — **migration**); revogação exige step-up + código de
  recuperação; recuperação sem backdoor: backup codes + re-enrollment autenticado + suporte
  humano verificado (procedimento documentado, auditado).
- Dependências: lib TOTP (RFC 6238) **ou** implementação própria com `node:crypto` (HMAC-SHA1,
  30s, ±1 janela) — avaliar na T205+; QR no painel.
- Riscos: lockout sem backup codes → **não-aceite**; clock skew; UX de enrollment.

### Fase 3 — WebAuthn/passkeys (futuro)
- Melhor segurança/UX, porém exige: suporte de navegador/dispositivo, registro/credenciais,
  recuperação e fallback (sem backdoor) — design separado quando a base TOTP estiver madura.

### Opcional (avaliar com critério)
IP allowlist admin, geonegativa, device hash sanitizado, sessão admin isolada — risco de
falsos positivos (Operador em roteamento móvel) e de PII; só com decisão explícita.

**Política de sessão admin (transversal):** revogação de todas as sessões em mudança de role
(já viável — memória da Onda 1); recomenda-se avaliar idle/absolute timeout curtos para
sessões ADMIN e revogação em step-up falho repetido (anti-probing já detecta).

## 6. Auditoria e privacidade (eventos mínimos)

`ADMIN_STEPUP_SUCCESS` · `ADMIN_STEPUP_FAIL` · `ADMIN_MFA_ENROLLED` · `ADMIN_MFA_FAIL` ·
`ADMIN_MFA_REVOKED` · `ADMIN_BACKUP_CODE_USED` · `ADMIN_GATE_PROBE_FAIL` (opcional) — todos
com **hash de sessão/ID interno + contagem/janela; nunca IP real, user-agent completo,
e-mail, token ou cookie** (padrão T203). Retenção igual ao audit atual.

## 7. Plano de testes (das implementações futuras)

- **Unit:** step-up service (verify/expiração/rate); gate endpoint; MFA enroll/verify/backup
  codes; revogação.
- **Integration:** toda destrutiva exige step-up válido; ordem Auth→CSRF→Roles→**StepUp**;
  429 sanitizado; flag off = comportamento atual.
- **E2E:** não-admin não vê nada (T202); ADMIN passa step-up e executa; burst → 429; step-up
  falho repetido → audit/anti-probing; rollback da flag restaura UX atual.
- **Security:** CSRF, replay, session fixation, escalada, vazamento em logs.
- **UX/a11y:** mensagens genéricas; recuperação clara.

## 8. Rollout, rollback e não-aceites

**Rollout:** feature flag existente (off por default) → staging/local → produção com o ADMIN
único como canário → obrigatório após estabilizar. **Rollback:** flag off restaura o
comportamento T202/T203 sem quebrar admin legítimo (step-up vira no-op).
**Critérios de não-aceite (qualquer um rejeita a proposta):** bypass client-side; log de PII;
MFA sem recuperação segura; step-up que não cubra TODAS as destrutivas; endpoint admin sem
RolesGuard; dependência nova sem aprovação; mudança de auth core sem packet; gate que bloqueie
o ADMIN legítimo sem procedimento documentado.

## 9. Template de decisão do Operador

```
DECISAO_OPERADOR_ADMIN_STEPUP_MFA_2026-10-13
T206_PROBE_GATE   = [AUTORIZAR_OP_B | MANTER_OP_A | ADIAR]
T205_FASE1_STEPUP = [AUTORIZAR_IMPL | ADIAR]
T205_FASE2_TOTP   = [AUTORIZAR_DESIGN_DETALHADO | ADIAR]
T205_FASE3_WEBAUTHN = [ADIAR | AVALIAR_FUTURO]
SESSAO_ADMIN_TIMEOUT = [AVALIAR_CURTOS | MANTER]
OBSERVACOES = [sem valores de segredo]
```

## 10. Confirmações

**Nada foi implementado** — nenhum código, auth core, dependência, infra, produção, alerta ou
config alterados (diff docs-only). Nenhum segredo/PII impresso. GO **não declarado** e
permanece SUSPENSO. Contaminação `123ce28e` ausente; PR docs-only com gates verdes e smoke
passivo 7/7 (STATUS).

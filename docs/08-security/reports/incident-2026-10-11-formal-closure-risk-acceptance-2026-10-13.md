# Encerramento formal do incidente INC-2026-10-11 — risco residual aceito, sem purge (T210)

**Data:** 2026-10-13 · **Fase:** F08-tests-security · **Tarefa:** T210
**Incidente:** `INC-2026-10-11` — exposição histórica de padrão de credencial em repositório público
**Classificação final:** **`CLOSED_RISK_ACCEPTED_NO_PURGE`**
**Base do SHA:** `9e32e5ae` (último merge na `main`) · **Docs-only/read-only** — nada de código,
schema, dependências, infra, produção, alertas, GitHub settings, backups, purge ou GO foi tocado.

> **Sanitização:** apenas metadados, contagens, estados, ids de run e nomes de job. Nenhum valor de
> segredo/PII/token/cookie/sessão/IP real/user-agent real/hash de senha/corpo de alerta é impresso.

---

## 1. Sumário executivo

O incidente `INC-2026-10-11` está **encerrado formalmente com risco residual aceito pelo Operador**.
A mitigação foi **efetiva e verificada**, não houve evidência de uso não autorizado, e a **purge de
histórico não foi executada nem autorizada** — a rotação das credenciais conhecidas é a mitigação
efetiva, e o **aceite de risco** substitui a reescrita de histórico.

> Encerrar documentalmente **não** libera GO. **GO para convites permanece SUSPENSO** (§8).

---

## 2. Origem e classe do incidente

| Item | Registro (sanitizado) |
|---|---|
| ID | `INC-2026-10-11` |
| Detecção | Docs Gate (secret scan) bloqueou a PR #512 em 2026-10-10 |
| Causa raiz | `git add -f` forçou `.claude/exchange_log.jsonl` (ignorado pelo `.gitignore`) para o commit `1e7801f3`, **alcançável da `main`**; removido no commit seguinte (`5679cda4`) |
| Agravantes à época | repositório **público**; secret scanning/push protection **desabilitados**; conteúdo visível no diff da PR enquanto aberta |
| Classe | `SECRET_PATTERN_EXPOSURE_CONFIRMED_IN_PUBLIC_HISTORY` — severidade **ALTA** |
| Conteúdo do blob (caracterizado sem valores, T183) | fragmento no formato de chave Stripe live (mascarado) e 1 valor CSRF efêmero; `ADMIN_TOKEN`/`DATABASE_URL`/`SENTRY`/`TMDB` apenas como **nomes sem valores**; e-mails somente de domínio de teste |

**Evidência primária:** `docs/08-security/SECURITY_INCIDENTS.md` §INC-2026-10-11 ·
`.claude/reports/secret-incident-exchange-log-2026-10-10.md` (local, gitignored).

---

## 3. Remediação e verificação (evidências consolidadas)

### 3.1 Rotação/neutralização de credenciais (Operador)

- **Fontes de metadados (2026-10-10):** TMDB, IGDB, Twitch e Comic Vine — **rotacionadas**.
- **Stripe (2026-10-11):** chave **live** + **webhook secret** — **rotacionadas**.
- Nenhuma credencial exposta permanece válida conforme o registro de remediação
  (`.claude/reports/incident-remediation-2026-10-11.md`).

### 3.2 Contas sintéticas `@mediarate.test` (T184) e reconciliação (T200)

- **T184 (2026-10-11):** senha invalidada (7), **sessões revogadas (119)**, papel **ADMIN revogado (1)**
  — **sem delete físico** de contas. Papel ADMIN nunca mais concedido fora de ambiente local;
  workflow gera senha efêmera em runtime; fallback público de senha removido do provisionamento.
- **T200 (2026-10-12, read-only):** reconciliação em produção confirmou **7 contas `@mediarate.test`
  = `USER` ×7, 0 ADMIN, 0 sessões ativas, 0 atividade pós-remediação** (último evento 2026-10-05;
  25 logins pré / **0 pós** o corte de 2026-10-11). O único ADMIN de produção é a conta legítima do
  Operador (D-563), **fora** do domínio de teste. Probes agregados via `railway ssh` (somente
  `count`/`groupBy`, sem PII).
  Relatório: `docs/08-security/reports/synthetic-admin-reconciliation-2026-10-12.md`.

### 3.3 Ausência de uso não autorizado

- Varredura sanitizada (T183): `NO_NEW_EXPOSURE_IN_HEAD — ADDITIONAL_HISTORICAL_ARTIFACTS_FOUND`;
  **sem novos padrões de alta confiança** em HEAD/histórico.
- **0 eventos de auditoria** envolvendo as contas de teste na janela de exposição (T184) e
  **0 atividade pós-remediação** (T200).
- CI: 10/10 execuções sem match de segredo (T183/T186).

### 3.4 Proteção de segredos e CI

| Controle | Estado (verificado) | Evidência |
|---|---|---|
| Secret scanning | **ATIVO — 0 alertas** | `.claude/reports/incident-closure-verification-2026-10-12.md` |
| Push protection | **ATIVO** | idem (metadados `security_and_analysis`) |
| Gitleaks (gate do tree) | **padrão bloqueador do CI**, verde | job `Gitleaks (segredos — tree atual)`; `docs/08-security/SECURITY_CI.md` (T186/D-578) |
| Dependabot security updates | habilitado | idem |
| Visibilidade do repositório | **PÚBLICO** por decisão do Operador (2026-10-11) | `gh repo view` → `visibility=PUBLIC`, `isPrivate=false` |

### 3.5 Hardening da superfície admin (T201–T206 + T205 Fase 1)

| Tarefa | Entrega | Doc/relatório |
|---|---|---|
| T201 | Auditoria da superfície `/admin/*` (read-only) | `reports/admin-authz-surface-audit-2026-10-12.md` |
| T202 | **Deny-by-default server-side** no render + API | `reports/admin-authz-hardening-2026-10-12.md` |
| T203 | **Rate limit admin** (60/min leitura, 10/min destrutivas) + **anti-probing** por hash de sessão | `reports/admin-rate-limit-hardening-2026-10-12.md` |
| T204 | Design step-up/MFA + refinamento do probe (docs-only) | `reports/admin-stepup-mfa-probe-refinement-design-2026-10-13.md` |
| T206 | **Probe dedicado** `GET /api/v1/admin/gate` com fallback fail-closed | `reports/admin-gate-probe-refinement-2026-10-13.md` |
| T205 Fase 1 | **Step-up por re-auth de senha** nas destrutivas (`POST /api/v1/admin/step-up`; `AdminStepUpGuard` fail-closed → **428**) | `reports/admin-stepup-fase1-2026-10-13.md` |

Estado do hardening admin: **T201–T206 + T205 Fase 1 completos**. Fases 2 (TOTP) e 3 (WebAuthn)
permanecem **não implementadas** (design futuro, sem packet).

### 3.6 Produção (smoke passivo) e CI no SHA atual

- **CI `main`:** `success` (run 38297883806) · **Security `main`:** `success` (run 38297883795).
- **Deploy `main`:** `waiting` no environment **Production** — **não aprovado** (é do Operador;
  o deploy nativo Vercel/Railway independe).
- **Smoke canônico 7/7 → 200** no SHA atual: `/health`, `/pt-BR`, `/en-US`, `/es-ES`,
  `/pt-BR/catalog`, `/pt-BR/pricing`, `/pt-BR/login` (§9).
- Verificação específica de produção (T205): `POST /api/v1/admin/step-up` anônimo → **401**;
  `GET /api/v1/admin/gate` → **401**; `/health` → **200**.

---

## 4. Decisão formal de encerramento

**Decisão do Operador (T210):** **encerrar o incidente com risco residual aceito, sem purge.**

- A **purge de histórico não é executada nem autorizada** nesta tarefa; exigiria confirmação
  explícita separada (T213) e reescrita de histórico (proibida a agentes).
- A **mitigação efetiva** é a **rotação das credenciais conhecidas** + **neutralização das contas
  de teste** + **controles de prevenção** (secret scanning/push protection ATIVOS; Gitleaks gate).
- Consequência: o blob **permanece no histórico público**, porém **sem credencial válida**.

---

## 5. Riscos residuais formalmente ACEITOS

1. **Blob histórico permanece público** (sem purge) — aceito; as credenciais que ele expõe foram
   rotacionadas e não são mais válidas.
2. **Repositório PÚBLICO** — decisão deliberada do Operador; mitigado por secret scanning +
   push protection + Gitleaks como gate bloqueador.
3. **Contas `@mediarate.test` mantêm-se no banco** (sem delete físico) — neutralizadas
   (senha/sessões/ADMIN); 0 atividade pós-remediação.
4. **`#151` (SSRF) permanece OPEN** — mitigado por `url-guard`/`ip-guard` e provado por testes;
   formalização documental em **T211** (sem interagir com o alerta).
5. **119 alertas Trivy estruturais** — ruído por design (D-534); ligados à decisão de
   deps/imagem base (**T209**).

---

## 6. Monitoramentos remanescentes

- **Pico de `ADMIN_STEPUP_FAIL`** e **ações destrutivas admin sem step-up** (governança do
  kill-switch — §7).
- **Novos endpoints admin mutantes** devem herdar o `AdminStepUpGuard`; a **metadata spec** deve
  continuar falhando se uma rota mutante admin não estiver coberta ou explicitamente classificada.
- **Flakes conhecidos:** Google Fonts/Turbopack no Build/OpenNext (rerun resolve) e suíte API
  (observado 1×).
- **26 títulos sem elenco** (honestidade de dados).
- **Fallback do probe antigo** `/admin/backfills/status` permanece por compatibilidade
  (remoção futura após estabilização).

---

## 7. Governança do kill-switch `ADMIN_STEPUP_REQUIRED=0` (mudança sensível)

O kill-switch do step-up (T205 Fase 1) **não é feature flag inocente** — desligá-lo remove a
exigência de re-auth de senha nas ações destrutivas admin. Política mínima registrada em
`docs/08-security/ADMIN_SECURITY.md`:

```
default: habilitado (step-up EXIGIDO)
desabilitar: apenas por decisão operacional explícita, documentada
registro: worklog / mudança sensível (janela curta)
monitoramento: picos de ADMIN_STEPUP_FAIL e ações destrutivas sem step-up
reativação: imediata após a contingência
```

---

## 8. GO para convites: **continua SUSPENSO**

Encerrar o incidente **não** libera GO. Permanecem pendentes de decisão/ação:
`T211` (#151, evidência documental), `T209` (deps/#515/#518/#522 + Trivy),
`T212`/`T213` (backups/purge — confirmação explícita), **declaração final explícita do Operador**,
e aprovação do Deploy em Production. **Nenhuma ação do agente declara GO.**

---

## 9. Referências (sanitizadas)

**Docs versionados:**
`docs/08-security/SECURITY_INCIDENTS.md` · `docs/08-security/SECURITY_CI.md` ·
`docs/08-security/ADMIN_SECURITY.md` · `docs/06-devops-deployment/GO_READINESS_CHECKLIST.md` ·
`docs/08-security/reports/synthetic-admin-reconciliation-2026-10-12.md` ·
`docs/08-security/reports/admin-*-2026-10-1*.md` (T201–T206/T205) ·
`DECISOES.md` (D-577, D-578).

**Artefatos locais (gitignored, `.claude/reports/`):**
`secret-incident-exchange-log-2026-10-10.md` · `secret-exposure-sweep-2026-10-11.md` ·
`incident-remediation-2026-10-11.md` · `incident-closure-verification-2026-10-12.md`.

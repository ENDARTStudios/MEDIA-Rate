# Checklist de prontidão para GO de convites (Beta Fechada)

**Última auditoria:** 2026-10-13 (T211, docs-only/read-only) · **GO: SUSPENSO** — este
documento **não declara GO**; consolida evidência para a **declaração formal do Operador**.
Relatórios: `docs/08-security/reports/go-readiness-audit-2026-10-12.md`,
`docs/08-security/reports/incident-2026-10-11-formal-closure-risk-acceptance-2026-10-13.md` e
`docs/08-security/reports/codeql-alert-151-open-mitigated-documented-2026-10-13.md`.

Legenda: **PRONTA** = evidência objetiva · **PENDENTE_OPERADOR** = decisão humana ·
**BLOQUEADA** = exige ação antes de GO · **MONITORADA** = acompanhamento contínuo.

## 1. Segurança

| Frente | Estado | Evidência (2026-10-12) |
|---|---|---|
| Secret scanning | ✅ PRONTA | `enabled`, **0 alertas** |
| Push protection | ✅ PRONTA | `enabled` |
| Gitleaks (gate do tree) | ✅ PRONTA | job `Gitleaks (segredos — tree atual)` verde no main |
| Dependabot security updates | ✅ PRONTA | `enabled` |
| CodeQL — fila de correção | ✅ PRONTA | esgotada (T191–T194, T195, T196-A/C/b); 12 alertas `fixed` |
| CodeQL — #151 (SSRF) | ✅ RESOLVIDA_DOCUMENTALMENTE_COM_ALERTA_MANTIDO_OPEN | **T211 (2026-10-13):** `#151 = OPEN_MITIGATED_DOCUMENTED` — permanece **open por limitação da regra** (`js/request-forgery` não reconhece a barreira custom), **runtime mitigado** (T191/PR #528 `cf993017`: url-guard/ip-guard); **contagem CodeQL open = 1**; decisão = manter open com evidência (não dismiss automático). Relatório: `reports/codeql-alert-151-open-mitigated-documented-2026-10-13.md` |
| Trivy (119 estruturais) | ⚠️ PENDENTE_OPERADOR | ruído por design (D-534); ligado à decisão de deps/imagem base |
| Incidente INC-2026-10-11 | ✅ RESOLVIDA_DOCUMENTALMENTE_COM_RISCO_RESIDUAL_ACEITO | **T210 (2026-10-13):** `CLOSED_RISK_ACCEPTED_NO_PURGE` — encerrado com risco residual aceito, **sem purge**; rotação + neutralização + secret scanning/push protection + Gitleaks verificados. Relatório: `reports/incident-2026-10-11-formal-closure-risk-acceptance-2026-10-13.md` |
| Hardening admin (T201–T206 + T205 Fase 1) | ✅ PRONTA | deny-by-default + rate limit/anti-probing + probe dedicado + **step-up por senha** (fail-closed) em produção; Fases 2/3 (TOTP/WebAuthn) não implementadas |

## 2. CI/CD

| Frente | Estado | Evidência |
|---|---|---|
| CI do main | ✅ PRONTA | `completed/success` em `40ee2b9` (sha atual) |
| Security do main | ✅ PRONTA | `completed/success` (CodeQL, Gitleaks, Trivy, Semgrep, ZAP) |
| Monitores (Uptime/Health/Alertas) | ✅ PRONTA | `success` |
| Flake Google Fonts/Turbopack (Build) | 🔁 MONITORADA | conhecido; rerun resolve (resolvido 2026-10-11 pós-#540) |
| Flake da suíte API | 🔁 MONITORADA | observado 1×, não reproduzido em 2 execuções |
| Deploy (environment Production) | ⚠️ PENDENTE_OPERADOR | `waiting` — aprovação é do Operador; deploy nativo (Vercel/Railway) independe |

## 3. Governança

| Frente | Estado | Evidência |
|---|---|---|
| Gov-01 (ruleset `protect-main`) | ✅ PRONTA | id 20801818 `active`; deletion + non_fast_forward + pull_request + 6 checks required; **`bypass_actors: []`** (reconfirmado T197 e re-coletado T199) |
| Gov-02 (approvals ≥1) | ⚪ OPCIONAL | decisão futura; exige 2º revisor humano ativo |

## 4. Dependências

| Frente | Estado | Evidência |
|---|---|---|
| PRs #515/#518/#522 | ⚠️ PENDENTE_OPERADOR | OPEN/sem drift; classificação T187 (#515 STALE; #518/#522 requerem nova PR limpa) |
| audit:ci | ✅ PRONTA | verde no main (gate Lint & Audit required) |

## 5. Produto/Beta

| Frente | Estado | Evidência |
|---|---|---|
| Pacote de GO (Gov-01/P019/UG-01/B1) | ✅ PRONTA | 4/4 (2026-10-05) + Gov-01 reconfirmado |
| Backups/alertas Postgres | ⚠️ PENDENTE_OPERADOR | decisão operacional |
| Higiene `admin***@mediarate.test` | ✅ PRONTA (resolvida) | **T200 (2026-10-12):** 0 admins no domínio de teste (7 contas = USER ×7), 0 sessões ativas, 0 atividade pós-remediação T184; único ADMIN de produção é a conta legítima do Operador (D-563). O item era **drift documental** — `synthetic-admin-reconciliation-2026-10-12.md` |
| Monitor 26 títulos sem elenco | 🔁 MONITORADA | honestidade de dados; sem bloqueio técnico |
| Monitor flakes | 🔁 MONITORADA | ver §2 |

## 6. Produção (smoke passivo)

`/pt-BR`, `/en-US`, `/es-ES`, `/pt-BR/catalog`, `/pt-BR/pricing`, `/pt-BR/login`, `/health` (API)
→ **7/7 `200`** (2026-10-12). Catálogo com 14 "rawkeys" é falso positivo conhecido do
heurístico (APIs DOM inline), não chave i18n crua.

## 7. Resumo

- **PRONTAS:** proteção de segredos (0 alertas), Governança (Gov-01), CI/Security/monitores,
  fila CodeQL de correção, audit, Pacote de GO 4/4, **hardening admin (T201–T206 + T205 Fase 1)**,
  **encerramento do incidente INC-2026-10-11 (risco residual aceito, sem purge — T210)**.
- **PENDENTES DO OPERADOR (decisão):** deps (#515/#518/#522) + Trivy (T209) ·
  backups/alertas Postgres (T212) · purge de histórico (T213, confirmação explícita) ·
  Deploy waiting (quando aprovar) · eventualmente Gov-02.
  *(Higiene da conta sintética ADMIN: **resolvida** — T200. Incidente: **encerrado
  documentalmente** — T210. CodeQL #151: **formalizado open mitigado documentado** — T211.)*
- **MONITORADAS:** flakes (Build/Turbopack e suíte API) · 26 títulos sem elenco.
- **GO para convites: SUSPENSO** — liberável **apenas por declaração formal do Operador** após
  resolver/aceitar as pendências acima. Nenhuma ação do agente declara GO.

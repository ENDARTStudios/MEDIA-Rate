# Checklist de prontidão para GO de convites (Beta Fechada)

**Última auditoria:** 2026-10-13 (**T225**, design de prontidão de backups, read-only) ·
**GO: SUSPENSO** — este documento **não declara GO**; consolida evidência para a **declaração formal
do Operador**. **Snapshots canônicos:** `reports/pre-go-evidence-pack-2026-10-13.md`,
`reports/beta-core-journey-audit-2026-10-13.md` e
`reports/backup-operational-readiness-design-2026-10-13.md`.
Relatórios: `reports/go-readiness-audit-2026-10-12.md`,
`reports/incident-2026-10-11-formal-closure-risk-acceptance-2026-10-13.md`,
`reports/codeql-alert-151-open-mitigated-documented-2026-10-13.md` e
`reports/deps-clean-pr-2026-10-13.md`.

Legenda: **PRONTA** = evidência objetiva · **PENDENTE_OPERADOR** = decisão humana ·
**BLOQUEADA** = exige ação antes de GO · **MONITORADA** = acompanhamento contínuo ·
**RISCO_ACEITO** = risco residual formalmente aceito.

## 1. Segurança

| Frente | Estado | Evidência (2026-10-12) |
|---|---|---|
| Secret scanning | ✅ PRONTA | `enabled`, **0 alertas** |
| Push protection | ✅ PRONTA | `enabled` |
| Gitleaks (gate do tree) | ✅ PRONTA | job `Gitleaks (segredos — tree atual)` verde no main |
| Dependabot security updates | ✅ PRONTA | `enabled` |
| CodeQL — fila de correção | ✅ PRONTA | esgotada (T191–T194, T195, T196-A/C/b); 12 alertas `fixed` |
| CodeQL — #151 (SSRF) | ✅ RESOLVIDA_DOCUMENTALMENTE_COM_ALERTA_MANTIDO_OPEN | **T211 (2026-10-13):** `#151 = OPEN_MITIGATED_DOCUMENTED` — permanece **open por limitação da regra** (`js/request-forgery` não reconhece a barreira custom), **runtime mitigado** (T191/PR #528 `cf993017`: url-guard/ip-guard); **contagem CodeQL open = 1**; decisão = manter open com evidência (não dismiss automático). Relatório: `reports/codeql-alert-151-open-mitigated-documented-2026-10-13.md` |
| Trivy (**117** estruturais, recontado T220) | 🔁 MONITORADA | ruído por design (D-534); sem high de *runtime*; **total open 118** (CodeQL 1 + Trivy 117) — baseline pré-T209 era 120 |
| Incidente INC-2026-10-11 | ✅ RESOLVIDA_DOCUMENTALMENTE_COM_RISCO_RESIDUAL_ACEITO | **T210 (2026-10-13):** `CLOSED_RISK_ACCEPTED_NO_PURGE` — encerrado com risco residual aceito, **sem purge**; rotação + neutralização + secret scanning/push protection + Gitleaks verificados. Relatório: `reports/incident-2026-10-11-formal-closure-risk-acceptance-2026-10-13.md` |
| Hardening admin (T201–T206 + T205 Fase 1) | ✅ PRONTA | deny-by-default + rate limit/anti-probing + probe dedicado + **step-up por senha** (fail-closed) em produção; Fases 2/3 (TOTP/WebAuthn) não implementadas |

## 2. CI/CD

| Frente | Estado | Evidência |
|---|---|---|
| CI do main | ✅ PRONTA | `completed/success` em `8bb38ae0` (sha atual; run `38309415248`) |
| Security do main | ✅ PRONTA | `completed/success` em `8bb38ae0` (run `38309415263`; CodeQL, Gitleaks, Trivy, Semgrep, ZAP) |
| Deploy nativo (Railway) | ✅ PRONTA | último deploy `SUCCESS`; web/Vercel independe do gate |
| Uptime sintético | ✅ PRONTA | `uptime-check.yml` `*/10` ativo (D-556) — substitui a pendência de UptimeRobot |
| Alertas de 5xx / auth | ✅ PRONTA | T218 sem serviço externo: `5xx_rate` CRITICAL · `auth_failures` WARNING; status `/api/v1/admin/alerts/status` |
| Alerta de **falha de backup** | ⚠️ PENDENTE_OPERADOR | não existe (depende de §5 backups) |
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
| PRs #515/#518/#522 | ✅ RESOLVIDA_PARCIALMENTE (T209) | **#518/#522 supersedidas** e **#515 fechada** por uma **PR limpa** (`sharp 0.35.5`, `wrangler 4.149.0`; `npm audit` **28→24**). **Excluídos com falha real medida:** `vitest 4.1.11` (des-hoisting do provider de coverage → `--coverage` do CI quebrava) e `fastify 5.12.5` (instância duplicada → `tsc` da API quebrava). **Majors** (`tailwindcss` 3→4, `vitest` 4→5) → tarefa de código. Relatório: `reports/deps-clean-pr-2026-10-13.md` |
| Trivy (119 estruturais) | 🔁 MONITORADA | ruído por design (D-534); parcialmente ligado à decisão de deps/imagem base; recontado por GET (sem interagir com alertas) |
| audit:ci | ✅ PRONTA | verde no main (gate Lint & Audit required) |

## 5. Produto/Beta

| Frente | Estado | Evidência |
|---|---|---|
| Pacote de GO (Gov-01/P019/UG-01/B1) | ✅ PRONTA | 4/4 (2026-10-05) + Gov-01 reconfirmado |
| Backups/DR PostgreSQL | ⚠️ **DESIGN_PRONTO_PARA_DECISAO_OPERADOR (T225)** | **T225 (2026-10-13):** design read-only concluído — opções A–E, política de destino/segredos/PII, **alerta de falha** (padrão GitHub Issues), **restore de ensaio**, RPO/RTO e **template de decisão**. Estado real: script validado (`pg_dump -F c` + `pg_restore --list`) e runbook **existem**, mas **não há backup automático**, o **destino é local/efêmero** e **não há alerta**; o backup pré-migration é **fail-open** e bloqueado pelo hostname interno (**D-527**). Relatório: `reports/backup-operational-readiness-design-2026-10-13.md` |
| Observabilidade mínima | ✅ PRONTA com 1 lacuna | 5xx (CRITICAL), auth_failures (WARNING), uptime sintético, Sentry, `/metrics`, logs. **Lacuna:** alerta de falha de backup; probing/step-up admin são **logados** mas não alert-ificados |
| Jornada mínima de beta | ✅ **AUDITADA_COM_LACUNAS (T224)** | **T224 (2026-10-13):** 13 fluxos auditados (read-only) — **todos `PRONTO_PARA_BETA`** por evidência de CI (34 specs E2E, incl. `jornada-critica` 3× retries=0) + estática + smoke; copy honesta de indisponível nos 3 locales. **Lacunas** (não de produto): backups P1, aprovação de Production, escopo formal. Relatório: `reports/beta-core-journey-audit-2026-10-13.md` |
| PLANO_MESTRE | ✅ RECONCILIADO (T224) | seções de estado atual atualizadas para o snapshot 2026-10-13 (API **1422/1422**, web **615/615**, **34 specs E2E**, uptime sintético **ATIVO**, domínio/proteção da `main` resolvidos); história não reescrita |
| Higiene `admin***@mediarate.test` | ✅ PRONTA (resolvida) | **T200 (2026-10-12):** 0 admins no domínio de teste (7 contas = USER ×7), 0 sessões ativas, 0 atividade pós-remediação T184; único ADMIN de produção é a conta legítima do Operador (D-563). O item era **drift documental** — `synthetic-admin-reconciliation-2026-10-12.md` |
| Monitor 26 títulos sem elenco | 🔁 MONITORADA | honestidade de dados; sem bloqueio técnico |
| Monitor flakes | 🔁 MONITORADA | ver §2 |

## 6. Produção (smoke passivo)

`/pt-BR`, `/en-US`, `/es-ES`, `/pt-BR/catalog`, `/pt-BR/pricing`, `/pt-BR/login`, `/health` (API)
→ **7/7 `200`** (2026-10-13, T220). Catálogo com "rawkeys" é falso positivo conhecido do
heurístico (APIs DOM inline), não chave i18n crua.

## 7. Resumo

- **PRONTAS:** proteção de segredos (0 alertas), Governança (Gov-01), CI/Security/uptime/alertas,
  fila CodeQL de correção, audit, Pacote de GO 4/4, **hardening admin (T201–T206 + T205 Fase 1)**,
  **encerramento do incidente INC-2026-10-11** (risco residual aceito, sem purge — T210),
  **observabilidade mínima (5xx/auth/uptime/Sentry)**.
- **PENDENTES DO OPERADOR (decisão):** **backups/DR Postgres (P1 — design pronto, T225)**:
  escolher estratégia A–E, autorizar configuração mínima + alerta de falha + restore de ensaio ·
  purge de histórico (NAO_APLICAVEL recomendado) · Deploy `waiting` (aprovar) · escopo/GO de convites
  (declaração formal) · eventualmente Gov-02 · majors de deps (`tailwindcss` 4, `vitest` 5).
  *(Higiene da conta sintética ADMIN: **resolvida** — T200. Incidente: **encerrado
  documentalmente** — T210. CodeQL #151: **formalizado open mitigado documentado** — T211.
  Deps #515/#518/#522: **resolvidas** — T209. Jornada de beta: **auditada sem bloqueio de
  produto** — T224.)*
- **BLOQUEADAS (tooling):** `vitest ^4.1.11` (hoisting do coverage — T221) e `fastify ^5.12.5`
  (duplicação de tipos — T222); não forçar.
- **MONITORADAS:** flakes (Build/Turbopack e suíte API) · 26 títulos sem elenco · Trivy estrutural.
- **GO para convites: SUSPENSO** — liberável **apenas por declaração formal do Operador** após
  resolver/aceitar as pendências acima. Nenhuma ação do agente declara GO.

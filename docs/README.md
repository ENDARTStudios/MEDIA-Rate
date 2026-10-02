# docs/ — Índice da documentação (MEDIA Rate / mediarate.app)

Conjunto canônico de documentação do projeto. Arquivos de **aprofundamento**
já existentes são referenciados — esta suíte é o ponto de entrada.

## Núcleo

| Doc | O que é |
|---|---|
| [PRD](01-product-discovery/PRD.md) | Produto: visão, escopo, planos, métricas de sucesso |
| [ARCHITECTURE](02-architecture-design/ARCHITECTURE.md) | Arquitetura técnica e fluxos de deploy |
| [RULES](03-development-process/RULES.md) | Regras invioláveis do projeto (digest do AGENTS.md + decisões) |
| [ROADMAP](01-product-discovery/ROADMAP.md) | Onde estamos e o que falta (fases, Beta, bloqueadores) |
| [ONBOARDING](08-knowledge-management/ONBOARDING.md) | Comece aqui: setup em 15 minutos |
| [ADR](02-architecture-design/ADR.md) | Registro de decisões (aponta `DECISOES.md` na raiz) |
| [MEMORY](08-knowledge-management/MEMORY.md) | Onde o estado do projeto vive e como é atualizado |
| [TASKS](03-development-process/TASKS.md) | Fluxo de tarefas (protocolo Thinker/Doer, PLANO_MESTRE, issues) |

## Produto e design

| Doc | O que é |
|---|---|
| [DEFINE_THE_USER](01-product-discovery/DEFINE_THE_USER.md) | Personas e papéis (Free/Plus/Premium/admin/Operador) |
| [DESIGN](02-architecture-design/DESIGN.md) | Design system: CATEGORY_TOKENS, real-vs-demo, acessibilidade |
| [CONTENT](04-api-integrations/CONTENT.md) | Catálogo, curadoria, vocabulário e conteúdo i18n |
| [STYLE_GUIDE](02-architecture-design/STYLE_GUIDE.md) | Convenções de código e armadilhas conhecidas |

## Engenharia

| Doc | O que é |
|---|---|
| [SETUP](03-development-process/SETUP.md) | Ambiente local do zero |
| [DEVELOPMENT](03-development-process/DEVELOPMENT.md) | Dev diário (portas, quirks Windows, command map) |
| [CHOOSE_TECH_STACK](02-architecture-design/CHOOSE_TECH_STACK.md) | Stack escolhida e por quê |
| [TASK_BREAKING_DOWN](03-development-process/TASK_BREAKING_DOWN.md) | Como quebrar tarefas (inventário antes de construir) |
| [TESTING](03-development-process/TESTING.md) | Suítes, E2E, mutação, RLS, evidência local |
| [API](04-api-integrations/API.md) | Contrato REST, auth, CSRF, envelope, Swagger |
| [ERROR_HANDLING](07-operations-marketing/ERROR_HANDLING.md) | Envelope de erro, 404 pré-Prisma, idempotência |
| [INTEGRATIONS](04-api-integrations/INTEGRATIONS.md) | Stripe, Resend, Google, PostHog, Sentry, R2, catálogos |
| [ANALYTICS](07-operations-marketing/ANALYTICS.md) | PostHog (consentimento), flags, OTEL |
| [RESEARCH](08-knowledge-management/RESEARCH.md) | Pareceres e pesquisas (jurídico, OTEL, revisão externa) |

## Qualidade e operação

| Doc | O que é |
|---|---|
| [SECURITY_REVIEW](05-security-compliance/SECURITY_REVIEW.md) | Gates de segurança no CI e processo de triagem |
| [CODE_REVIEW](06-devops-deployment/CODE_REVIEW.md) | O que um review exige antes do merge |
| [QA_TESTING](06-devops-deployment/QA_TESTING.md) | Smoke de produção padrão (checklist validado) |
| [TESTING](03-development-process/TESTING.md) · [E2E](06-devops-deployment/E2E.md) · [LOAD_TESTING](06-devops-deployment/LOAD_TESTING.md) | Testes (geral, E2E, carga) |
| [PERFORMANCE](07-operations-marketing/PERFORMANCE.md) | Lighthouse, bundle, imagens, p95 |
| [ACCESSIBILITY](07-operations-marketing/ACCESSIBILITY.md) | Acessibilidade (estado real e regras) |
| [SEO](07-operations-marketing/SEO.md) | SEO clássico: robots por bot, sitemap, canônicas |
| [AEO](07-operations-marketing/AEO.md) | Answer Engine Optimization: respostas extraíveis |
| [GEO](07-operations-marketing/GEO.md) | Generative Engine Optimization: citação por IA |
| [AIO](07-operations-marketing/AIO.md) | AI Optimization: presença/medição em superfícies de IA |
| [COMPLIANCE](05-security-compliance/COMPLIANCE.md) | LGPD, legal, retenção, direitos do titular |
| [MONITORING](07-operations-marketing/MONITORING.md) | Métricas, logs, alertas, Sentry (aponta OBSERVABILITY.md) |
| [BACKUP_DR](06-devops-deployment/BACKUP_DR.md) | Backup, disaster recovery, rollback |
| [PREVIEW_DEPLOYMENT](06-devops-deployment/PREVIEW_DEPLOYMENT.md) | Previews da Vercel (URLs, noindex, ZAP) |
| [PRODUCTION_DEPLOY](06-devops-deployment/PRODUCTION_DEPLOY.md) | Deploy de produção e rollback |
| [CHANGELOG](08-knowledge-management/CHANGELOG.md) | Histórico de mudanças por release |
| [ITERATION](08-knowledge-management/ITERATION.md) | O ciclo completo de uma iteração (TAREFA→PR→merge→smoke) |

## Docs de aprofundamento (legados, continuam válidos)

CI.md · OBSERVABILITY.md · SECURITY.md · SECURITY_TRIAGE.md · E2E.md ·
LOAD_TESTING.md · LGPD_DADOS.md · INCIDENT_RESPONSE.md · SEO_AEO_AIO_GEO.md ·
BOAS_PRATICAS_DEPLOY.md · BOAS_PRATICAS_SECRETS.md · PADROES_DESENVOLVIMENTO.md ·
RUNBOOK_PRODUCAO.md · RUNBOOK_OPERADOR_FINAL.md · MANUAL_DO_OPERADOR.md (raiz) ·
b1-prod-guards.md · runbooks/ · api/ · legal/ · auditoria/

## Regra de ouro

Documento sem instrução executável é dívida. Toda doc desta suíte deve dizer
**como fazer**, não apenas o que é. Ao mudar comportamento, mude a doc no MESMO PR.

---

## Arquitetura de documentação (T110 — reorganização faseada)

Estrutura-alvo de 8 pilares (`docs/01-…` a `docs/08-…`). **Fase 1 (esta):** as pastas e os
esqueletos dos documentos que ainda não existiam foram criados. **Nada foi movido ainda** —
os documentos atuais continuam nos caminhos antigos, então **nenhum link quebra**.

| Pilar | Conteúdo |
|---|---|
| `01-product-discovery/` | DEFINE_THE_USER · PRD · ROADMAP · **LEGAL_TERMS** · **PRICING_MONETIZATION** |
| `02-architecture-design/` | ARCHITECTURE · ADR · CHOOSE_TECH_STACK · DESIGN · STYLE_GUIDE · **DATA_MODEL** · **GREEN_COMPUTING** · **UML** |
| `03-development-process/` | DEVELOPMENT · SETUP · RULES · TASKS · TASK_BREAKING_DOWN · TESTING |
| `04-api-integrations/` | API · CONTENT · **INTEGRATIONS** |
| `05-security-compliance/` | COMPLIANCE · INCIDENT_RESPONSE · SECURITY_REVIEW · **IAM_IGA · MFA · NAC · RBAC · RLS · THREAT_MODELING · VULNERABILITY_DISCLOSURE · ZTNA** |
| `06-devops-deployment/` | BACKUP_DR · CODE_REVIEW · PREVIEW_DEPLOYMENT · PRODUCTION_DEPLOY · QA_TESTING · **CI_CD_PIPELINE** · **FINOPS** |
| `07-operations-marketing/` | ACCESSIBILITY · AEO · AIO · ANALYTICS · ERROR_HANDLING · GEO · MONITORING · PERFORMANCE · SEO |
| `08-knowledge-management/` | CHANGELOG · MEMORY · ONBOARDING · RESEARCH · **CODE_OF_CONDUCT · CONTRIBUTING · DEPRECATION_POLICY · ITERATION** |

**Negrito** = criado nesta fase (esqueleto). Os demais já existem em `docs/` (raiz) e serão
movidos nas fases seguintes, com atualização de todas as referências no mesmo PR.

### Fases
- **Fase 1 (feita):** pastas + esqueletos + este índice. Zero quebra de link.
- **Fase 2:** `git mv` dos documentos existentes para os pilares + atualização das referências
  (`AGENTS.md`, `DECISOES.md`, `PLANO_MESTRE.md`, `PENDENCIAS_OPERADOR.md`, `.github/workflows/*`,
  `apps/web/*.ts`, `e2e/*`).
- **Fase 3:** fusão das duplicatas (conteúdo preservado, com nota de origem): `SECURITY.md`↔`docs/SECURITY.md`,
  `SEO_AEO_AIO_GEO.md`↔`SEO/AEO/AIO/GEO.md`, `MONITORING.md`↔`OBSERVABILITY.md`,
  `PRODUCTION_DEPLOY`+`BOAS_PRATICAS_DEPLOY`+`RUNBOOK_PRODUCAO`+`DEPLOY_CLOUDFLARE`,
  `COMPLIANCE`+`conformidade-v13`+`legal/`, `PADROES_DESENVOLVIMENTO`+`DEVELOPMENT`+`STYLE_GUIDE`.
- **Fase 4:** realocação temática dos ~35 docs restantes (ex.: `CI.md`→`06/`, `OBSERVABILITY.md`→`07/`,
  `LGPD_DADOS.md`→`05/`, `RUNBOOK_*`→`06/`), preservando `legal/`, `runbooks/`, `screenshots/`,
  `lighthouse-reports/`.

> **Regra de ouro:** nenhum conteúdo é alterado ou perdido em movimentos/fusões.
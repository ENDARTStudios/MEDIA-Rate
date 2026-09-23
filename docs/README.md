# docs/ — Índice da documentação (MEDIA Rate / mediarate.app)

Conjunto canônico de documentação do projeto. Arquivos de **aprofundamento**
já existentes são referenciados — esta suíte é o ponto de entrada.

## Núcleo

| Doc | O que é |
|---|---|
| [PRD](PRD.md) | Produto: visão, escopo, planos, métricas de sucesso |
| [ARCHITECTURE](ARCHITECTURE.md) | Arquitetura técnica e fluxos de deploy |
| [RULES](RULES.md) | Regras invioláveis do projeto (digest do AGENTS.md + decisões) |
| [ROADMAP](ROADMAP.md) | Onde estamos e o que falta (fases, Beta, bloqueadores) |
| [ONBOARDING](ONBOARDING.md) | Comece aqui: setup em 15 minutos |
| [ADR](ADR.md) | Registro de decisões (aponta `DECISOES.md` na raiz) |
| [MEMORY](MEMORY.md) | Onde o estado do projeto vive e como é atualizado |
| [TASKS](TASKS.md) | Fluxo de tarefas (protocolo Thinker/Doer, PLANO_MESTRE, issues) |

## Produto e design

| Doc | O que é |
|---|---|
| [DEFINE_THE_USER](DEFINE_THE_USER.md) | Personas e papéis (Free/Plus/Premium/admin/Operador) |
| [DESIGN](DESIGN.md) | Design system: CATEGORY_TOKENS, real-vs-demo, acessibilidade |
| [CONTENT](CONTENT.md) | Catálogo, curadoria, vocabulário e conteúdo i18n |
| [STYLE_GUIDE](STYLE_GUIDE.md) | Convenções de código e armadilhas conhecidas |

## Engenharia

| Doc | O que é |
|---|---|
| [SETUP](SETUP.md) | Ambiente local do zero |
| [DEVELOPMENT](DEVELOPMENT.md) | Dev diário (portas, quirks Windows, command map) |
| [CHOOSE_TECH_STACK](CHOOSE_TECH_STACK.md) | Stack escolhida e por quê |
| [TASK_BREAKING_DOWN](TASK_BREAKING_DOWN.md) | Como quebrar tarefas (inventário antes de construir) |
| [TESTING](TESTING.md) | Suítes, E2E, mutação, RLS, evidência local |
| [API](API.md) | Contrato REST, auth, CSRF, envelope, Swagger |
| [ERROR_HANDLING](ERROR_HANDLING.md) | Envelope de erro, 404 pré-Prisma, idempotência |
| [INTEGRATIONS](INTEGRATIONS.md) | Stripe, Resend, Google, PostHog, Sentry, R2, catálogos |
| [ANALYTICS](ANALYTICS.md) | PostHog (consentimento), flags, OTEL |
| [RESEARCH](RESEARCH.md) | Pareceres e pesquisas (jurídico, OTEL, revisão externa) |

## Qualidade e operação

| Doc | O que é |
|---|---|
| [SECURITY_REVIEW](SECURITY_REVIEW.md) | Gates de segurança no CI e processo de triagem |
| [CODE_REVIEW](CODE_REVIEW.md) | O que um review exige antes do merge |
| [QA_TESTING](QA_TESTING.md) | Smoke de produção padrão (checklist validado) |
| [TESTING](TESTING.md) · [E2E](E2E.md) · [LOAD_TESTING](LOAD_TESTING.md) | Testes (geral, E2E, carga) |
| [PERFORMANCE](PERFORMANCE.md) | Lighthouse, bundle, imagens, p95 |
| [ACCESSIBILITY](ACCESSIBILITY.md) | Acessibilidade (estado real e regras) |
| [SEO](SEO.md) | SEO clássico: robots por bot, sitemap, canônicas |
| [AEO](AEO.md) | Answer Engine Optimization: respostas extraíveis |
| [GEO](GEO.md) | Generative Engine Optimization: citação por IA |
| [AIO](AIO.md) | AI Optimization: presença/medição em superfícies de IA |
| [COMPLIANCE](COMPLIANCE.md) | LGPD, legal, retenção, direitos do titular |
| [MONITORING](MONITORING.md) | Métricas, logs, alertas, Sentry (aponta OBSERVABILITY.md) |
| [BACKUP_DR](BACKUP_DR.md) | Backup, disaster recovery, rollback |
| [PREVIEW_DEPLOYMENT](PREVIEW_DEPLOYMENT.md) | Previews da Vercel (URLs, noindex, ZAP) |
| [PRODUCTION_DEPLOY](PRODUCTION_DEPLOY.md) | Deploy de produção e rollback |
| [CHANGELOG](CHANGELOG.md) | Histórico de mudanças por release |
| [ITERATION](ITERATION.md) | O ciclo completo de uma iteração (TAREFA→PR→merge→smoke) |

## Docs de aprofundamento (legados, continuam válidos)

CI.md · OBSERVABILITY.md · SECURITY.md · SECURITY_TRIAGE.md · E2E.md ·
LOAD_TESTING.md · LGPD_DADOS.md · INCIDENT_RESPONSE.md · SEO_AEO_AIO_GEO.md ·
BOAS_PRATICAS_DEPLOY.md · BOAS_PRATICAS_SECRETS.md · PADROES_DESENVOLVIMENTO.md ·
RUNBOOK_PRODUCAO.md · RUNBOOK_OPERADOR_FINAL.md · MANUAL_DO_OPERADOR.md (raiz) ·
b1-prod-guards.md · runbooks/ · api/ · legal/ · auditoria/

## Regra de ouro

Documento sem instrução executável é dívida. Toda doc desta suíte deve dizer
**como fazer**, não apenas o que é. Ao mudar comportamento, mude a doc no MESMO PR.

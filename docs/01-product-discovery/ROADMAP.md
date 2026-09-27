# ROADMAP — Onde estamos e o que falta

**Data-âncora:** 2026-09-22 · Fonte viva: `PLANO_MESTRE.md` (fases 0-11 com [x]/[~]).

## Estado atual (resumo)

| Frente | Estado |
|---|---|
| Infra/CI/Deploy (F9) | Integro: CI 13+ checks, deploy.yml verde, `Migration Safety` required (D-535), security.yml verde (D-534) |
| Dados (F2) | 20/21 — gaps de governança: `permissions` granulares, `data_sources`, `entity_revisions` |
| Auth (F3) | Concluída 11/11, provada em produção (verificação de e-mail real, Google OAuth) |
| APIs (F4) | Concluída — CRUD canônico, D-528/D-529, UuidParamPipe (D-531), p95 discover 14ms |
| Frontend (F5) | Concluída — dashboard consolidada, biblioteca 4-status, Kanban, gating 4/2/0 |
| Observabilidade | Métricas/alertas/health no ar; uptime externo pendente do Operador (9.5.4) |
| Cloudflare (T454) | S0 no ar (canário); migração gated por flag `cloudflare_migration` (rollout 0%) |

## Meta próxima: **Beta Fechada**

Abrir para usuários reais convidados. Pré-condições (bloqueadores do relatório
`.claude/reports/beta-blockers.md`):

- **B1 — Guardas operacionais de produção: ✅ FEITO** (guard `migration-safety`
  required — D-532/D-535; staging e migration manual documentados em
  `docs/b1-prod-guards.md`, decisão do Operador em P012/P013).
- **B2 — Sinais de operação**: security.yml verde (D-534, PR #172) · UptimeRobot
  (ação do Operador, 9.5.4) · triagem das issues Sentry stale (T466).
- **B3 — Higiene LGPD/contrato**: DTO explícito em `GET /interacoes` (#148 item 1) ·
  wiring do `ColumnEncryptionService` (email/telefone em repouso — PLANO 2.10) ·
  PII masking já feito (T049).

## Depois da Beta (deferidos conscientemente)

- Governança de dados: `data_sources` (procedência), `entity_revisions`
  (versionamento), `permissions` granulares — ferramenta interna, pós-Beta.
- Migração Cloudflare 100% (rollout 0→10→50→100 com gate ≥24h — D-507).
- PWA/offline — só após revisar `LimpezaServiceWorker` (#148 item 3).
- `#148` itens 1-12 restantes (triagem completa no relatório T029).

## Como entrar na fila

1. Escolher item no `PLANO_MESTRE`/`#148` → virar TAREFA do Thinker.
2. Executar por [ITERATION](ITERATION.md) (branch → TDD → PR → CI → merge → smoke).
3. Registrar evidência no `worklog.md` + decisão em `DECISOES.md` quando mudar regra.

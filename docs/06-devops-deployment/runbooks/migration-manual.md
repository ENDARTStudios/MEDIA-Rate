# Runbook — Migration manual em produção (T034 / P013 / B1)

**Contexto:** o `migrate-production.yml` (manual, D-527) depende do secret
`DATABASE_URL` com o hostname **interno** do Railway
(`postgres.railway.internal`), **inalcançável** de runners do GitHub. Portanto o
workflow, como está, não funciona de fora da rede do Railway.

**Regra:** este runbook **não** executa migration. É um procedimento para o
Operador, com princípio de **menor privilégio** e **sem expor o banco**.

## Comparação das opções

| Critério | Console Railway (recomendado) | Proxy TCP público + allowlist | Self-hosted runner |
|---|---|---|---|
| Segurança / superfície | **Zero superfície nova** — usa o canal já existente do serviço | **Exposto à internet** (mitigado por allowlist de IP + TLS) | Runner na rede do Railway = nova superfície a endurecer |
| Privilégio novo | Nenhum | Credencial pública + allowlist | Acesso de runner na VPC |
| Custo | **0** | 0 (proxy TCP) | Custo de um serviço runner |
| Simplicidade operacional | **Alta** (Shell no console do serviço) | Média (gerir allowlist) | Baixa (criar/manter runner) |
| Tempo de recuperação | Imediato (Operador) | Imediato (se IP do runner na allowlist) | Depende do runner estar no ar |
| Auditoria | Manual (colar log no PR) | Automática (logs do workflow) | Automática |
| Dependência humana | Alta (Operador executa) | Baixa (após setup) | Média (manter runner) |
| Exposição do DB | Nenhuma | **Sim** (endpoint público) | Nenhuma |

## Recomendação (T034)

**Console Railway** como caminho padrão. É o de **menor privilégio e menor
exposição**: não cria credencial pública, não abre o Postgres à internet e não
adiciona runner. Adequado ao ritmo atual de migrations (raro).

**Escalonar antes de implementar** (exigem custo/segredo/exposição e são decisão
do Operador):
- **Proxy TCP público**: exige credencial forte + allowlist de IPs e **expõe** o
  Postgres. Só se migrations manuais virarem rotina.
- **Self-hosted runner**: exige provisioning e hardening de um runner — superfície
  de ataque nova.

## Procedimento (console Railway) — passo a passo

1. **Backup antes** (obrigatório): rodar `scripts/backup-db.sh` (retenção 30
   dias) e confirmar o artefato.
2. Railway → serviço **API** → aba **Shell** (console do container, com o
   `DATABASE_URL` já injetado pelo serviço — **nenhum valor é impresso/copiado**).
3. No Shell: `npx prisma migrate deploy --schema=prisma/schema.prisma`.
4. Conferir a saída (`migrations applied`) e o health: `curl -sI localhost:3000/health`.
5. **Auditoria**: colar o log (mascarado, sem `DATABASE_URL`) no PR/comentário da
   migration; registrar no `worklog.md`.
6. Se algo falhar: `prisma migrate resolve --rolled-back <migration>` conforme o
   plano de rollback do PR, e restaurar backup se necessário.

## Limites honestos

- O guard `migration-safety` valida o **contrato** do PR (label + rollback +
  declaração), **não** a qualidade da migration.
- Este runbook é o caminho **manual**; não substitui revisão humana.
- Nenhum passo aqui imprime `DATABASE_URL`, tokens, cookies ou PII.

# Design — prontidão operacional de backups (T225) — read-only / docs-only

**Data:** 2026-10-13 · **Fase:** F09-ci-cd-deploy · **Tarefa:** T225 · **Base:** `4aef0202` (`origin/main`)
**Natureza:** read-only/docs-only — **nenhuma** execução de backup/restore, **nenhum** acesso a produção,
**nenhum** cron/workflow/secret/infra criado ou alterado, **nenhum** alerta interagido. **GO: SUSPENSO.**
Este documento é **design**, não implementação.

> Sanitização: apenas nomes de arquivo/variável, formatos e contagens. Nenhum `DATABASE_URL`, senha,
> token, connection string, host real, PII ou path sensível.

---

## 1. Sumário executivo

O estado real é: **existe um script de backup de boa qualidade e um runbook de DR**, mas **não existe
operação de backup** — sem agendamento em produção, **sem destino durável**, sem alerta de falha e sem
restore validado. O gargalo do GO é exatamente esse (T220/T224).

A recomendação deste design é a **opção de menor superfície nova** que entrega os quatro requisitos de
uma vez: **automação + destino separado + retenção + alerta + restore testado**, preferindo o
**backup gerenciado da própria plataforma do banco** (Opção B) com a **automação do script existente**
(Opção A) como alternativa/ complemento, e **GitHub Issues** como canal de alerta (padrão já usado).

---

## 2. Estado atual (evidência lida)

| Componente | O que existe | Lacuna |
|---|---|---|
| **Script** | `scripts/backup-db.sh`: `pg_dump -F c --no-owner --no-acl`; **valida o dump com `pg_restore --list`**; **falha em voz alta** se `pg_dump` ausente (nunca fabrica backup); retenção **30 d** com limpeza; loga contagem retida | escreve em `$BACKUP_DIR` (default `./backups`) = **FS local do runner/container** → **sem destino durável**; **não é agendado** |
| **Runbook** | `docs/06-devops-deployment/BACKUP_DR.md`: restore (`pg_restore --clean --if-exists`), cenários × RTO, **RPO ≤24 h** honesto, checklist pré-Beta | restore de ensaio **não validado**; sem standby |
| **Backup pré-migration** | `migrate-production.yml` chama o script antes de aplicar migration | **(a) é fail-open** (`\|\| echo "…continuando"`) → se falha, a migration segue; **(b) não funciona hoje**: o secret `DATABASE_URL` do CI aponta para o **hostname interno** do Railway (D-527), inacessível dos runners → o dump falha e o workflow tolera |
| **Backup automático** | — | **inexistente** (T181: "o dado existe apenas no volume") |
| **Alerta de falha** | Alertas existentes: 5xx (CRITICAL), auth (WARNING), uptime `*/10`, Sentry, `/metrics`, `/api/v1/admin/alerts/status` | **nada observa o backup** (não há o que observar enquanto não roda) |
| **Canal de alerta** | **GitHub Issues** com dedup (lógica pura + self-test) em `health-check.yml`, `uptime-check.yml`, `alertas-metricos.yml`, `deploy-reconciler.yml` (`issues: write`) | **reutilizável** — não exige serviço novo |

---

## 3. Opções de automação (comparadas, sem escolher por conta própria)

| Opção | Pró | Contra | Segredo necessário | PII / superfície | Rollback |
|---|---|---|---|---|---|
| **A — agendar o script atual** (cron/agendador da plataforma do container) c/ **destino externo** | reusa script já validado (T332); baixo custo; sem código novo | precisa de binário `pg_dump` no ambiente + credencial de escrita no destino; se rodar no container da API, compete com o serviço | `DATABASE_URL` + credencial de destino | dump = PII em trânsito; exige criptografia e destino privado | desligar o agendador |
| **B — backup gerenciado da plataforma do banco** (Railway managed Postgres: aba Backups + Alerts do volume) | **menor superfície nova**; retenção/restore gerenciados; sem código; sem mover credencial; já cobre "destino separado + retenção" | depende do plano/custo do provedor; políticas de retenção/região/cifra são do provedor; export pode ser limitado | nenhuma nova no código | PII fica sob o provedor (já é o caso) | desligar a opção no painel |
| **C — GitHub Actions scheduled** rodando o backup remoto | reusa o padrão de workflows já existente; alerta fácil (Issue) | **exige o banco alcançável de fora** (hoje o secret é o hostname interno — D-527) → proxy TCP público ou túnel; **CI com credencial de produção** = superfície sensível nova; runner efêmero → destino tem de ser externo | `DATABASE_URL` público + credencial de destino + possivelmente OIDC | amplia superfície (CI→produção); exige RBAC e retenção de artefato | desabilitar o workflow |
| **D — serviço externo de backup/DB-ops** | features prontas (WORM, PITR, drill) | contrato/custo/lock-in; **PII sai para terceiro** (avaliação LGPD/jurídica); onboarding | credenciais do provedor | maior (terceiro com dados pessoais) | encerrar contrato |
| **E — manual com checklist rígido** | zero infra nova | **fail-open por natureza** (depende de humano lembrar); sem alerta real; **não é estado recomendado para GO** | — | — | — |

**Critérios de escolha (recomendados):** entregar **automação + destino fora do volume primário +
retenção definida + alerta de falha + restore testado** com a **menor superfície nova** e **sem expor
credencial de produção a novos ambientes**. Por esse critério, **B** tende a ganhar, com **A** como
complemento (dump lógico portátil) — a decisão é do Operador.

---

## 4. Política mínima de destino

- **Fora do volume primário do banco** (obrigatório) e **fora do FS efêmero do container** (hoje o
  script grava em `./backups` → perdido em redeploy).
- **Criptografia em trânsito e em repouso**; bucket/objeto **privado** (nunca path público).
- **Least privilege**: credencial de escrita **restrita ao prefixo de backup**, sem `list/delete` amplo
  quando evitável; separar credencial de *write* e de *restore*.
- **Retenção** coerente com o script (**30 d**) ou definida pelo provedor; revisar antes de Beta pública
  (sugestão já no runbook: **PITR/WAL** ou frequência maior).
- **Imutabilidade/WORM** desejável, não obrigatória nesta fase.
- **Separar** backup operacional (diário) de snapshot de emergência (pré-migration).

## 5. Política de segredos

- O backup **nunca** pode logar `DATABASE_URL`, senha, token, cookie ou connection string — apenas
  **nomes** de variáveis.
- Se a implementação usar **GitHub/Railway secrets**, descrever o requisito **sem criar/alterar** o
  segredo nesta fase; escopo mínimo + rotação documentada.
- O alerta de falha **não** pode conter connection string, path de destino ou PII — só estado/idade.
- O CI **não** deve receber credencial de produção enquanto não houver **endereço alcançável** e RBAC
  definidos (ver D-527).

## 6. Política de PII / LGPD

- O dump **contém dados pessoais** (contas, sessões, consentimentos, auditoria) → tratar como
  **artefato de dado pessoal**: acesso restrito, destino privado, cifrado, retenção definida.
- **Logs sanitizados**; relatórios de drill usam **apenas contagens agregadas** (nunca linhas/PII).
- **Exclusão/purga** deve ter procedimento (o backup não pode virar "lixeira eterna" de dados de
  titulares que pediram exclusão) — alinhado a `docs/05-security-compliance/INCIDENT_RESPONSE.md` e ao
  fluxo LGPD de purga (admin-only).
- O **restore de ensaio** não pode expor PII em logs/telas de CI/relatório.

## 7. Alerta de falha de backup (design, sem implementar)

**Sinais a monitorar:** (1) ausência de sucesso novo acima da **janela máxima**; (2) **falha
consecutiva**; (3) falha de upload/destino; (4) **falha de integridade** (`pg_restore --list` já valida
no script); (5) expiração de retenção; (6) **drill de restore periódico não executado**; (7) tamanho
anômalo (0 bytes / queda brusca).

**Mecânica recomendada (reusa o padrão existente):** um workflow agendado (ex.: `backup-health.yml`)
com **lógica pura + self-test** (como `uptime-check`/`alertas-metricos`) que lê o **estado do último
backup** e **abre/atualiza/fecha uma Issue** com dedup — **sem serviço externo**. Requer uma **fonte de
estado** a definir na implementação (ex.: manifesto de status ao lado do artefato no destino durável, ou
metadados do provedor). **Não** criar endpoint/tabela nesta tarefa.

## 8. Restore de ensaio (procedimento)

**Ambiente:** efêmero/staging/local seguro — **nunca produção**.

1. **Selecionar** o dump mais recente (ou o anterior a um incidente), fora do path público.
2. **Verificar integridade**: `pg_restore --list` (o script já faz) + tamanho/checksum.
3. **Restaurar** em DB **novo** (`pg_restore --clean --if-exists`) — sem tocar schema de produção.
4. **Validar**: contagens **agregadas** por tabela sensível (sem listar PII) + integridade da cadeia
   SHA-256 do `audit_log` (prova de não-tampering).
5. **Subir a app em modo leitura** no alvo e rodar **smoke**.
6. **Registrar**: tempo total (→ **RTO real medido**), falhas, versão do dump.
7. **Periodicidade sugerida:** antes do GO + **trimestral** (ajustável).
8. **Rollback do ensaio:** descartar o DB efêmero; nenhum efeito em produção.

## 9. RPO/RTO alvo

- **RPO atual documentado:** ≤24 h (dump diário). **Aceitável para Beta Fechada**; revisitar antes de
  Beta pública (frequência maior ou PITR).
- **RTO:** estimar com base no **tamanho real do banco** e no procedimento do §8; registrar o **tempo
  medido** no primeiro drill. Sem standby, o RTO de dado = tempo de restore.
- **Regra de GO sugerida:** GO **só** com **backup automático configurado** *ou* **RPO/RTO aceitos
  formalmente** com limites.

## 10. Matriz de decisão do Operador

```text
DECISAO_OPERADOR_BACKUP_READINESS_2026-10-13

1. ESTRATEGIA        = A_AGENDAR_SCRIPT | B_GERENCIADO_PLATAFORMA | C_GITHUB_ACTIONS | D_SERVICO_EXTERNO | E_MANUAL_RISCO_ACEITO
2. BACKUPS_PG        = AUTORIZAR_CONFIGURACAO_MINIMA | ACEITAR_RISCO_FORMAL_COM_LIMITES | ADIAR_GO
3. RETENCAO          = 30d | __ d | PITR/WAL
4. DESTINO           = plataforma | bucket_privado_externo | __
5. ALERTA_BACKUP     = AUTORIZAR_VIA_GITHUB_ISSUES | autorizar_outro | ACEITAR_RISCO_FORMAL
6. RESTORE_ENSAIO    = AUTORIZAR_DRILL_EM_AMBIENTE_SEGURO | ADIAR
7. RESPONSAVEL       = Operador | Operador+Doer | __
8. CONVITES_RESTRITOS = SIM_COM_LIMITES | NAO
9. DEPLOY_PRODUCTION = MANTER_WAITING | APROVAR_MANUAL_APOS_CHECKLIST
10. GO_CONVITES      = SUSPENDER | CONDICIONADO_A_BACKUP_E_RESTORE | LIBERAR_FORMALMENTE
```

**Recomendação técnica (não vinculante):** `1=B` (menor superfície; já entrega destino+retenção) com
`E`/`A` apenas como complemento; `2=AUTORIZAR_CONFIGURACAO_MINIMA`; `3=30d`; `4=plataforma`;
`5=AUTORIZAR_VIA_GITHUB_ISSUES`; `6=AUTORIZAR_DRILL`; `7=Operador+Doer`; `8=SIM_COM_LIMITES`;
`9=MANTER_WAITING`; `10=CONDICIONADO_A_BACKUP_E_RESTORE`.

## 11. Critérios de NÃO-aceite (rejeitam a solução)

- Backup **manual** como estado permanente; **fail-open** (migration prossegue sem backup).
- Backup no **mesmo volume** do banco ou em **FS efêmero** do container (perdido em redeploy).
- **Destino público**; **log de PII/segredo/connection string**.
- **Restore nunca testado**; ausência de retenção; ausência de procedimento de emergência.
- **Acesso amplo** ao backup (sem least privilege); CI com credencial de produção sem endereço
  alcançável/RBAC.
- **GO** sem decisão formal do Operador.

## 12. Plano futuro (sem executar)

| Tarefa | Escopo | Pré-requisito |
|---|---|---|
| **T226** | Implementar **automação mínima** (opção escolhida) + destino durável + retenção | autorização do Operador |
| **T227** | Implementar **alerta de falha de backup** (padrão GitHub Issues + fonte de estado) | T226 |
| **T228** | Executar **restore drill** em ambiente seguro e registrar RTO medido | T226 (artefato existente) |
| **T229** | Reconciliação final do GO readiness (backup+restore aceitos) | T226–T228 |

*Nota de escopo:* a mudança do secret `DATABASE_URL` do CI para um endereço alcançável (D-527) é
**decisão de infra/segredos do Operador** — não implementada aqui.

## 13. Confirmações

- **Nada** foi executado: nenhum backup, nenhum restore, nenhum cron/workflow/secret/infra.
- **Nenhum** acesso a produção, banco real, Railway/Vercel dashboard ou provedor.
- **Nenhum** alerta interagido; **nenhum** código/deps/schema/flag alterado.
- Diff restrito a **docs** (+ checklist/PENDENCIAS/worklog).
- **GO para convites: permanece SUSPENSO.**

---

## 14. Referências

`scripts/backup-db.sh` · `docs/06-devops-deployment/BACKUP_DR.md` ·
`.github/workflows/{migrate-production,uptime-check,health-check,alertas-metricos,deploy-reconciler}.yml` ·
`docs/07-operations-marketing/MONITORING.md` · `PENDENCIAS_OPERADOR.md` (T181 — decisão Postgres) ·
`docs/08-security/reports/{pre-go-evidence-pack,beta-core-journey-audit}-2026-10-13.md` ·
`docs/05-security-compliance/INCIDENT_RESPONSE.md`.

# Reconciliação de contas sintéticas ADMIN em produção (T200) — read-only

**Data:** 2026-10-12 · **Fase:** F08-tests-security · **Tarefa:** T200-prod-synthetic-admin-reconciliation-read-only
**Classificação:** **`SYNTHETIC_ADMIN_ALREADY_REVOKED_DOC_DRIFT`** — a remediação da T184 está
**íntegra em produção**; o item "admin sintético ainda ADMIN" registrado na T199 era
**drift documental** (pendência de 2026-10-05, anterior à remediação de 2026-10-11, propagada
sem re-verificação). **Nenhuma mutação foi feita** — apenas leituras agregadas.

## 1. A divergência

| Fonte | Afirmação |
|---|---|
| **T184** (2026-10-11, remediação) | 7 contas `@mediarate.test`; **1 papel ADMIN revogado** (`deleteMany` em `usuario_papel`); verificação pós: 0 admins, 0 sessões ativas |
| **T199** (2026-10-12, auditoria GO) | listou "**admin\*\*\*@mediarate.test ainda ADMIN**" como PENDENTE_OPERADOR (higiene) |

A T199 **não consultou produção** para esse item — herdou a pendência documental do
Pacote de GO (escrita em **2026-10-05**, quando a conta realmente era ADMIN) sem re-verificar.
A T200 veio resolver exatamente isso, com evidência atual.

## 2. Metodologia (read-only; agregados; sem PII)

`railway ssh` (container, `/app`, precedente T184) com script Node efêmero (removido ao final) +
`bootstrapRlsSeed`; **apenas `count`/`groupBy`/agregações** — nenhuma lista de e-mails, tokens,
hashes, nomes ou IPs. Dois probes (`t200-probe.cjs`, `t200b-probe.cjs`), ambos removidos.

## 3. Evidência (agregados sanitizados, 2026-10-12)

| Agregado | Valor |
|---|---|
| Usuários com e-mail em `@mediarate.test` | **7** (as mesmas da T184; nenhuma conta criada/deletada desde) |
| **Papel ADMIN no domínio de teste** | **0** ✅ |
| Papéis das 7 contas de teste | `USER` ×7 (nenhum papel elevado) |
| Papel ADMIN **total** na produção | **1** — e como o domínio de teste tem 0, esse 1 está **fora** do domínio de teste (conta legítima do Operador, elevação D-563 intencional) |
| Sessões ativas no domínio de teste | **0** ✅ |
| Eventos de auditoria (30d) das contas de teste | 34 no total; **último em 2026-10-05** |
| Logins dessas contas (30d) | **25 pré-remediação / 0 pós-remediação** (corte 2026-10-11) ✅ |
| Última sessão criada dessas contas | 2026-10-09 (pré-remediação) ✅ |

Toda a atividade observada (logins, `remove`/`move`/`add`, upload, logout) é **anterior à
remediação** — coerente com o uso operacional de E2E/smoke da equipe no período. **Zero
atividade pós-2026-10-11** confirma que as senhas invalidadas pela T184 permanecem
inutilizadas e nenhuma conta foi recriada/re-elevada.

## 4. Classificação e consequência para GO

**`SYNTHETIC_ADMIN_ALREADY_REVOKED_DOC_DRIFT`** — não há ADMIN sintético em produção. O item
era bloqueio **factual inexistente**: a pendência de higiene foi **resolvida pela própria T184**
(revogação do papel) e a documentação é que estava atrasada. Consequências:

- O item sai da lista de riscos reais de GO (atualizado na `GO_READINESS_CHECKLIST.md`);
- **Não há necessidade de T201** (higiene least-destructive) — nada a remediar;
- O único ADMIN de produção é a conta legítima do Operador (D-563) — fora do escopo de
  "sintético", mantida por decisão dele;
- As 7 contas `@mediarate.test` permanecem em produção como `USER` inativas (senhas
  inválidas, 0 sessões) — eventual remoção/renomeação continua opcional e é decisão do
  Operador (não bloqueia GO; não é ADMIN).

## 5. Confirmações

**Nenhuma mutação** em produção (nenhum update/insert/delete/role/sessão alterados); nenhum
segredo/PII individual impresso (apenas contagens, papéis agregados e datas); nenhuma
interação com alertas/PRs/GitHub settings; GO **não declarado** e permanece **SUSPENSO** pelas
demais decisões do pacote `DECISAO_OPERADOR_GO_READINESS_2026-10-12`. Contaminação `123ce28e`
ausente; PR docs-only com gates verdes e smoke passivo 7/7 (STATUS).

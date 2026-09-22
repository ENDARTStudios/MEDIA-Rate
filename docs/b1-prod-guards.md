# B1 — Guardas operacionais de produção (T031)

**Contexto:** `main` é deploy de produção automático (Vercel + Railway) e o **entrypoint
do container Railway aplica `prisma migrate deploy` no boot de TODO deploy** (confirmado
nos logs de boot; o job de migration saiu do push path em D-527). Consequência: um PR com
migration problemática mergeado em `main` vai direto para produção, sem stage e sem trava.
Este documento define o que o guard CI exige, a proposta de staging e os caminhos de
migration manual — com as decisões que cabem ao Operador (ver `PENDENCIAS_OPERADOR.md`).

---

## 1. Guard `migration-safety` (CI) — implementado (T031)

**Arquivo:** `scripts/ci/migration-safety.mjs` · **Job:** `Migration Safety (B1)` no `ci.yml`.

**Gatilho:** PR (para `main`) que altera `apps/api/prisma/migrations/**` **ou**
`apps/api/prisma/schema.prisma`. PR sem mudança de banco é liberado sem exigências.

**Contrato do PR de migration (os 3 itens, todos obrigatórios):**

1. **Label** `migration-review` no PR.
2. **Plano de rollback** na descrição — seção `## Rollback` (ou `**Rollback**`) com
   conteúdo real (≥ 15 chars). Exemplo:
   ```markdown
   ## Rollback
   Reverter o merge (git revert) e executar `prisma migrate resolve --rolled-back
   <nome_da_migration>`. Backup diário do 7.7 disponível; validar com SELECT antes.
   ```
3. **Declaração de migration** — linha iniciando com `Migration:` (ou `**Migration**`,
   aceita bullet `- Migration:`) descrevendo a intenção. Menção solta a "migration" no
   meio do texto NÃO conta (ancorado no início de linha).

**Fail-closed:** se qualquer metadado estiver ilegível (JSON de labels quebrado, corpo
vazio, arquivos ilegíveis) e houver mudança de banco → **bloqueado**. O job roda um
self-test determinístico (`--self-test`, 10 fixtures, sem rede/segredos) antes de avaliar.

**O que o guard NÃO cobre (limites honestos):**
- Push direto em `main` é proibido por D-457 (ruleset), não pelo guard.
- O guard valida o CONTRATO do PR, não a QUALIDADE da migration — o plano de rollback
  continua sendo responsabilidade de quem escreve e de quem revisa.
- O job só roda em `pull_request` (em push pós-merge não há como exigir label).

**Template de descrição sugerido** (copiar na criação do PR de migration):

```markdown
Migration: <o que a migration faz, em 1 linha>

## Rollback
<como reverter: revert do merge + prisma migrate resolve/rollback; estado do backup;
validação pós-rollback>
```

---

## 2. Staging / Environment protection — PROPOSTA (decisão do Operador)

Duas opções, em ordem de custo. **Nenhuma foi executada** (restrição T031).

**Opção A — GitHub Environment protection no deploy atual (custo 0, recomendação inicial).**
Hoje `deploy.yml` roda no push para `main` (pós-merge). Criar environment `production`
com required reviewers faz o health-check/deploy aguardar aprovação humana:

1. GitHub → repo → Settings → Environments → New environment: `production`.
2. Required reviewers: Operador. (Opcional) Deployment branches: `main` only.
3. Mover os jobs de `deploy.yml` para `environment: production` — a aprovação passa a
   travar o step pós-merge (janela para reagir antes do health check, NÃO antes do
   deploy do Railway, que é nativo e independente — ver limitação abaixo).
4. **Limitação honesta:** o deploy Railway é disparado pelo push na main (integração
   nativa), ANTES de qualquer aprovação GitHub. A Opção A adiciona gate e sinal, mas
   não impede o deploy Railway em si. Impedir de verdade exige a Opção B.

**Opção B — branch `staging` com Railway environment separado (custo: 1 serviço + 1 DB).**

1. Railway: duplicar o serviço API para um environment `staging` (banco separado) e
   conectar o deploy ao branch `staging` (Settings → Source → Branch).
2. GitHub: criar branch `staging`; CI roda nela igual; deploy de produção só via
   merge `staging → main`.
3. Vercel: apontar o preview/produção conforme desejado (produção continua `main`).
4. Custo mensal extra no Railway (serviço + Postgres staging) — decidir com o Operador.

**Recomendação T031:** Opção A já na Beta; Opção B avaliada se o ritmo de migrations
aumentar. Ambas constam como pendência — **nada foi configurado**.

---

## 3. Migration manual (`migrate-production.yml`) — caminhos (decisão do Operador)

O workflow manual existe (D-527) mas o secret `DATABASE_URL` usa hostname **interno**
do Railway (`postgres.railway.internal`), inalcançável de runners (#148 item 8). Caminhos:

| Caminho | Passos | Risco/custo |
|---|---|---|
| **Proxy TCP público** | Railway → criar TCP proxy do Postgres com allowlist de IPs dos runners + credencial forte; atualizar secret `DATABASE_URL` para a URL pública. | Exporia o Postgres à internet (mitigado por allowlist+TLS); mais simples de manter. |
| **Self-hosted runner na rede** | Rodar um runner GitHub dentro da rede Railway (ex.: serviço runner no mesmo environment) e marcar o job `migration-production` com `runs-on: [self-hosted]`. | Runner é superfície de ataque — precisa hardening; sem exposição do banco. |
| **Console Railway (manual, sem CI)** | Operador abre o Railway console → service → Shell → `npx prisma migrate deploy` com a env do serviço (backup antes: `scripts/backup-db.sh`). | Zero superfície nova; depende de disponibilidade do Operador; auditoria manual (colar log no PR). |

**Recomendação T031:** caminho **console Railway** como padrão do incidente (mais
simples, zero superfície nova), proxy TCP somente se migrations manuais se tornarem
rotina. Decisão e provisionamento são do Operador (P012).

---

## 4. Checklist de adoção (após merge deste PR)

1. Operador torna `Migration Safety (B1)` **required check** na ruleset de `main`
   (Settings → Rules → Rulesets → protect-main → Add required status check). Enquanto
   não for required, o guard existe mas não trava o merge (P011).
2. Operador decide staging (Opção A/B) e caminho de migration manual (P012/P013).
3. Primeiro PR real de migration valida o contrato ponta a ponta (label + rollback +
   declaração) e o resultado fica registrado no worklog.

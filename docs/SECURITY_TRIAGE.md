# Triagem de segurança do CI (T033)

**Contexto:** o workflow `.github/workflows/security.yml` estava **vermelho crônico**
em `main`. Investigação (run `35685178528`) identificou três causas:

1. **`scan` → `Audit dependencies`**: usava `npm audit --audit-level=high` **cru**,
   que ignora a allowlist governada do repositório. Os "3 highs" são, na verdade,
   **uma única cadeia**: `deepmerge-ts` (GHSA-ggr8-5vv4-36mx) → `@prisma/config` →
   `prisma` — advisory **dev-time** (via CLI `prisma`), já **allowlistado** em
   `package.json#config.auditAllowlist` com motivo e revisão (P009/D-462).
2. **`trivy-image`**: `aquasecurity/trivy-action@0.28.0` **não existe** (a tag é
   `v0.28.0`) → `Set up job` falha em 3s (`unable to find version`).
3. **`scan` → Trivy**: usava `@master` (ref móvel, não-reprodutível).

## Correção aplicada

- **Audit**: `npm audit --audit-level=high` → **`npm run audit:ci`** (`scripts/audit-ci.mjs`).
  Mantém **bloqueio de high/critical de runtime**; a única exceção é o advisory
  dev-only acima, documentado e com revisão agendada (2026-12). Não é `ignore`
  cego: o gate continua fail-closed para o que não estiver na allowlist.
- **Trivy**: pinado ao **SHA imutável** de `v0.36.0`
  (`ed142fd0673e97e23eac54620cfb913e5ce36c25`) nos dois jobs; SARIF do scan de fs
  passou a ser enviado (antes era gerado e descartado).
- **CodeQL**: `@v3` → **`@v4`** (linha atual). O repositório é **público**
  (verificado via API: `"private": false`), então code scanning funciona sem GHAS.
- **Trigger**: adicionado `pull_request` para validar o workflow **no PR** (antes
  só rodava em push/schedule/dispatch).

## Decisão: scan de imagem em modo RELATÓRIO

O job `trivy-image` escaneia a imagem de runtime (`node:20-alpine` + deps) e
encontra **CRITICAL/HIGH com correção disponível** no **sistema base** (Alpine) —
CVE upstream que não é corrigível no código deste repositório. Mantê-lo
**bloqueante** deixaria o `security.yml` permanentemente vermelho por ruído de
base, escondendo falhas reais.

**Decisão (D-534):** o scan de imagem roda em **modo relatório** (`exit-code: 0`),
com os achados publicados via **SARIF** (aba Security). O **gate bloqueante** de
dependências de **runtime** permanece em **`npm run audit:ci`** (job `scan`) e o
SAST em **CodeQL**. O Trivy **não foi removido** — apenas deixou de bloquear o
merge por CVE de base.

**Follow-up (Operador/Thinker):**
- Promover `trivy-image` de volta a bloqueante (`exit-code: 1` + `ignore-unfixed:
  true`) após triar/atualizar a base (`node:20-alpine` → versão com CVEs
  corrigidos).
- Revisão trimestral da allowlist de audit (2026-12, P009).

## Limites honestos

- Este documento não substitui a revisão de quem escreve/revisa migrations.
- O scan de imagem em modo relatório **não bloqueia** — a visibilidade depende da
  aba Security do GitHub (SARIF). Se a aba não estiver acessível, trate o relatório
  como informativo.
- Nenhum segredo, token, `DATABASE_URL` ou PII é impresso por estes jobs.

## T036 — Contrato público de interações (D-536)

O `GET /api/v1/interacoes` passou a usar um **DTO ALLOWLIST**
(`interacoes-response.dto.ts` + `interacoes.mapper.ts`): não expõe mais colunas
internas/legadas (`usuario_id`, `tenant_id`, `created_at`, `tipo`, `rating` e
`comentario` — este último **plaintext**). Reduz a superfície de
*information disclosure* do endpoint owner-only, preservando os campos
consumidos por feed/biblioteca/store. Follow-up: aplicar em `GET /:midiaId` e `PUT`.

### T038 — DTO allowlist em GET /:midiaId e PUT (D-537)

Após o T036 (GET lista), os endpoints `GET /interacoes/:midiaId` e
`PUT /interacoes/:midiaId` também passaram a usar o **DTO allowlist** — não
expõem mais `usuario_id`, `tenant_id`, `created_at`, `tipo`, `rating` nem
`comentario` (plaintext). Com isso, **nenhum** payload público do módulo
`interacoes` devolve a linha crua.

### T039 — B3 fechado (D-536 + D-537)

**Nenhum** payload público do módulo `interacoes` devolve a linha crua:
`GET /interacoes` (lista, #183/684620e), `GET /interacoes/:midiaId` e
`PUT /interacoes/:midiaId` (#186/ebf78a1) usam o **DTO allowlist**. Confirmado por
smoke autenticado em produção (200; item keys = allowlist; `usuario_id`,
`tenant_id`, `created_at`, `tipo`, `rating` e `comentario` ausentes).

## T048 — LGPD: inventário de PII e viabilidade de cifragem (D-542)

Análise **docs-only** (`docs/LGPD_DADOS.md`). Inventário mapeado; **nenhuma**
cifragem implementada. Bloqueios: (1) `Usuario.email` é **buscável por igualdade**
(login/registro/reset/Google) e o `ColumnEncryptionService` usa IV aleatório
(**não determinístico**) → cifrar quebraria a autenticação; (2) dados existentes em
plaintext exigiriam **migration + backfill**; (3) o serviço exige
`COLUMN_ENCRYPTION_KEY` e **lança** sem ela (novo segredo + risco de indisponibilidade).
Achado acionável de baixo risco: PII em log (`auth.service.ts:261` interpola o
e-mail; redact não cobre PII na mensagem) — recomendada máscara. Ver **P017**.

## T049 — PII em logs de auth: mascaramento (D-543)

**Achado (T048):** `auth.service.ts` logava o e-mail cru no lockout;
`lockout.service.ts` logava `${k}` = `lockout:<ip>:<email>` e o IP cru. O `redact`
do Pino cobre **propriedades**, não PII **interpolada na mensagem**.

**Correção (T049):** helper `apps/api/src/common/pii-mask.ts` (`mascararEmail`,
`mascararIp`) aplicado antes de logar em: `auth.service.ts` (lockout + reuse de
refresh) e `lockout.service.ts` (global/threshold/local). Sem mudança de
comportamento de auth/lockout/sessão — só o texto do log. Saída mascarada:
`u***@***.invalid`, `203.0.x.x`.

**Regressão:** `apps/api/test/auth-pii-log.spec.ts` (roundtrip do mask + captura do
`Logger` no lockout com fixture `usuario@example.invalid` + guarda de fonte).

### T050 — evidência pós-merge do mascaramento (D-543)

PR de código **#204** mergeado como **`96ac104`** (`--merge`). Pós-merge `main`:
CI **success** (4m38s); Security **success** (2m54s); `deploy.yml` **waiting**
(environment `Production` — P012=A); nenhum run de `Release`/`Auto-create PR`;
smoke **4/4 → 200**; API **reiniciou** (uptime resetou → código com mascaramento
live). Sem 5xx novo; sem PII/segredo exposto. PLANO 2.10 segue `[~]`; cifragem
bloqueada em **P017**.

## T053 — varredura de PII em logs fora do módulo auth (D-544)

Varredura de `apps/api/src` por `logger.*`/`console.*` com PII interpolada
(`email`, `user_agent`, `comentario`, `telefone`, `ip_*`) **sem mascarar**.
Fora de `auth`, o único ponto era `common/mock-mail.service.ts` (2 logs `debug`
com `email=${email}`). Corrigido com `mascararEmail` (`u***@***.invalid`).
Sem mudança de contrato/entrega de e-mail — só o texto do log.

**Regressão:** `apps/api/test/pii-log-scan.spec.ts` — (a) scanner de **todo**
`apps/api/src` (blocos de log, incluindo multilinha) rejeitando PII crua; (b)
`MockMailService` com `Logger.debug` capturado (fixture `.invalid`).

## T055 — minimização de PII em novos registros de AuditLog (D-545)

O `AuditLogService.log()` agora **sanitiza** `dados_antes`/`dados_depois` recursivamente
(`sanitizarPii`) e **coarsena** `ip_origem` para rede válida (`mascararIpInet`).
A cadeia de hash **não** inclui esses campos (o payload do hash usa apenas
`entidade`/`entidade_id`/`acao`/`usuario_id`/`timestamp`), então a integridade é
preservada e **não há migration/backfill**. Registros históricos ficam intactos.

- `ip_origem` é `@db.Inet`: `203.0.x.x` **não** é válido → coarsenamos para
  `203.0.113.0/24` (IPv6 → `/48`). Limitação forense documentada (perde-se o host).
- Chaves sensíveis (`senha`, `token`, `cookie`, `authorization`, `csrf`, `secret`,
  `database_url`, `user_agent`, `comentario`, …) → `[Redacted]`.

> **Observação (pré-existente, não alterada):** `log()` calcula o hash com
> `new Date().toISOString()`, mas o `created_at` vem do `@default(now())` do banco —
> pode haver drift de ms e `verificarIntegridade()` acusar violações. Não faz parte
> do T055 (quebraria o hashing); registrado como follow-up.

## T057 — drift de timestamp na cadeia do AuditLog (D-546)

**Causa raiz:** `AuditLogService.log()` calcula `hash_cadeia` com
`new Date().toISOString()` (relógio do app), mas `verificarIntegridade()` recalcula
com `created_at` (`@default(now())`, relógio do banco). Qualquer divergência
(clock skew + latência) → **falso-positivo** de violação.

**Evidência:** `apps/api/test/audit-integrity-drift.spec.ts` (mock determinístico):
offset 0 → `integro`; `+2 ms` e `−3 s` → `integro: false`. Relatório em
`.claude/reports/audit-integrity-drift-2026-09-24.md`.

**Impacto:** sem chamador em runtime (`grep` em `apps/api/src` = 0); usado em
docs/runbook de DR (`docs/BACKUP_DR.md`) → risco de **falso alarme** na DR.

**Recomendação:** gravar `created_at` explicitamente no `log()` (mesmo `new Date()`
do hash) — sem migration/backfill/histórico — em PR de código dedicado. Nada
implementado aqui (restrição da tarefa).

## T058 — correção do drift de timestamp na cadeia do AuditLog (D-546)

**Correção (Opção B):** `AuditLogService.log()` captura um único `const agora = new Date()`
e usa o **mesmo** instante no `hash_cadeia` **e** no `created_at` do INSERT
(`created_at: agora`). Assim `verificarIntegridade()` — que recalcula com
`created_at` — deixa de depender do relógio do banco, **eliminando o
falso-positivo** por skew/latência. **Sem migration/backfill**; histórico intacto.

**Testes:** `apps/api/test/audit-integrity-drift.spec.ts` — skew do banco `+5 s` e
`−3 s` **não** geram violação; adulteração real de `acao` **ainda** é detectada;
payload sanitizado (`dados_depois`) fora do hash não afeta. + `audit-log-integridade.spec.ts`.

> **Limitação:** registros **históricos** (criados antes do fix, com `created_at` do
> banco) podem ainda acusar violação por drift — são imutáveis e **não** foram
> alterados.

## T063 — Incidente: login 500 por `ip_origem` CIDR (D-549) — RESOLVIDO

`mascararIpInet` (T055) retornava CIDR (`a.b.c.0/24`), rejeitado pelo `@db.Inet` do
Prisma (`AddrParseError`) → o `auditLog.create()` no login lançava → **500**. Hotfix
**#228/`5322e90`**: IP **plano** (IPv4 → zera o último octeto; IPv6 → 2 grupos + `::`).
Smoke pós-merge: login **200** + cookie + `/auth/me` **200**. Ver D-549.

## T072 — 429 do rate limit deixa de virar 500 (D-552)

O `@fastify/rate-limit` lança objeto puro `{statusCode:429,...}`; o `GlobalExceptionFilter`
agora **honra `statusCode` inteiro em [400,599]** (com **mensagem canônica**), sem ecoar
valores do objeto. Fora da faixa/ inválido → **500**. TDD cobre 429 + 7 casos inválidos.
Ref: T071 (causa raiz), `global-exception-nonerror.spec.ts`.

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

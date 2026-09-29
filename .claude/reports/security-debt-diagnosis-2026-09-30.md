# T137 — Diagnóstico read-only da dívida de segurança (P009 / P017 / PR #74)

- **Data/hora UTC:** 2026-09-29T18:59Z
- **Fase:** F08-tests-security
- **Tarefa:** T137-security-debt-diagnosis
- **Tipo:** read-only / docs-only (nenhuma dependência, código, schema, segredo, infra ou environment alterado)
- **Base:** `origin/main` = `9309e956` (após PR #357)
- **Decisão final:** `SECURITY_DEBT_ALREADY_DECIDED` (com 1 follow-up docs-only e 1 pergunta de governança)

## 1. Sumário executivo

A dívida de segurança levantada (P009, P017, PR #74/T041) **já está diagnosticada e decidida** no repositório, com governança e testes. **Nenhuma correção de código/dependência é necessária nem segura para a Beta neste momento.** O que restava era **consolidar evidência** e responder com precisão ao Operador.

| Item | Estado real | Ação necessária agora? |
|---|---|---|
| **P009** deps HIGH | **3 HIGH = 1 cadeia** dev-only (`deepmerge-ts` GHSA-ggr8-5vv4-36mx → `@prisma/config` → `prisma`); **aceito (D-462)** com allowlist cirúrgica + gate `audit:ci` **verde** | **Não** (manter; revisão 2026-12) |
| **P017** cifragem de colunas | **Adiada para pós-Beta (D-557)** com plano, compensações e **guarda anti-regressão** | **Não** (manter deferimento) |
| **PR #74 / T041** | **MERGED** (2026-09-07) — pendência **resolvida**; nota do PLANO **obsoleta** | **Follow-up docs-only** (reconciliar nota stale) |

## 2. Metodologia (read-only)

```text
git fetch origin; git status --short; git rev-parse HEAD      -> main=9309e956; working tree limpo
npm audit --audit-level=high --json                           -> 3 HIGH (JSON resumido, sem output bruto)
npm ls prisma @prisma/client deepmerge-ts                     -> prisma@6.19.3 -> @prisma/config@6.19.3 -> deepmerge-ts@7.1.5
npm run audit:ci                                              -> "audit-ci: OK (alto/critico zerados fora da allowlist governada)" EXIT=0
gh pr view 74 / gh pr view 300                                -> #74 MERGED; #300 open/BLOCKED
rg (ColumnEncryptionService / COLUMN_ENCRYPTION_KEY / schema) -> servico existe, 0 usos (nao wired)
git show/read DECISOES.md (D-462, D-542, D-557), package.json (auditAllowlist), scripts/audit-ci.mjs
```

Nenhum comando mutante executado (`npm audit fix`/`install`/`update`/upgrade **não** rodados). Nenhum segredo/PII no relatório.

## 3. Matriz por item

### 3.1 P009 — dependências HIGH

| Campo | Valor |
|---|---|
| Severidade | **HIGH ×3**, mas **uma única cadeia** |
| Cadeia | `deepmerge-ts` (GHSA-ggr8-5vv4-36mx, stack exhaustion) → `@prisma/config` → `prisma` |
| Direto? | `prisma@6.19.3` é direto (devDependency de build/migrate/seed); `@prisma/config`/`deepmerge-ts` transitivos |
| Runtime vs dev | **dev-time** (CLI prisma). `@prisma/client` (runtime) **não** carrega o pacote → nenhum request alcança |
| Fix disponível | `prisma@6.12.0` → **downgrade breaking** (sem upgrade fix) |
| Governança | `package.json` `config.auditAllowlist` (GHSA + motivo D-462 + `revisao: 2026-12`); gate `npm run audit:ci` (`scripts/audit-ci.mjs`) |
| Gate atual | **verde** (`audit-ci: OK`) — bloqueia high/critical de runtime, exceto o advisory dev-only allowlistado |
| Impacto na Beta | **Baixo** — sem superfície de runtime; risco residual formalmente aceito (D-462) |

### 3.2 P017 — cifragem de colunas sensíveis

| Campo | Valor |
|---|---|
| Serviço | `apps/api/src/common/column-encryption.service.ts` (AES-256-GCM) |
| Wired? | **Não** (0 usos fora do próprio módulo/ teste) |
| Campos sensíveis | `Usuario.email` (buscável por igualdade), `Usuario.nome`, `PreferenciaUsuario.preferencias_blob`, `WatchlistEntry`, `comentario` (`@db.Text`, plaintext hoje) |
| Segredo | `COLUMN_ENCRYPTION_KEY` (documentado em `.env.example`; serviço **lança** se ausente) |
| Decisão | **D-542** (viabilidade: não implementar agora) + **D-557** (adiado pós-Beta, com plano `docs/05-security-compliance/lgpd-column-encryption-plan.md`) |
| Compensações ativas | PII mask (T049/D-543), `AuditLog` sanitizado (T055/D-545), argon2id, tokens hash, TLS, LGPD export/delete, DTO allowlist |
| Guarda anti-regressão | `apps/api/test/schema-sensitive-columns.spec.ts` (allowlist congelada; coluna nova sem decisão falha o CI) |
| Impacto na Beta | Resíduo aceito com compensações; ativar às cegas seria **mais arriscado** (busca determinística + migration/backfill + segredo) |

### 3.3 PR #74 / T041

| Campo | Valor |
|---|---|
| Estado | **MERGED** (2026-09-07) · base `main` · head `feat/f10-image-optimization` · 45 commits |
| Título | `feat(f10): image optimization quota mitigation — robots, tokens, sharp, ladders, audit gate (T029-T040)` |
| Conclusão | T041 ("abrir PR do pacote Fase 10") está **resolvido** |
| Divergência | `PLANO_MESTRE.md:280` ("PR #74 open; checks vermelhos herdados") e `:283` (T044 diagnóstico PR #74) estão **obsoletos** |
| Relacionado | PR **#300** `chore/update-deps` (só `package-lock.json`, `OPEN`/`BLOCKED`) — decisão de governança de deps |
| Ação | **Follow-up docs-only** (reconciliar notas stale) — não corrigido nesta tarefa (escopo não inclui o PLANO) |

## 4. Opções e recomendação

| Item | Opções | Recomendação técnica |
|---|---|---|
| P009 | A) manter aceitação D-462 + revisão 2026-12 · B) forçar downgrade `prisma@6.12.0` (breaking) · C) não aplicável | **A** (sem ganho de runtime; downgrade arriscado) |
| P017 | A) manter deferimento D-557 · B) implementar agora (blind index/dual-write/backfill/rotação) · C) não aplicável | **A** (ativar agora = mais risco) |
| PR #74/T041 | A) follow-up docs-only para reconciliar notas stale · B) reviver/tratar | **A** |
| PR #300 | A) reviver · B) fechar · C) substituir · D) adiar | **Decisão do Operador** (governança de deps) |

## 5. Perguntas objetivas ao Operador

1. **P009:** confirma **manter** a aceitação de risco residual (D-462) com revisão em **2026-12**, sem forçar downgrade de Prisma?
2. **P017:** confirma **manter** a cifragem adiada pós-Beta (D-557) com as compensações atuais?
3. **PR #300** (`chore/update-deps`, lockfile): **reviver / fechar / substituir / adiar**?
4. **Follow-up docs-only** para reconciliar as notas stale do PLANO (T041 `:280`, T044 `:283`): autorizar?

## 6. Task packets futuros (condicionados à decisão)

- **T138 docs-only** — reconciliar notas stale do PLANO (T041/T044) após autorização. *(recomendado, baixo risco)*
- **Txx** — só se o Operador **negar** P009=A/P017=A: aí sim upgrade/downgrade de deps ou implementação de cifragem (exigiria TDD, migration, segredo, ADR).
- **PR #300** — conforme decisão (reviver = PR propio com CI; fechar = higiene).

## 7. O que NÃO foi feito / não resolvido

- Nenhuma dependência, lockfile, código, schema, migration, segredo ou infra alterada.
- Nenhum BETA-GAP alterado; GO para convites permanece **SUSPENSO**.
- Notas stale do PLANO (T041/T044) **não** corrigidas nesta tarefa (fora de escopo) — propostas como follow-up.

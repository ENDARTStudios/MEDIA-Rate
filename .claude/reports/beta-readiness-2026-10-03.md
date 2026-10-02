# Beta readiness — snapshot consolidado 2026-10-03 (pós-LGPD pós-triagem)

**Base:** origin/main @ 8bacec48 (PR #401) · **Cadeia aprovada:** T147-T160 (PRs #383→#401) · **Metodologia:** consolidação apenas de estados já aprovados por REVIEW (T147-T160); nada inventado, nada reavaliado.

## Sumário executivo

**GO técnico: VERDE.** Todas as frentes de código seguras foram executadas e estão em produção. O que resta são **quatro ações exclusivas do Operador** (Gov-01, P019, B1, UG-01) — consolidadas abaixo com passo a passo. Após as quatro, a **Beta Fechada (convites controlados) está liberável**; a decisão formal de liberar convites permanece do Operador.

## Matriz de frentes

| Frente | Estado |
|---|---|
| Rate limiting (D-558: sessão+hash, sliding window, register 5/min, 429 envelope) | ✅ Em produção |
| Deploy guards B1 (Migration Safety required + expand/contract + reconciliador) | ✅ Em produção (D-554/D-555) |
| Observabilidade (uptime sintético live + Sentry + allowlist governada) | ✅ Em produção (D-556) |
| **P1 LGPD** — matriz retenção/transferências (#139/T472) | ✅ Em produção |
| **P1 LGPD** — direitos/revogação/legal hold/rate limit /user/data (#140/T473) | ✅ Em produção |
| Segurança deps (fastify 11.2.7 + next 16.3.6 — GHSA-9c5c/GHSA-vcvr) | ✅ Em produção (D-559) |
| Radar Top 8→12 eixos + a11y (T154) · i18n busca (T153) · CTAs (T152) | ✅ Em produção |
| Notas normalizadas (T147) | ✅ Em produção |
| #300 (deps obsoleta) | Triada — **aguardando Operador fechar** (P019) |
| Gov-01 (ruleset protect-main) | **Aguardando Operador** (GitHub UI, 5 min) |
| B1 (deleção item de teste) | **Aguardando Operador** (sessão ADMIN) |
| UG-01 (Google Login navegador real) | **Aguardando Operador** (navegador real) |
| Comics scores / detalhe rico / UG-01 resolução | Bloqueados por decisão de produto/fonte/provider — não bloqueiam o GO mínimo |

## Pacote de GO — as 4 ações exclusivas do Operador

### 1. Gov-01 — Ruleset `protect-main` (GitHub UI, 5 min)
- **Onde:** Settings → Rules → Rulesets → `protect-main` → Edit.
- **Ativar:** "Require a pull request before merging".
- **Restringir:** bypass admin (`always` → remover ou modo `pull_requests`).
- **Verificação:** `git push origin main` local deve ser **rejeitado** pelo GitHub.
- **Ref:** PENDENCIAS nº 18 (Gov-01) · D-561 · PENDENCIAS nº 19 (P019).

### 2. P019 — Fechar a #300 como obsoleta (1 comando)
```bash
gh pr close 300 --comment "Close as obsolete. Current main already has green audit after #363. This PR conflicts on package-lock.json and predates subsequent dependency/security repairs. If specific CVE fixes are still needed, open a fresh dependency PR from current main with npm audit evidence."
```
- **Verificação:** `gh pr view 300 --json state` → `CLOSED`.
- **Ref:** PENDENCIAS nº 19 · relatório `pr-300-triage-2026-10-03.md`.

### 3. B1 — Deleção do item de teste "R2 Upload Test" (sessão ADMIN)
- **Onde:** Painel admin do MEDIA Rate (`/admin`) com sessão ADMIN real.
- **Como:** Localizar a mídia `R2 Upload Test — pode deletar` (id `424e6a91-5b5c-4659-b805-bb06ed13547d`) → soft delete via UI ou `DELETE /api/v1/midias/424e6a91-...`.
- **Verificação:** título ausente na home e no catálogo; smoke 7/7 pós-deleção.
- **Nota:** `X-Admin-Token` não existe como repo secret — a deleção exige login ADMIN no painel (o agente não tem credenciais).
- **Ref:** auditoria do site (2026-09-30) · PENDENCIAS B1.

### 4. UG-01 — Validar Google Login em navegador real
- **Onde:** `https://mediarate.app/en-US/login` → botão Google.
- **Navegadores:** Chrome, Firefox e/ou Safari (não webview).
- **Checklist:** (a) popup abre e não é suprimido; (b) redirect para /dashboard após auth; (c) sessão persiste após reload; (d) origens autorizadas no Google Cloud incluem `mediarate.app`.
- **Ref:** PENDENCIAS T140 · UG-01.

## Critérios de GO (formais)

| Critério | Estado |
|---|---|
| CI required verde em main | ✅ |
| Produção saudável (smoke 7/7 + /privacy ×3) | ✅ |
| P1 LGPD em produção | ✅ |
| Rate limiting completo | ✅ |
| Deploy guards (Migration Safety required) | ✅ |
| Observabilidade mínima | ✅ |
| Gov-01 aplicado | ⏳ Operador |
| #300 fechada | ⏳ Operador |
| B1 executado | ⏳ Operador |
| UG-01 validado | ⏳ Operador |

**GO mínimo para convites controlados:** liberável após as 4 ações acima. As frentes de produto restantes (comics scores, metadados ricos, BETA-GAP-04/06/08/16/17/18, UG-05/06/07/08/11/15/17-22) dependem de **fonte de dados/provider/spec de produto** e **não bloqueiam o GO mínimo** se o Operador aceitar formalmente o estado partial/adiado.

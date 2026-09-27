# BETA-GAP-01 / T120 — Login Google (OAuth seguro + fallback honesto)

**Data:** 2026-09-28 · **Branch:** `feat/t120-beta-gap-01-google-login-or-fallback` (de `origin/main` `26741a1e`)
**Regra:** descoberta antes de codar; sem expor segredo; opção menos destrutiva.

## 1. Descoberta — o fluxo JÁ EXISTE (T361/D-335)

| Evidência | Arquivo/linha |
|---|---|
| Verificação server-side do ID token (JWKS, `iss`/`aud`/`exp`) | `apps/api/src/modules/auth/google-auth.service.ts` |
| Rota `POST /api/v1/auth/google/callback` (pública; valida `credential`) | `apps/api/src/modules/auth/auth.controller.ts:184-224` |
| Cria/recupera usuário pelo e-mail + sessão | `apps/api/src/modules/auth/auth.service.ts:344-420` |
| Botão GIS + `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `apps/web/src/components/SocialButtons.tsx` |
| CSP permite GSI (`script/frame/style-src accounts.google.com`; **sem** `strict-dynamic`) | `apps/web/next.config.ts:93-107` |
| Docs de contrato | `docs/04-api-integrations/INTEGRATIONS.md:37` |

**Config live (sem valores):** Vercel `production` tem `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Encrypted, `vercel env ls production`). `.env` local tem `GOOGLE_CLIENT_ID`. ⇒ Em produção o provider está habilitado; o CSP não bloqueia o GSI.

**Requisito canônico:** Google login é **facultativo** (Termos §3.5 "é facultado optar por login social"; `ROADMAP` F3 "concluída"). ⇒ Caso 2 (fallback honesto aceitável) é permitido; não é gate obrigatório de Beta.

## 2. Lacunas encontradas (corrigidas)

1. **Segurança:** `GoogleAuthService.verify` **não** validava `email_verified`. Um ID token Google sem e-mail verificado criaria/vinculava conta. → passa a exigir **`email_verified === true`** (senão 401).
2. **UX honesta:** `SocialButtons` renderizava o botão **incondicionalmente**; sem `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (preview/local) o clique era um no-op silencioso. → sem client id, **não renderiza** botão nem divisor "ou" (nunca promessa falsa).

## 3. Mudanças

- `apps/api/src/modules/auth/google-auth.service.ts` — exige `email_verified === true`.
- `apps/api/test/google-auth.spec.ts` — vermelho→verde (`email_verified` falso/ausente/não-booleano → 401) + caso válido com `true`.
- `apps/web/src/components/SocialButtons.tsx` — fallback honesto + encapsula o divisor.
- `apps/web/src/app/[locale]/login/page.tsx` e `.../register/page.tsx` — divisor movido para o componente.
- Docs: `INTEGRATIONS.md`, `ARCHITECTURE.md`, `TESTING.md`.

**Não alterado:** `GOOGLE_CLIENT_ID/SECRET`, redirect URI, sessão/cookie/CSRF, rate limit, billing/entitlement, schema (sem migration), auth por e-mail/senha.

## 4. Testes

- `google-auth.spec.ts`: 6/6 (sem client id → 401; token inválido → 401; sem e-mail → 401; `email_verified` falso → 401; ausente/string → 401; `true` → perfil). Vermelho antes do fix (2 falhas).
- `tsc` api = 0; `tsc` web = 0; eslint/prettier nos arquivos alterados = 0.

## 5. Critérios de aceitação

1. Descoberta — §1. 2. Google não quebrado/falso — §2.2. 3. E-mail/senha intacto — sem mudança no fluxo. 4. UI honesta — §2.2. 5. Testes/docs — §4 e §3. 6. Merge seguro — §6.

## 6. PR / merge / smoke

- Commit da correção: `5de0201c` (branch `feat/t120-beta-gap-01-google-login-or-fallback`, base `26741a1e`).
- PR: **#330** `OPEN → MERGED`; merge commit **`a8e56420`** (merge commit, sem squash/force).
- Checks **required** (ruleset `protect-main`): Lint & Audit, Test & Coverage, Build, RLS Isolation, Docs Gate, Migration Safety (B1) — todos **pass**. CI run `36353609357`; `Test & Coverage` job `108716910941` (API **960**/960, web 426/426 — +2 testes `google-auth`).
- `Vercel`: **fail não-required** por rate limit (retry 24h) → benigno.
- `123ce28e`: `git merge-base --is-ancestor` → exit **1** (ausente).
- Smoke pós-merge 7/7 → **200**.
- **BETA-GAP-01 = DONE** (Caso 2: provider habilitado e endurecido em produção; fallback honesto onde não configurado).

# Registro de Incidentes de Segurança — MEDIA Rate

Registro canônico e **sanitizado** (nenhum valor de segredo/PII é registrado aqui).
Cada incidente ganha um ID estável, é registrado na detecção e atualizado até o
encerramento formal pelo Operador/Thinker.

## INC-2026-10-11 — Exposição histórica de padrão de credencial em repositório público (T182–T184)

- **Detecção:** o Docs Gate (secret scan) bloqueou a PR #512 em 2026-10-10 ao detectar
  padrão de credencial em `.claude/exchange_log.jsonl` (log operacional local, ignorado
  pelo `.gitignore`).
- **Causa raiz:** `git add -f` forçou o arquivo ignorado para um commit da T181
  (`1e7801f3`, **alcançável da `main`**); removido no commit seguinte (`5679cda4`).
- **Agravantes (à época):** repositório **público**; secret scanning/push protection
  **desabilitados**; conteúdo visível no diff da PR enquanto aberta.
- **Classificação:** `SECRET_PATTERN_EXPOSURE_CONFIRMED_IN_PUBLIC_HISTORY` — severidade
  **ALTA**.
- **Conteúdo do blob exposto (caracterizado sem valores, T183):** fragmento no formato de
  chave Stripe live (mascarado) e 1 valor de CSRF (efêmero); `ADMIN_TOKEN`/
  `X-Admin-Token`/`DATABASE_URL`/`SENTRY`/`TMDB` apenas como **nomes sem valores**;
  e-mails somente de domínio de teste.
- **Remediação aplicada:**
  - **Rotação (Operador):** TMDB, IGDB, Twitch e Comic Vine (2026-10-10); Stripe chave
    live + webhook secret (2026-10-11).
  - **Repositório tornado PRIVADO** (2026-10-11; verificado via API `isPrivate=true`).
  - **Contas `@mediarate.test` em produção** (7, incluindo 1 com ADMIN): senha invalidada
    (7), sessões revogadas (119), papel ADMIN revogado (1) — **sem delete físico** de
    contas (T184).
  - **Código (T184, TDD 14/14):** fallback público de senha removido do provisionamento;
    guarda de ambiente não-local (`TEST_USERS_ALLOW_NONLOCAL=1`) em provisionamento/seed/
    fixture; papel ADMIN nunca concedido fora de local; workflows geram senha efêmera em
    runtime (`ci.yml`, `smoke-auth.yml`); `scripts/evidence-local.mjs` alinhado.
  - **Prevenção:** comentário no `.gitignore` proibindo `git add -f` sob `.claude/`.
- **Verificação:** varredura sanitizada (T183) sem novos padrões de alta confiança em HEAD/
  histórico; 0 eventos de auditoria envolvendo as contas de teste desde a janela de
  exposição (**sem evidência de uso não autorizado**); CI 10/10 runs sem match.
- **Pendências (incidente NÃO encerrado):**
  1. Secret scanning/push protection **indisponíveis** em repositório privado sem GitHub
     Secret Protection (API 422) — passo manual em
     `docs/06-devops-deployment/GITHUB_SECURITY_SETTINGS.md`.
  2. Purge de histórico (decisão do Operador; opcional após as rotações).
  3. PII: evidência = somente domínios de teste — confirmação formal pendente.
  4. Backups/alertas Postgres (decisão do Operador).
- **Artefatos sanitizados:** `.claude/reports/secret-incident-exchange-log-2026-10-10.md`,
  `.claude/reports/secret-exposure-sweep-2026-10-11.md`,
  `.claude/reports/incident-remediation-2026-10-11.md`; decisão **D-577** em `DECISOES.md`.

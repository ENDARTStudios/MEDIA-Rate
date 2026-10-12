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
- **Pendências (histórico — resolvidas ou convertidas em risco aceito; ver §Encerramento T210):**
  1. ~~Secret scanning/push protection indisponíveis~~ → **ATIVOS (2026-10-11):** repositório
     novamente **PÚBLICO** por decisão do Operador; `secret-scanning/alerts` disponível
     (0 alertas) e `code-scanning/alerts` disponível (30 alertas pré-existentes). Padrão do
     projeto: **Gitleaks** como gate bloqueador no CI (T186/**D-578** —
     `docs/08-security/SECURITY_CI.md`; verificação em
     `docs/06-devops-deployment/GITHUB_SECURITY_SETTINGS.md`).
  2. Purge de histórico (decisão do Operador; opcional após as rotações).
  3. PII: evidência = somente domínios de teste — confirmação formal pendente.
  4. Backups/alertas Postgres (decisão do Operador).
- **Atualização (2026-10-11, T186/D-578):** workflow `Security` corrigido — Gitleaks adotado
  como padrão bloqueador do tree atual; uploads SARIF condicionais/não-fatais; diagnóstico do
  run `38151955200` (falha de plataforma, sem achado novo). Decisões do Operador registradas
  (PII não; repo público; Secret Protection ativado; Gitleaks padrão).
- **Artefatos sanitizados:** `.claude/reports/secret-incident-exchange-log-2026-10-10.md`,
  `.claude/reports/secret-exposure-sweep-2026-10-11.md`,
  `.claude/reports/incident-remediation-2026-10-11.md`; decisão **D-577** em `DECISOES.md`.

- **2026-10-12 (T200) — reconciliação read-only das contas sintéticas:** divergência levantada
  pela T199 ("admin\*\*\*@mediarate.test ainda ADMIN") resolvida como **drift documental** —
  a remediação T184 está íntegra em produção: 7 contas `@mediarate.test` = `USER` ×7,
  **0 ADMIN**, 0 sessões ativas, **0 atividade pós-remediação** (último evento 2026-10-05;
  logins 25 pré / 0 pós o corte de 2026-10-11). Único ADMIN de produção = conta legítima do
  Operador (D-563, fora do domínio de teste). Probes agregados via `railway ssh` (somente
  `count`/`groupBy`, sem PII; scripts efêmeros removidos). Sem necessidade de higiene T201.
  Relatório: `docs/08-security/reports/synthetic-admin-reconciliation-2026-10-12.md`.

### Encerramento formal (2026-10-13, T210) — `CLOSED_RISK_ACCEPTED_NO_PURGE`

- **Decisão do Operador:** incidente **ENCERRADO com risco residual aceito, sem purge**.
- **Mitigação efetiva (verificada):** rotação das credenciais conhecidas (TMDB/IGDB/Twitch/
  Comic-Vine + Stripe live/webhook); neutralização das contas `@mediarate.test`
  (7 senhas invalidadas, 119 sessões revogadas, 1 ADMIN revogado — T184) com **0 ADMIN ativo**
  reconfirmado em produção (T200); secret scanning **ATIVO (0 alertas)** + push protection
  **ATIVO**; **Gitleaks** como gate bloqueador do CI.
- **Hardening admin consolidado:** T201 (auditoria) → T202 (deny-by-default) → T203 (rate limit +
  anti-probing) → T204 (design) → T206 (probe dedicado) → **T205 Fase 1 (step-up por re-auth de
  senha, fail-closed)**.
- **Sem evidência de uso não autorizado** (0 eventos de auditoria na janela; 0 atividade pós-remediação).
- **Riscos residuais ACEITOS:** o blob **permanece no histórico público** (sem purge; a purge exige
  confirmação explícita separada — T213); repositório **PÚBLICO** por decisão do Operador; contas de
  teste mantidas no banco (neutralizadas); **#151** OPEN mitigado (formalização em T211); 119 alertas
  Trivy estruturais (T209).
- **Governança:** kill-switch `ADMIN_STEPUP_REQUIRED=0` tratado como **mudança sensível**
  (`ADMIN_SECURITY.md` §governança).
- **GO para convites: continua SUSPENSO** — encerramento documental **não** libera GO.
- **Relatório:** `docs/08-security/reports/incident-2026-10-11-formal-closure-risk-acceptance-2026-10-13.md`.

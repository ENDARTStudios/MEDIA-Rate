# Diagnóstico CI vermelho — PR #74 (T044/D-482, atualizado T045)

Run: `34078083956` (CI) sobre SHA `9212351` (branch `feat/f10-image-optimization`).
Verdes: Lint & Audit, Test & Coverage, RLS Isolation, Build, Stryker.
Vermelhos: CodeQL (SAST), ZAP Baseline (DAST). E2E Playwright vermelho mas
**não-bloqueante por design** (`continue-on-error` + "nao bloqueia merge ainda"
em `ci.yml`) — veredito E2E abaixo (D-482: só veta se regressão da Fase 10).

## CodeQL (SAST) — VEREDITO: repo-level, fora do alcance da branch

- Erro atual (analyze@v4, pós-P012): `Resource not accessible by integration`
  (log job `101766708176`). v3→v4 aplicado em T042 sem efeito → versão nunca
  foi a causa.
- Evidência de repo: conta `ENDARTStudios` é **usuário** (org endpoint 404);
  repo **privado sem Advanced Security** (`security_and_analysis.*: null` via
  API). Code scanning com upload exige GHAS em repo privado.
- Ação: Operador — (a) checar Settings → Actions → General → Workflow
  permissions (se read-only global, job-level `security-events:write` é
  ignorado); (b) habilitar GHAS ou aceitar CodeQL vermelho documentado.
  Nada na branch pode corrigir.

## ZAP Baseline (DAST) — VEREDITO: alvo corrigido; restam WARNs + permissão

- Alvo fictício (`preview-74.media-rate.example.com`) corrigido em T042 para
  o padrão real do bot Vercel
  (`media-rate-git-<branch>-end-art-studios.vercel.app`, confirmado no
  comentário do `vercel[bot]`): spider executou (PASS:55).
- Falha atual por: (1) `FAIL-NEW: 0` mas `WARN-NEW: 15` (info-disclosure,
  CSP wildcard, permissions-policy, COEP — tudo WARN) com `fail_action: true`;
  (2) criação de issue falha com o mesmo `Resource not accessible`
  (consistente com a teoria de token restrito do CodeQL).
- Ação: Thinker — política para WARN (corrigir produto em nova tarefa vs flag
  `-I`/exceção); Operador — mesma P012 das permissões cobre (2).

## E2E Playwright — VEREDITO: não é regressão da Fase 10 (D-482 não veta)

- Falhas: axe `color-contrast` (serious) em nós de texto pré-existentes
  (botão de busca `text-[#6B7280]`, hints `kbd`, `body`, `dt` de stats) +
  timeouts `page.goto` com `networkidle` (flake de ambiente) + ruído
  `MISSING_MESSAGE auth.passwordStrong` (console, não causa de falha).
- Correlação com o diff: o conjunto Fase-10
  (`image-policy`, `MediaCard*`, `robots`, `middleware`, `next.config`
  images, `upload/*`, CI, docs, specs) **não renderiza nenhum nó de texto
  com cor** — `<img>` substitui `<img>` (mesmo elemento para o axe) e
  `color-contrast` não se aplica a imagens. Mecanismo de regressão: inexistente.
- Job segue não-bloqueante por design; a11y herdado é candidato a T045.

## P012 — VEREDITO: efetividade não confirmável por API com este token

- `actions/permissions` (repo) retorna só `{enabled, allowed_actions}`;
  endpoint de workflow-permissions exige org (404: conta é usuário) e o campo
  veio `null` (escopo insuficiente para ler settings). Validação restante é
  UI (Operador) ou re-run pós-mudança de setting.

## T045 — mapa de checks + required (D-490/D-497, retomada §10.1)

- `gh-safe pr checks 74 --json name,state,workflow`: 3 failing (CodeQL,
  E2E, ZAP), 4 skipped (PRR Pipeline), 7 successful (Lint & Audit, Test &
  Coverage, RLS, Build, Stryker, Vercel Preview Comments, Vercel).
- `branches/main/protection/required_status_checks` → **404: Branch not
  protected**. Não há required checks configurados; E2E-required é moot —
  o veto de merge é convencional (D-468/D-496), não técnico. Proibido usar
  o checkbox de bypass mesmo assim (D-496).
- T045 troca CodeQL→Semgrep OSS em `ci.yml` (job `semgrep-sast`,
  bloqueante, config `p/ci`). Semgrep OSS não tem limite gratuito que
  trave este repo (scan por run, sem conta obrigatória para `p/ci`).

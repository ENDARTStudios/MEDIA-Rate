---
name: media-rate-ci-ops
description: >
  Receitas operacionais de CI/PR do MEDIA Rate: gh sem token sombreado, leitura de
  checks por metadados (nunca despejar logs), lista exata de required, semântica de
  docs-only/skipping, flakes conhecidos, contaminação 123ce28e, add de relatórios em
  .claude por plumbing, merge e smoke canônico 7/7. Use ao abrir/inspecionar/mergear
  PRs, diagnosticar CI vermelho ou aguardar gates neste repositório.
---

# MEDIA Rate — CI/PR Ops

Atalho operacional. Em conflito, vencem `AGENTS.md`,
`.agents/skills/media-rate-conventions/SKILL.md` e `docs/06-devops-deployment/CI.md`.

## gh neste ambiente (P010 + quirks)

- **Sempre** `env -u GITHUB_TOKEN gh ...` — o harness injeta um token inválido que
  sombreia o keyring. Sem isso, falhas de auth falsas.
- **`--paginate` + `--jq` avalia POR PÁGINA**: `[...] | length` devolve o tamanho de
  cada página (o "30 alertas" era o `per_page=30` default!). Para totais, some as
  páginas ou imprima 1 linha por item e conte com `wc -l`.
- `statusCheckRollup` tem DOIS formatos: CheckRun (`name`/`status`/`conclusion`) e
  StatusContext (`context`/`state`). Em jq: `.name // .context`, `.conclusion // .state`.
- Check-run ≠ job: `CodeQL`/`gitleaks`/`Trivy` são check-runs do SARIF (podem falhar
  sem job correspondente). `scan`/`Trivy Image Scan`/`Gitleaks (segredos — tree atual)`
  são jobs do workflow `Security`.

## Required vs. pulado

Ruleset `protect-main` exige 6: **Lint & Audit · Test & Coverage · Build ·
RLS Isolation (T290/T299/T301) · Docs Gate · Migration Safety (B1)**.

- Docs-only: jobs pesados = `skipping` (conta como verde); **Docs Gate sempre roda**.
- `E2E Full (jornada crítica 3x)` só dispara quando o diff toca
  `apps/web/e2e/*`, `scripts/evidence-local.mjs`, `scripts/ci/evidence-guard*.mjs`,
  `apps/web/playwright.config.ts` ou `.github/workflows/ci.yml` — para validá-lo,
  o PR precisa tocar um desses caminhos (ex.: documentar no próprio spec).
- `E2E Playwright`/`Stryker`/`Vercel` não são required; falha real aí merece atenção
  mas não bloqueia merge por si.

## Flakes conhecidos (rerun 1× antes de tratar como falha)

- Fontes Google no runner (E2E) · Docker Hub 5xx (Semgrep/Trivy/RLS) · rate limit
  Hobby da Vercel · `Build OpenNext (CF, informativo)`.
- Dependabot/automation PRs: jobs falham por token restrito (sem secrets) —
  classificar como limitação do contexto, não do diff.

## Contaminação e escopo

- Antes de mergear: `git merge-base --is-ancestor 123ce28e HEAD` → **exit 1** (limpo).
- Diff deve conter só o esperado; qualquer `package.json`, `package-lock.json`,
  `security.yml`, `ci.yml`, `.gitleaks.toml`, schema/migration fora do escopo →
  `STATUS BLOCKED` (SCOPE_OVERFLOW), não mergear.

## `.claude/` é gitignored — relatórios entram por plumbing

```bash
f=.claude/reports/<nome>.md
h=$(git hash-object -w --path "$f" "$f")
git update-index --add --cacheinfo "100644,$h,$f"
```

**Proibido `git add -f`** (incidente D-577). O `.claude/exchange_log.jsonl` local
NUNCA é versionado (só append local de 1 linha JSON sanitizada).

## Merge e smoke

- Mergear só com: state OPEN, `mergeable CLEAN` (ou `MERGEABLE` com falha não-required
  justificada), required verdes, diff auditado, contaminação ausente.
- Estilo de merge do repo: **merge commit** (histórico "Merge pull request #N").
- `Deploy ... waiting` no environment Production: **nunca aprovar**; registrar.
- Smoke canônico (UA de browser — curl puro leva 429):

```bash
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
for p in pt-BR en-US es-ES pt-BR/catalog pt-BR/pricing pt-BR/login; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -A "$UA" "https://mediarate.app/$p"); echo "/$p $code"
done
curl -s -o /dev/null -w '/health(api) %{http_code}\n' -A "$UA" "https://media-rate-production.up.railway.app/health"
```

- Rota do catálogo: **`/catalog`** (nunca `/catalogo`).
- Heurística "i18n crua": `grep -oE '\b[a-z]+\.[a-z]+[A-Z][A-Za-z]*'` no HTML —
  a página `/catalog` retorna ~14 falsos positivos de DOM (`e.parentNode` etc.);
  interpretar, não alarmar.

## Diagnóstico de CI vermelho (metadados > logs)

```bash
RID=<run-id>
gh run view $RID --json jobs -q '.jobs[] | select(.conclusion=="failure") | "\(.name): " + ([.steps[] | select(.conclusion=="failure") | .name] | join(", "))'
gh run view $RID --log-failed | grep -Eiq '<padrão>' && echo MATCH || echo NO_MATCH  # booleano, nunca despejar
```

- Antes de culpar o diff: compare com o comportamento da `main`
  (`gh run list --branch=main --limit 10`).
- Reprodução local do E2E exige Docker (Postgres) — se o daemon estiver off,
  a autoridade é o CI; registrar a limitação.

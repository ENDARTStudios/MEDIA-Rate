# T078 — Alertas métricos + uptime: dry-run end-to-end e runbook

**Data:** 2026-09-25 · **Autor:** Doer · **Fase:** F09-cicd
**Base:** branch `chore/t078-alertas-uptime-runbook` · **PR aberto (SEM merge).**

## 1. Guardas (estáticas + testadas)

- `alertas-metricos.yml`: `APPLY` só com `inputs.dry_run=false` **e** `vars.METRICS_URL`+`secrets.ADMIN_TOKEN`; caso contrário usa **fixture** (dry). `permissions: contents:read, issues:write`.
- `uptime-check.yml`: `APPLY` só com `dry_run=false`. **T078:** `dry_run` **default alterado para `true`** (antes `false` — um dispatch manual sem parâmetro rodaria **live**). Teste determinístico em `uptime-check.self-test.mjs` (lê o YAML e exige `default: true`).
- **Self-tests:** `metric-alerts` **18/18**; `uptime-check` **17/17**.

## 2. Dry-run end-to-end (na branch do PR)

| Workflow | Run | Evento | Resultado |
|---|---|---|---|
| Alertas Metricos | `36083011701` | workflow_dispatch `dry_run=true` | **success** (14s) |
| Uptime Check | `36083014331` | workflow_dispatch `dry_run=true` | **success** (26s) |

**Issues** com labels `alerta-metrico`/`uptime`: **antes = 0**, **depois = 0** → **zero create/update/close** ✅.

## 3. Runbook de ativação (Operador — P014/P015)

1. **P014:** criar `vars.METRICS_URL` (URL do `/metrics`) + `secrets.ADMIN_TOKEN` **read-only** (idealmente dedicado ao metrics); rodar `workflow_dispatch dry_run=false`; conferir a issue; **rollback** = remover as vars/secrets.
2. **P015:** UptimeRobot (guia em `docs/OBSERVABILITY.md`), complementar ao uptime sintético.

## 4. Limitações honestas

- A validação foi em **dry-run** (o `--apply` live não foi exercitado — exigiria a fonte live/P014).
- Sem acesso a segredos/config de produção; **nada** foi ativado.

## 5. Escopo

Alterações apenas em `.github/workflows/uptime-check.yml`, `scripts/ci/uptime-check.self-test.mjs`, `worklog.md`, `docs/*`. **Sem** produto/schema/migration/segredo/vars/secrets/infra/environment.

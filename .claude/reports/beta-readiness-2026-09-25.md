# T076 — Reconciliação de prontidão Beta (pós-T075)

**Data:** 2026-09-25 · **Autor:** Doer · **Base:** `origin/main` @ `e9be9d0`
**Método:** evidência primária (PRs/commits mergeados, runs de CI, arquivos reais, smokes) + docs.
**Veredito:** **Beta NÃO declarada pronta.** B1/B2/B3 fechados; restam **pendências do Operador** e follow-ups de baixo risco.

---

## 1. Estado por fase (evidência real pós-T075)

| Fase | Plano | Estado real | Veredito |
|---|---|---|---|
| 2 — Dados | `[~]` | `permissions`/`data_sources`/`entity_revisions` **ausentes**; `ColumnEncryptionService` **não wired** (P017) | **Confirma `[~]`** |
| 3 — Auth | `[x]` | register/login/refresh/verify/forgot/reset + Google; 403 EMAIL_NOT_VERIFIED; **PII mascarada em logs** (T049) | **Confere** |
| 4 — APIs | `[x]` | interações **DTO allowlist** (T036-T039); **filtro global honra 4xx** (429 — T072/D-552) | **Confere** |
| 6 — Avançado | `[~]` | cache + **graceful shutdown** (T044/45) + upload R2 fail-closed; BullMQ/IA postergados (D-017) | **Confirma `[~]`** |
| 7 — Hardening | `[x]` | token opaco, rotação de refresh; **AuditLog PII sanitizada** (T055/D-545) + **drift de timestamp corrigido** (T058) | **Confere** |
| 8 — Testes/Segurança | `[~]` | **API 931/931**; **E2E jornada crítica 48/48** (T074/D-553); Semgrep/CodeQL/ZAP verdes | **Confirma `[~]`** (melhora material) |
| 9 — CI/CD | `[~]` | `security.yml` verde; `Migration Safety` required; alertas métricos **dry-run**; uptime sintético; workflows crônicos neutralizados (T046/47) | **Confirma `[~]`** |

## 2. Cadeia de evidência relevante (T044 → T075)

- **Shutdown:** #195/`8f5afc2` → docs #198/`799163f`.
- **Workflows crônicos:** #199/`6264601` (create-pr/release → manual) → docs #202/`c884bec`.
- **LGPD:** #203/`b903a7e` (inventário) → #204/`96ac104` (mask logs auth) → #210/`3518614` (mask fora de auth) → **AuditLog** #213/`10d7652` (T055) → #217/`7736ce0` (T058 drift).
- **INCIDENTE `login 500`:** hotfix **#228/`5322e90`** (T063) — `mascararIpInet` devolvia CIDR (Prisma `@inET` rejeita); login **200** restaurado; D-549.
- **Rate limit mascarado como 500:** **#247/`d4b114c`** (T072/D-552) — filtro honra `statusCode` **400–599** de não-Error (429 preservado).
- **E2E jornada crítica:** **#220/`9a122a9`** (T075) — **48/48** (16×`--repeat-each=3`), 0 failed/flaky/skipped; **logins 32 → 3** via `globalSetup`/`storageState`; job efêmero no CI.

## 3. Divergências do PLANO_MESTRE (classificação)

| Divergência | Classificação |
|---|---|
| Fase 8 listava "~309 web"; API hoje **931/931** (125 arquivos) | **Confirmada (stale)** — nota de evidência |
| "700+ API" → **931** | **Confirmada (stale)** |
| Fase 4 lista 20 módulos (real: 29) | **Confirmada (stale)** |
| `.claude/scripts/gerar_sync_simbiotico.py` citado em tarefas: **não existe** | **Confirmada** (insync manual) |

## 4. Pendências do Operador (separadas das tarefas do Doer)

| ID | Assunto | Nota |
|---|---|---|
| **P010** | `GITHUB_TOKEN` sombreando login do `gh` | workaround `scripts/gh-safe.*` |
| **P012** | staging/environment antes de produção | Opção A preparada; `deploy.yml` fica **waiting** (evidência recorrente **P012=A**) |
| **P013** | caminho de migration manual | recomendado: console Railway (runbook T034) |
| **P014** | alertas métricos **live** | requer `vars.METRICS_URL` + `secrets.ADMIN_TOKEN` read-only |
| **P015** | UptimeRobot externo | guia em `docs/OBSERVABILITY.md` |
| **P016** | reativar auto-PR de `feature/**` | `create-pr-from-branch` **manual** (T046/47) |
| **P017** | cifragem de colunas (LGPD) | bloqueada por determinismo/migration/segredo (D-542) |

## 5. Proposta — próximas 5 tarefas (Doer-executáveis)

1. **T077 — `docs/` + `PLANO` reconciliação de contagens/inventário.** Obj: corrigir contagens stale (931/125; 29 módulos) e notas de evidência, sem flips indevidos. Risco: baixo. Deps: —. **Pronto:** diff docs-only; Docs Gate verde.
2. **T078 — Alertas métricos/uptime: validação end-to-end em dry-run + runbook.** Obj: garantir que os workflows disparam, criam/fecham issues corretamente e documentar a ativação (P014). Risco: baixo. Deps: —. **Pronto:** 1 execução verde + runbook.
3. **T079 — Cobertura/limiares e mutation testing (Stryker).** Obj: alinhar thresholds de coverage ao corpus atual (931 testes) e revisar escopo do Stryker. Risco: baixo. Deps: CI. **Pronto:** CI verde com limiares atualizados.
4. **T080 — Segurança: pass de triagem (SAST/deps) + `SECURITY_TRIAGE` atualizado.** Obj: varrer achados abertos (Semgrep/CodeQL/audit) e classificar. Risco: baixo. Deps: —. **Pronto:** relatório de triagem + 0 achados HIGH sem decisão.
5. **T081 — Observabilidade: revisar Sentry/logs (gated) e dashboards pós-incidente.** Obj: validar `sendDefaultPii:false`, redação e alertas pós-#247. Risco: baixo. Deps: —. **Pronto:** checklist documentada + smoke.

> Priorização: **T077** (destrava leitura do plano) → **T078** (proteção operacional) → **T079** → **T080** → **T081**.

---

**Nenhum `[x]` novo.** Sem alteração de produto/CI executável/schema/infra. Sem PII/segredos.

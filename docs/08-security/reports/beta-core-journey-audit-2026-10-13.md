# Auditoria da jornada mínima de beta (T224) — read-only / docs-only

**Data:** 2026-10-13 · **Fase:** F10-beta-product-audit · **Tarefa:** T224 · **Base:** `34c341bf` (`origin/main`)
**Natureza:** read-only/docs-only — **nenhuma** correção de produto, código, teste, flag, deps, infra,
produção escrita, alertas, backup, purge ou deploy. **GO: SUSPENSO** — este documento **não** declara GO.

> Sanitização: apenas rotas, nomes de arquivo/spec, contagens e estados. Nenhum segredo/PII/credencial.
> **Nenhuma** conta real, **nenhum** dado pessoal, **nenhuma** escrita em produção.

---

## 1. Sumário executivo

O fluxo mínimo de um usuário convidado está **coberto por evidência forte** (specs de E2E reais — incl.
uma **jornada crítica navegada** executada em CI —, análise estática e smoke público). **Não encontrei
bloqueio funcional de produto** no fluxo auditado.

O que **bloqueia o GO não é o produto**: é o eixo operacional (**backups P1** — T220) e o eixo formal
(escopo de beta + aprovação de Production + declaração do Operador).

**Ressalva metodológica (honesta):** nesta rodada **não** executei uma sessão navegada nova. Usei a
**autoridade do CI** (o job `E2E Full` roda `jornada-critica.spec.ts` **3× com `retries=0`**,
chromium+mobile, com API+DB sintéticos) + análise estática + smoke read-only. Rodar E2E completo local
exigiria API+DB+dev server e não é viável de forma segura nesta árvore compartilhada.

---

## 2. Metodologia (read-only)

| Camada | O que foi usado | Peso |
|---|---|---|
| **A. E2E real (autoridade)** | 34 specs em `apps/web/e2e/`; required por PR: `auth.spec.ts` + `navigation.spec.ts`; `E2E Full`: `jornada-critica.spec.ts` (3×, retries=0) + `layout-plans-library` + `library-density` | **primária** |
| **B. Estática** | rotas (`[locale]`), componentes, `messages/*.json` (3 locales), feature flags, handlers, estados de erro | secundária |
| **C. Smoke público** | `GET`/`HEAD` em rotas públicas (sem login) | terciária |

**Não feito (por restrição):** escrita em produção, login com conta real, alteração de flags, execução de
fluxos destrutivos admin, correção de qualquer achado.

---

## 3. Matriz de prontidão por fluxo

Taxonomia: `PRONTO_PARA_BETA` · `PARCIAL_COM_COPY_HONESTA` · `DESATIVADO_POR_FEATURE_FLAG` ·
`BLOQUEADO_POR_BACKEND` · `BLOQUEADO_POR_FRONTEND` · `RISCO_DE_UX` · `NAO_APLICAVEL_NESTA_FASE` ·
`NECESSITA_CORRECAO_ANTES_GO`.

| # | Fluxo | Classificação | Evidência |
|---|---|---|---|
| 1 | **Landing / home** (`/pt-BR`,`/en-US`,`/es-ES`) | **PRONTO_PARA_BETA** | smoke **200** ×3; `home-ilha`, `home-truthfulness`, `landing-hero`; `jornada-critica` "home renderiza sem chave i18n crua" |
| 2 | **Catálogo** (`/catalog`) | **PRONTO_PARA_BETA** | smoke **200**; `catalog-sidebar`, `catalog-type-sections`, `flow`; `jornada-critica` "catálogo abre, filtra e navega sem erro" |
| 3 | **Busca** | **PRONTO_PARA_BETA** | `search.spec.ts` (**5** testes); `CatalogFiltersClient` + `searchParams` |
| 4 | **Detalhe da mídia** | **PRONTO_PARA_BETA** | `media-details.spec.ts` (**6**); `jornada-critica` "detalhe abre pelo catálogo e renderiza título + imagem"; copy honesta p/ campos ausentes |
| 5 | **MEDIA Score** | **PRONTO_PARA_BETA** (copy honesta) | `score-display.spec.ts` (**2**); `MediaScoreModule` usa `scoreUnavailable`/`scoreComingSoon` quando não há nota |
| 6 | **Autenticação** (login/registro/verificação/sessão/logout) | **PRONTO_PARA_BETA** | required `auth.spec.ts` + `auth.e2e.spec` + `register-terms`; rotas `login`, `register`, `verificar-email`; `contas-consistencia` |
| 7 | **Watchlist / biblioteca** | **PRONTO_PARA_BETA** | **4** specs (`watchlist`, `watchlist-flow`, `watchlist-labels`, `watchlist-sync`) + `biblioteca`; `jornada-critica` watchlist+reload e biblioteca (deep link, query inválida, vazio) |
| 8 | **Pricing / planos** | **PRONTO_PARA_BETA** | `/pricing` **200**; `pricing/page.tsx` + `checkout/[plan]/{layout,page}.tsx` + `billing/success`; `layout-plans-library`, `dashboard-gating` |
| 9 | **Consentimento / LGPD** | **PRONTO_PARA_BETA** | `ConsentBanner` + `LgpdBanner`; `privacy-consent.spec.ts` (**6**); flag `lgpd-consent-v1`; `privacy`/`terms`; purge LGPD só-ADMIN |
| 10 | **i18n (3 locales)** | **PRONTO_PARA_BETA** | `i18n-leak`, `localizacao`, `title-localization`; `messages/{pt-BR,en-US,es-ES}.json` com paridade |
| 11 | **Acessibilidade básica** | **PRONTO_PARA_BETA** | `a11y.spec.ts` (+ axe); `design:contrast`/`design:visual` como ferramentas de apoio |
| 12 | **Erros e estados vazios** | **PRONTO_PARA_BETA** | `error.tsx`, `not-found.tsx`, `loading.tsx`; `jornada-critica` "estado vazio OU grid, sem 500"; erros sanitizados (`GlobalExceptionFilter`) |
| 13 | **Admin (não-admin não vê superfície)** | **PRONTO_PARA_BETA** | gate server-side T202 (`admin/layout.tsx` + `getServerAdminGate`) + `middleware` + `dashboard-gating`; specs `admin-layout-auth`/`admin-auth-server` |

**Nenhum fluxo classificado como `BLOQUEADO_*` ou `NECESSITA_CORRECAO_ANTES_GO`.**

---

## 4. Feature flags e copy honesta

- **Flags versionadas:** `discovery-feed-v1` (feed Descobertas), `lgpd-consent-v1` (consentimento),
  `migrar-v1`/`purgar-v1`/`usar-v2` (internas de dados/admin).
- **Copy de indisponível (3 locales):** `synopsisUnavailable`, `castUnavailable`,
  `streamingUnavailable`, `streamingUnavailableGame`, `scoreUnavailable`, `scoreComingSoon` — o produto
  **não mente**: onde não há dado/nota, há mensagem honesta em vez de tela vazia ou botão quebrado.

---

## 5. Achados de risco (não bloqueiam o fluxo mínimo)

| Achado | Severidade | Impacto no GO |
|---|---|---|
| **26 títulos sem elenco** (honestidade de dados, monitorado) | baixa | não — copy honesta cobre |
| Guard de a11y/contraste é por spec/ferramenta, não bloqueio de build | baixa | não |
| `E2E Full` (jornada 3×) roda só com **mudança de código** (docs-only pula) — em PR de produto ele roda | informativo | não |
| Sem execução navegada consolidada **nesta** rodada (autoridade = CI) | metodológica | não |

---

## 6. Lacunas que **bloqueiam** o GO (não são de produto)

1. **Backups automáticos em produção não configurados** + sem alerta de falha + **restore de ensaio não
   validado** → **P1** (T220/T181; decisão do Operador).
2. **Aprovação manual do Deploy em Production** (`waiting`).
3. **Declaração formal de escopo/GO** pelo Operador (template `DECISAO_OPERADOR_PRE_GO_2026-10-13`).

---

## 7. Recomendações (sem implementar)

- **T224 conclui que o fluxo mínimo está apresentável**: se o Operador autorizar convites, o produto não
  é o gargalo — o gargalo é **operação de dados (backup/restore)**.
- Se quiser uma **execução navegada consolidada** antes do GO: rodar o job `E2E Full` num PR de código
  (ou por `workflow_dispatch`) e anexar o run id — é read-only e usa dados sintéticos.
- Após decidir backups: fechar alerta de falha de backup (observabilidade) e validar um **restore de
  ensaio** — ambos são mudança operacional e exigem packet próprio.

---

## 8. Reconciliação documental (PLANO_MESTRE)

`PLANO_MESTRE.md` foi reconciliado **apenas nas seções de estado atual** (contagens de teste, uptime e
pendências de plataforma), marcado como **snapshot 2026-10-13**. A história do projeto **não** foi
reescrita. Valores corrigidos: API **1422/1422** (168 arquivos), web **615/615** (89 arquivos),
**34 specs de E2E**, uptime sintético **ATIVO** (substitui UptimeRobot), domínio/proteção de `main`
**resolvidos**.

---

## 9. Confirmações

- **Nada** foi alterado em produção, código, testes, deps, schema, flags, infra ou alertas.
- **Nenhuma** credencial real, conta real ou PII foi usada; **nenhuma** escrita em produção.
- **Nenhum** alerta (CodeQL/Trivy/secret scanning) foi interagido.
- Diff restrito a **docs** (+ `PLANO_MESTRE.md`/checklist/PENDENCIAS/worklog).
- **GO para convites: permanece SUSPENSO.** Nenhum BETA-GAP marcado como DONE.

---

## 10. Referências

`apps/web/e2e/` (34 specs, incl. `jornada-critica.spec.ts`) · `.github/workflows/ci.yml` (required
`auth`+`navigation`; `E2E Full`) · `apps/web/src/app/[locale]/` (38 grupos de rota) ·
`apps/web/src/components/{ConsentBanner,LgpdBanner,MediaScoreModule,CatalogFiltersClient}.tsx` ·
`docs/08-security/reports/pre-go-evidence-pack-2026-10-13.md` ·
`docs/06-devops-deployment/GO_READINESS_CHECKLIST.md` · `PLANO_MESTRE.md`.

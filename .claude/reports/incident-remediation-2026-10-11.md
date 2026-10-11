# Relatório de remediação e verificação do incidente (T184)

**Data:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T184-incident-remediation-and-verification
**Incidente:** INC-2026-10-11 (`SECRET_PATTERN_EXPOSURE_CONFIRMED_IN_PUBLIC_HISTORY`)
**Classificação do ciclo: `REMEDIATED_PENDING_PLATFORM_PROTECTION`** — remediação aplicada e
verificada; incidente **NÃO encerrado** (proteção de plataforma bloqueada por plano; purge/PII/
backups seguem como decisões residuais do Operador).

> **Sanitização:** nenhum valor de credencial, token, cookie, hash de senha ou PII real foi
> impresso. As verificações de produção usaram **apenas agregados** (contagens) obtidos por
> script read-only executado no container via `railway ssh`; nenhum e-mail individual, id,
> user-agent ou IP foi exibido. O e-mail de domínio de teste `@mediarate.test` já é público
> no repositório e é o único domínio citado.

## 1. Sumário executivo

1. **Confirmações do Operador registradas:** chave live da Stripe + webhook secret
   **rotacionadas**; repositório **privado** (verificado via API: `isPrivate=true`).
2. **Contas `@mediarate.test` descobertas, explicadas e remediadas.** Existiam **7 em
   produção** (incluindo **1 com papel ADMIN**). Remediação least-destructive aplicada:
   **7 senhas invalidadas** (hash de valor aleatório desconhecido), **119 sessões
   revogadas**, **1 papel ADMIN revogado** — sem delete físico de contas. Verificação
   pós-remediação: **0 admins, 0 sessões ativas**; **0 eventos de auditoria** das contas na
   janela = **sem evidência de uso não autorizado**.
3. **Correção de código (TDD 14/14):** fallback público de senha removido do provisionamento;
   guardas de ambiente (provisionamento/seed/fixture); papel ADMIN nunca concedido fora de
   ambiente local; workflows geram **senha efêmera em runtime** (sem literal no YAML);
   `evidence-local` alinhado.
4. **Secret scanning/push protection: BLOQUEADOS por plano** — repositório privado exige o
   produto pago GitHub Secret Protection; a API respondeu **422** ("not available for this
   repository"). Passo manual exato documentado em
   `docs/06-devops-deployment/GITHUB_SECURITY_SETTINGS.md`. **Não declarado como habilitado.**
5. **Reconciliação:** `DECISOES.md` (D-577), `PENDENCIAS_OPERADOR.md`, `worklog.md`,
   `docs/08-security/SECURITY_INCIDENTS.md` e `GITHUB_SECURITY_SETTINGS.md` atualizados;
   `PLANO_MESTRE.md` não possui referências afetadas (verificado por busca).

## 2. Confirmações do Operador (registro sem valores)

| Item | Status |
|---|---|
| Chave live da Stripe | **ROTACIONADA** (Operador) |
| Webhook secret da Stripe | **ROTACIONADO** (Operador) |
| Visibilidade do repositório | **PRIVADO** (Operador; verificado por API nesta tarefa) |
| TMDB / IGDB / Twitch / Comic Vine | ROTACIONADAS (Operador, ciclo T183) |

## 3. Metodologia (read-only em produção, sem PII)

| Verificação | Forma usada |
|---|---|
| Sync e visibilidade | `git fetch/status/rev-parse`; `gh repo view --json isPrivate/visibility` |
| PRs/runs | `gh pr view/list`, `gh run list` |
| Sonda de produção | `railway ssh` (container) → script Node **somente agregados** via Prisma (`count`/`groupBy`), com `bootstrapRlsSeed`; script efêmero em `/app/t184*.cjs`, removido ao final |
| Remediação | Mesmo canal; `updateMany` (senha/sessões) + `deleteMany` restrito à junção `usuario_papel` (revogação de papel); **nenhum DELETE de conta** |
| Secret scanning | `gh api` PATCH/GET `security_and_analysis`; `.../secret-scanning/alerts` |
| Site | smoke passivo (6 páginas + `/health` da API) |

Proibições respeitadas: sem valores de segredo, sem PII real, sem dashboards de provedores,
sem reescrita de histórico, sem aprovação manual do environment Production.

## 4. Descoberta — o que são as contas `@mediarate.test`

Em linguagem simples: são **contas sintéticas de teste**, em 4 grupos:

1. **Provisionadas para spot-checks** (`apps/api/prisma/provision-test-users.ts`, D-294):
   `free@/plus@/premium@mediarate.test` (planos) e `admin@/admin-free@mediarate.test`
   (papel ADMIN em ambiente local — prova do BETA-GAP-03/T119). **Era este script que
   tinha o fallback público de senha e podia criar contas, inclusive ADMIN, em produção.**
2. **Conta LGPD** (`provision-lgpd-test-user.ts`): `lgpd-test@mediarate.test` — já segura
   (senha aleatória em memória, nunca impressa).
3. **Seeds de desenvolvimento** (`prisma/seed.ts`): `*@mediarate.example` (domínio reservado;
   destrutivos — agora com guarda de ambiente).
4. **Referências em fixtures/E2E/scripts/CI** (web e2e, `verify-prod/*`, `evidence-fixture.cjs`,
   `ci.yml` E2E FULL, `smoke-auth.yml`): usam as contas acima em bancos **efêmeros/locais**.

**Onde estavam em produção:** 7 contas do domínio (a soma dos grupos 1 e 2 + afins),
detectadas por agregado; 1 delas com papel ADMIN.

## 5. Remediação em produção (antes → depois)

| Métrica | Antes | Depois |
|---|---|---|
| Contas `@mediarate.test` | 7 | 7 (preservadas; **sem delete físico**) |
| Senhas invalidadas | 0 | **7** (hash de valor aleatório desconhecido) |
| Sessões não revogadas | 119 | **0** (revogadas por `UPDATE`) |
| Papel ADMIN entre as contas | 1 | **0** (revogado) |
| Sessões ativas (não expiradas) | 1 | **0** |
| Eventos de auditoria das contas desde 2026-10-09 | 0 | 0 (sem evidência de uso não autorizado) |

Notas: 1 sessão recente (criada nos últimos dias) foi revogada por precaução; 0 contas com
`ultimo_login_em` recente. Para retomar spot-checks, re-provisionar com senha forte
(`TEST_USERS_PASSWORD` + `TEST_USERS_ALLOW_NONLOCAL=1`); ADMIN permanecerá ignorado fora de
ambiente local (guarda T184).

## 6. Correção de código (TDD — vermelho → verde, 14/14)

- **Novo módulo `apps/api/prisma/provision-guards.ts`** (funções puras): senha obrigatória via
  env (sem fallback; erro sanitizado nunca contém o valor; mínimo 12 caracteres); bloqueio de
  ambiente não-local sem `TEST_USERS_ALLOW_NONLOCAL=1`; ADMIN nunca fora de local.
- **`provision-test-users.ts`**: guardas ligadas; cabeçalho atualizado; ADMIN condicionado.
- **`seed.ts`**: guarda de ambiente (seed é destrutivo).
- **`fixtures/evidence-fixture.cjs`**: guarda de ambiente inline.
- **`.github/workflows/ci.yml`** (job E2E FULL): removido o literal de senha do `env`;
  passo novo gera **senha efêmera em runtime** (`$GITHUB_ENV`) para provisionamento + E2E.
- **`.github/workflows/smoke-auth.yml`**: mesmo padrão (senha efêmera para provisionamento +
  smoke).
- **`scripts/evidence-local.mjs`**: senha efêmera única por execução (provisionamento e E2E
  compartilham o valor; nada literal).
- **Specs novos:** `test/provision-test-users.spec.ts` (guardas + higiene estática da fonte) e
  `test/auth-test-accounts.spec.ts` (domínios reservados; workflows sem literal; fixture com
  guarda). **14/14 verdes**; `tsc` 0; `eslint` 0; `prettier` limpo.
- **Docs:** `RBAC.md` (nota T184), `PRODUCTION_DEPLOY.md` (comando/provisionamento atualizados).

## 7. Secret scanning e push protection (tentativa via API)

- `PATCH /repos/ENDARTStudios/MEDIA-Rate` (`security_and_analysis` → enabled) →
  **HTTP 422 "Secret scanning is not available for this repository".**
- `GET .../secret-scanning/alerts` → **404 "Secret scanning is disabled on this repository".**
- **Interpretação:** em repositório **privado**, esses recursos exigem **GitHub Secret
  Protection** (pago). Não é falta de permissão do token. **Nada foi declarado habilitado.**
- **Passo manual exato + verificação pós-habilitação:**
  `docs/06-devops-deployment/GITHUB_SECURITY_SETTINGS.md` (inclui Dependabot alerts, gratuito).

## 8. Verificações complementares

- **Repositório privado:** confirmado (`isPrivate=true`, `visibility=PRIVATE`).
- **Stripe:** rotação registrada como confirmação do Operador, sem valores. (O T183
  identificou o fragmento no blob exposto; a rotação é a mitigação efetiva.)
- **CI:** 10/10 runs recentes sem match de padrões em logs de falha (T183); smoke pré e
  pós-merge 7/7 (200).
- **Observação de ambiente:** PR **#515** (`chore/update-deps`, automação) aberta — não
  tocada nesta tarefa; decisão futura do Operador.
- **Ambiente local do Operador:** `.env.example`/`.env` reorganizados localmente foram
  **preservados intocados** (fora do diff e não versionados; `.env` nunca foi versionado).

## 9. Riscos residuais e decisões pendentes

1. **Proteção de plataforma:** contratar/configurar GitHub Secret Protection (decisão de custo)
   — hoje a plataforma não alerta nem bloqueia segredos em repositório privado.
2. **Purge de histórico:** opcional após as rotações (histórico contém o blob);
   caches/forks de terceiros podem retê-lo.
3. **PII:** evidência = somente domínios de teste; confirmar `PII_NO_LOG=NAO` formalmente.
4. **Backups/alertas Postgres** (Decisão 1, inalterada).
5. **T184 não encerra o incidente** — o Thinker decide após REVIEW (critério do pacote).

## 10. Confirmação de sanitização

Nenhum valor de segredo, token, cookie, hash de senha, `DATABASE_URL`, `ADMIN_TOKEN` ou PII
real foi impresso neste relatório, nos logs de comandos ou no STATUS. As consultas de
produção retornaram **apenas contagens**; os scripts efêmeros usados no container foram
removidos ao final de cada execução. Nenhum histórico foi reescrito; nenhuma aprovação
manual de Production foi feita. O spec untracked do T176 permanece como dívida separada
(não misturada).

**Mecânica de versionamento:** este relatório (sob `.claude/`, ignorado) é adicionado ao
índice via `git update-index` (plumbing), respeitando a proibição de `git add -f`.

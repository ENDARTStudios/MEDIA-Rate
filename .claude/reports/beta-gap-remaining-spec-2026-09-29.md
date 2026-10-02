# T130 — Descoberta/spec dos BETA-GAPs restantes (04, 06, 08, 16, 17, 18)

**Data:** 2026-09-28 · **Branch:** `docs/t130-beta-gap-remaining-spec-discovery` (base `b349899a`)
**Tipo:** descoberta read-only / docs-only. **Nenhum gap marcado DONE.** Sem alteração de código/schema/segredo/infra.

## 1. Sumário executivo

- **12/18 DONE + 1 PARTIAL**; restam **04, 06, 08, 16, 17, 18**.
- **04, 08, 16, 17 e 18 não têm definição/aceite em nenhum lugar do repositório** (registry traz só o ID; nenhum commit/PR/doc). Implementar seria `AMBIGUOUS_SPEC`.
- **06** tem definição parcial (metadados de mídia) e falta **fonte legítima** de elenco/créditos + avaliações em prosa → permanece `PARTIAL_UI_CONTRACT_READY`.
- **Decisão do Operador** necessária: fornecer especificação dos gaps sem definição; escolher fonte de dados para 06; e a decisão de hosting A/B (já registrada).

## 2. Metodologia (read-only)

- `rg` por `BETA-GAP-04|06|08|16|17|18` em `.claude`, `docs`, `DECISOES.md`, `PLANO_MESTRE.md`, `worklog.md`.
- `git log --all --grep=... -i` e `gh pr list --state all --search '...'`.
- Leitura de registry, PRD, ROADMAP, PLANO_MESTRE, DECISOES, MANUAL_DO_OPERADOR, schema Prisma, módulos de código, testes e e2e.

## 3. Matriz por gap

| gap | definição encontrada | evidência | tipo provável | dependências | risco | status recomendado | próximo passo |
|---|---|---|---|---|---|---|---|
| **04** | **Ausente** (só ID no registry) | `.claude/reports/beta-product-gap-registry-2026-09-27.md:12`; sem commit/PR/doc | indefinido | definição de produto | alto (improviso) | **BLOCKED_AMBIGUOUS_SPEC** | Operador/Thinker emitir definição + aceite |
| **06** | **Parcial** — metadados de mídia (sinopse/elenco/avaliações) | `PRD.md:47`, `TESTING.md:88`, PR #334/#335, `media-metadata-2026-09-28.md` | provider externo/licença **ou** schema/dataset curado | fonte legítima de cast/reviews | alto (external) | **PARTIAL_FOLLOW_UP** (mantém `PARTIAL_UI_CONTRACT_READY`) | Operador decidir: provider licenciado **ou** dataset curado documentado **ou** adiar |
| **08** | **Ausente** (só ID) | registry `:16`; sem commit/PR | provavelmente provider/credencial (notas de críticos por fonte) | licença/chave/cadastro externo | alto | **BLOCKED_EXTERNAL_PROVIDER** (a confirmar com definição) | Operador/Thinker definir + indicar provider licenciado |
| **16** | **Ausente** (só ID) | registry `:23` | indefinido | definição de produto | alto | **BLOCKED_AMBIGUOUS_SPEC** | definir objetivo/aceite |
| **17** | **Ausente** (só ID) | registry `:24` | indefinido | definição de produto | alto | **BLOCKED_AMBIGUOUS_SPEC** | definir objetivo/aceite |
| **18** | **Ausente** (só ID) | registry `:25` | indefinido | definição de produto | alto | **BLOCKED_AMBIGUOUS_SPEC** | definir objetivo/aceite |

## 4. Dependências e riscos

- **Fonte de dados inexistente/ambígua** é o bloqueio central: 04/16/17/18 sem definição; 08 provavelmente provider/licença; 06 sem fonte de cast/reviews.
- **Proibido** (por política): inventar escopo, tradução, elenco, avaliação, provider sem licença, scraping, LLM gerando conteúdo.
- **Risco de falso verde**: implementar 04/08/16/17/18 por inferência produziria entrega não rastreável a requisito.
- **Decisão de hosting A/B** segue como pendência do Operador (sem bloqueio ativo; ver `docs/06-devops-deployment/WEB_HOSTING.md`).

## 5. Recomendação priorizada

1. **Operador/Thinker definem 04, 16, 17, 18** (objetivo + critério de aceite). Sem isso, `BLOCKED_AMBIGUOUS_SPEC`.
2. **08**: confirmar se é "notas de críticos por fonte". Se sim → `BLOCKED_EXTERNAL_PROVIDER` até indicar provider licenciado/credencial; não improvisar integração.
3. **06**: decidir a fonte legítima (provider licenciado / dataset curado documentado / adiar). Sem fonte → mantém `PARTIAL`.
4. Quando houver definição, emitir **task packets** no formato das T118-T129 (objetivo, arquivos, restrições, hard stops, critério de pronto).

## 6. Perguntas objetivas ao Operador

- **04**: qual comportamento/correção exatamente? Qual critério de aceite?
- **08**: é integração de notas de críticos por fonte nova? Qual provider e licença?
- **16 / 17 / 18**: qual descrição canônica de cada um?
- **06**: provider licenciado, dataset curado no repo, ou adiar?
- **Hosting**: A (Vercel Pro) / B (migrar) / C (aceitar Hobby temporariamente)?

## 7. Candidatos a próximos task packets (modelo)

Para cada gap, quando definido, o packet deve conter: `objetivo`, `arquivos_afetados`, `restricoes` (sem tocar auth/billing/segredo/infra; sem inventar dado), `requires_tdd`, `critério_de_pronto` (PR + required verdes + smoke 7/7 + evidência), `hard stops`.

## 8. PR / merge

- Commit: `6ba6fa40` · PR: **#350** (docs-only) · base `b349899a`.
- Diff restrito a docs/relatórios/registro/worklog/pendências; **nenhum** código/schema/segredo/infra. Nenhum gap marcado DONE.

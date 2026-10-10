# Relatório — Metadata drain interno (D-576) + lição P2000/truncamento

**Data:** 2026-10-10 · **Ciclo:** F06-metadata-drain · **Tarefas:** T179/PR #505, T180/PR #509 · **T181** (docs-only)

## Sumário executivo

A frente de enriquecimento de metadados em escala foi fechada. O gatilho dos backfills
saiu de um script externo (que morria quando o Railway substituía o container e exigia
sessão ADMIN de longa duração por causa do CSRF) para um **reagendador dentro da API**,
com **anti-loop** para filas que não podem progredir. No caminho, a própria verificação
expôs um bug real de contrato de dados (`P2000`) que prendia títulos na fila — corrigido
com normalização defensiva na fronteira. Nenhum segredo, schema, infra, backup ou alerta
foi alterado.

## Evidência antes/depois (produção, logs do drain interno)

| | Pendentes de elenco | Erros do lote | Leitura |
|---|---|---|---|
| Antes (T179 deployado) | 32 | **6** (`P2000`) | 6 títulos falhavam em toda execução e nunca saíam da fila |
| Depois (T180 deployado) | **26** | **0** | os 6 presos foram destravados e enriquecidos |

Log representativo (pós-fix): `Drain fim do lote: continuidade=6ok/0err metadados=32ok/0err | restam elenco=26 temp=0 pais=6`.
Backoff observado: `Drain: sem progresso com 38 pendentes — espaçando para 6h (fila presa na fonte)`.

## Os 26 títulos restantes são estado honesto

O TMDB **não possui elenco cadastrado** para esses títulos. Não é falha do drain, não é
bug, e não deve ser "resolvido" alargando schema ou inventando dado. Eles ficam cobertos
pelo backoff de 6h e por isso **não geram reprocessamento contínuo** da API externa.
Ação: monitorar apenas (tarefa aberta `Monitor-26-honest-no-cast-titles`).

## Escopo da D-576 (drain interno)

- `BackfillDrainService` no processo da API (padrão do job T4.7): intervalo padrão 5 min,
  orçamento 45 min por lote, **fila zerada = no-op**, ativo só em produção, desligável por
  `MEDIA_BACKFILL_DRAIN_ENABLED=false`.
- Sobrevive a redeploys por construção (não depende de `/app` nem de socket ssh).
- `contarPendentes()` e `drenarLote()` no `BackfillService` (nunca lança).
- Observabilidade sem rota nova: `GET /admin/backfills/status` traz o drain;
  `POST /admin/backfills/drain/tique` força um tique.
- Sessão temporária da operação **revogada** (`RESTAM_ATIVAS 0`); rota admin **401** sem
  credencial — nenhuma credencial de longa duração permanece.

## Correção T180 (lição P2000)

`character` do TMDB chega a **~300 caracteres** (créditos multi-papel) e
`midia_elenco.personagem` é `VARCHAR(160)` → `P2000` em toda execução → título nunca
enriquecido e **preso na fila**. Correção: `truncarCampo` (puro) — intacto até o limite;
acima, `max-1` + `…`; `null`/vazio → `null`; aplicado a `nome` (120), `personagem` (160)
e empresas (160).

**Regra derivada (toda integração externa):** normalizar entrada na fronteira; limite de
coluna é contrato (não alargar silenciosamente); regressão de oversized exige spec própria.

## Métricas do catálogo reportadas ao fim do ciclo

| Métrica | Início da frente | Ao fim |
|---|---|---|
| Títulos no catálogo | 624 | **17.217** |
| Temporadas | 637 | **6.346** |
| Episódios com nota | 12.994 | **131.743** |
| Títulos com elenco | 450 | **10.966** |
| Títulos com país de origem | 26 | **10.991** |
| Produtoras/estúdios | — | **39.262** |
| Vínculos de franquia | 3 | **1.595** |

## Gates

- Specs: `backfill-service.spec` 11/11 (inclui 3 casos de `truncarCampo` + caso real de
  300 chars) e `backfill-drain.spec` 7/7.
- Suíte API: **1103/1103**; tsc/eslint/prettier limpos; `swagger-contract-guard` 0 violações.
- PRs #505 e #509 **MERGED**; CI e Security verdes na `main`.
- Smoke passivo 7/7 (200): `/health`, `/pt-BR`, `/en-US`, `/es-ES`, `/pt-BR/catalog`,
  `/pt-BR/pricing`, `/pt-BR/login` — sem chave i18n crua.

## Riscos residuais

1. 26 títulos sem elenco no TMDB (estado honesto, com backoff) — monitorar.
2. `P2000` é sintoma de classe: outras integrações (IGDB/Twitch/Comic Vine) podem devolver
   campos acima do schema — a normalização de fronteira deve ser aplicada quando surgirem.
3. Backups/alertas do Postgres e rotação das 5 chaves seguem **sem ação** por dependerem de
   decisão do Operador (ver `PENDENCIAS_OPERADOR.md`).

## Recomendações

1. Aprovar o pacote de decisão do Operador (backups + alertas de uso; rotação de chaves).
2. Tratar o spec `apps/api/test/scrapers-t176.spec.ts` que ficou **untracked** (nunca
   commitado) em tarefa de código futura — não entra neste docs-only.
3. Ao adicionar nova fonte externa, incluir teste de fronteira com payload oversized.

## Observação de escopo (fora do docs-only)

Durante o sync foi identificado `apps/api/test/scrapers-t176.spec.ts` como arquivo
**não rastreado** (o spec do T176 existe apenas localmente). Não foi adicionado a este PR
por restrição de escopo (docs-only); registrado aqui como dívida a sanear em tarefa de
código.

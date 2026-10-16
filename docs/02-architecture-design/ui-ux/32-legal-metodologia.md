# UI-UX — Legal: Metodologia (`/methodology` · `/sources`)

> Sessão **19 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-legal-metodologia/{1440,375}.png`
> e `ui-ux-media-score/` (a sessão 4 cobre o **produto** do score; esta cobre a **explicação pública**).

## 1. Identidade da sessão

- **Objetivo do usuário:** verificar **como** o MEDIA Score™ é calculado, quais fontes entram, o que é
  normalizado e quais são os limites — o documento que dá sustentação pública ao número.
- **Persona:** público, inclusive quem questiona a nota (contraparte editorial, imprensa, usuário cético).
- **Rotas:** `/methodology` (182 linhas) e `/sources` (188 linhas) — **ambas server** com
  **`institutional-content.ts`** como fonte única de conteúdo (D-603) e **`StructuredData`** (JSON-LD).
- **Entradas:** `/about`, o módulo de score na ficha ("ver metodologia"), FAQ, rodapé.
- **Saídas:** `/sources` (detalhe por fonte), `/faq`, a ficha da obra.
- **Fora de escopo:** o componente de score (sessão 4), as fontes como catálogo de dados.

## 2. Arquitetura de informação

`/methodology` renderiza seções a partir de `copy` (`methodology/page.tsx:30,60`) com **`aria-labelledby`
ligado ao `h2`** — o padrão semântico correto:

| # | Seção | id / chave |
|---|---|---|
| 1 | O que é o score | `score-title` / `copy.scoreTitle` (`:111-112`) |
| 2 | Como é calculado | `calculation-title` (`:117-118`) |
| 3 | Nível de confiança | `confidence-title` (`:133-134`) |
| 4 | Fontes | `sources-title` (`:139-140`) |
| 5 | Escopo e limites | `scope-title` (`:158-159`) |
| 6 | Dados estruturados | `StructuredData data={jsonLd}` (`:67,100`) |

`/sources` segue a mesma estrutura (conteúdo de `copy` + JSON-LD), detalhando cada fonte e sua
classificação (crítica × público).

## 3. Layout, grid e densidade

- Coluna de leitura com cabeçalho institucional padronizado (D-603) e seções separadas por respiro.
- `/sources` usa **tabela/listagem** de fontes — conferir largura e rolagem em 375 (o padrão do produto é
  `overflow-x-auto`, como em `PipeTable` e `PricingTable`).
- Densidade: texto + tabela; sem cartões de métrica (isso é o dashboard).

## 4. Tokens em uso

Todos de [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). As cores das fontes/classificações devem vir de
`CATEGORY_TOKENS`/`scoreColor` — **conferir** se `/sources` não tem literal próprio (P2 se tiver).

## 5. Estados obrigatórios

| Estado | Situação |
|---|---|
| 1. Carregando | **não se aplica** — conteúdo no servidor |
| 2. Vazio | **não se aplica** — editorial |
| 3. Erro de rede | **não se aplica** |
| 4. Não encontrado | **não se aplica** |
| 5. Sem permissão | **não se aplica** |
| 6. **Dados parcialmente desatualizados** | **existe e importa** — a página descreve fontes e regras que mudam com o tempo; precisa de `lastUpdated` e de indicar quando uma fonte sai/entra |
| 7. Offline | benefício do estático (cache) |

## 6. Micro-interações e movimento

- `ScrollReveal` por seção (`:110`) — mesmo padrão do `/about`.
- Sem animação nos números: esta página **explica**, não exibe score animado (o anel fica na ficha).

## 7. Acessibilidade AA

- **Destaque (padrão de referência):** cada seção é `<section aria-labelledby="…">` com `<h2 id="…">`
  (`:111-112,117-118,133-134,139-140,158-159`) — o mesmo modelo de `CatalogTypeSections` e
  `DiscoveriesFeed`.
- Tabela de fontes: precisa de `<th scope="col">` — o produto **já tem dois exemplos corretos**
  (`PricingTable.tsx:37,43` e `PipeTable` em `privacy/page.tsx:118-122`); usar o mesmo.
- Links para `/sources` e para a ficha com rótulo textual; nenhum ícone solto.
- Contraste: tokens sob o gate; o JSON-LD não afeta visual.

## 8. Copy e i18n

- Conteúdo em **`institutional-content.ts`** (4 blocos por locale: `about`, `methodology`, `sources`) —
  **fonte única** para as 3 páginas institucionais de conteúdo técnico (D-603).
- Regra de veracidade (BETA-GAP-05): a página **não pode** afirmar escala que o produto não usa — a escala
  real é *game 0–100; demais 0–10; mangá nunca 0–100* (`score-utils.ts:14-25`), e há teste de guarda.
- **A CRIAR:** `lastUpdated` (mudança de fonte/regra precisa ser datada) e o canal de contestação de uma
  nota (quem discorda do score deve ter caminho — hoje não há).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | tabela de fontes rola na horizontal (`overflow-x-auto`), sem quebrar coluna |
| 768 | tabela completa visível |
| 1024+ | coluna de leitura com respiro |

## 10. Métricas de sucesso

- **Profundidade de leitura** e **cliques "ver metodologia"** a partir do módulo de score (mede curiosidade
  e desconfiança).
- **Cliques para `/sources`** por fonte citada (mede qual fonte o público quer conferir).
- **Contestações de nota recebidas** (canal a criar) e tempo de resposta — indicador de saúde editorial.

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| P1 | **Sem canal de contestação de nota** — a página sustenta o número, mas não diz o que fazer se alguém discordar (nem contato específico) | ausência em `methodology/page.tsx` | Operador (política editorial) | — |
| P2 | Sem `lastUpdated` (mudança de fontes/regras precisa de data) | ausência | eu | — |
| P2 | Conferir `scope="col"` na tabela de fontes de `/sources` (o padrão existe no repo) | `sources/page.tsx` | eu | AA |
| P2 | Conferir literais de cor em `/sources` (classificação crítica × público) | `sources/page.tsx` | eu | D-584 |
| — | **Positivo a preservar:** `section aria-labelledby` + `h2 id` em todas as seções, `StructuredData`
(JSON-LD seguro via `serializeJsonLd`), **fonte única de conteúdo** (`institutional-content.ts`),
`ScrollReveal` discreto e a regra de escala com teste de guarda | `methodology/page.tsx:3,67,100-159` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- legal-metodologia=/methodology
grep -n "aria-labelledby\|StructuredData\|getInstitutionalContent" "apps/web/src/app/[locale]/methodology/page.tsx"
grep -n "scope=\|<th\|CATEGORY_TOKENS" "apps/web/src/app/[locale]/sources/page.tsx"
npm run design:contrast; npm run design:detect
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-legal-metodologia/{1440,375}.png` (+
`ui-ux-media-score/` para a visão de produto).

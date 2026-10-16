# UI-UX — Busca Avançada (A CRIAR sobre duas superfícies existentes)

> Sessão **11 de 25** — **não existe rota de busca avançada**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md);
> valores em [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-busca-avancada/`
> (captura da superfície que hoje representa a busca: `/catalog`) + capturas do catálogo
> (`ui-ux-catalogo/`).

## 1. Identidade da sessão

- **Objetivo do usuário:** encontrar um título quando já sabe o que quer (busca direta) ou quando quer
  **combinar critérios** (tipo + gênero + ano + faixa de score + ordenação).
- **Estado atual (medido):** a busca existe em **duas superfícies desconectadas**:
  1. **paleta ⌘K** — `components/SearchCommand.tsx:52` (client), com *debounce* de 250 ms
     (`useDebounce(query, 250)`, `:64`), mínimo de **2 caracteres** (`:70`) e chamada a
     `searchMedia` (`:6,78`);
  2. **filtros do catálogo** — `CatalogFiltersClient.tsx` (tipo, gênero, ano mín/máx, faixa de score,
     ordenação, `q`), server-side e refletidos na **query string** de `/catalog` (`?type=&q=&genero=…`).
- **Persona/estado de conta:** qualquer uma; a busca não exige login.
- **Rotas:** hoje `/catalog` (com filtros). Proposta: manter `/catalog` como resultado canônico e
  considerar `/search` apenas se houver necessidade de URL própria (ver §11, decisão).
- **Saídas:** ficha da obra; catálogo filtrado; listas/watchlist.
- **Fora de escopo:** catálogo como navegação (sessão 1), ficha (4).

## 2. Arquitetura de informação

**Não propor conceito novo**: a busca avançada é a **composição das duas superfícies que já existem** —
a paleta para o caminho rápido e os filtros do catálogo para a combinação de critérios — com um caminho
explícito entre elas.

Estrutura proposta (reuso, com o componente de cada peça):

| # | Bloco | Reuso |
|---|---|---|
| 1 | Paleta ⌘K (busca rápida, teclado) | `SearchCommand.tsx` |
| 2 | Botão "Busca avançada" na paleta, levando a `/catalog` com `q` preservado | `SearchCommand` + `CatalogPageClient.tsx:28-58` |
| 3 | Painel de filtros (tipo, gênero, ano, score, ordenação) | `CatalogFiltersClient.tsx` (já server-side) |
| 4 | Chips de filtros ativos com remoção individual | padrão existente (`CategoryChip` + `catalog.clearFilters`) |
| 5 | Resultado = grade do catálogo + contagem | `CatalogTypeSections` / grade de `MediaCardShell` |
| 6 | Estado vazio específico de busca | `catalog.noResults` (já existe) |

## 3. Layout, grid e densidade

- Paleta: sobreposição central com lista de resultados de uma coluna (altura limitada, rolagem interna).
- Filtros: **sidebar sticky** no desktop e **drawer** no mobile (já é assim no catálogo —
  `CatalogPageClient.tsx:415,449-473`) — a busca avançada deve usar o **mesmo** comportamento, não outro.
- Medida: a paleta não deve passar de ~70 caracteres por linha de resultado.

## 4. Tokens em uso

Todos de [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md): `bg-surface-card`/`bg-surface-elevated` na paleta
(elevação `floating` do token), `text-fg-*`, `accent.indigo` no item selecionado, `focus.ring` nos itens.

**Fora de token:** nenhum identificado nas duas superfícies reais (o catálogo passou pela migração D-604).

## 5. Estados obrigatórios

| Estado | Paleta ⌘K hoje | Busca no catálogo hoje | Falta |
|---|---|---|---|
| 1. Carregando | **existe** — `searching` (`SearchCommand.tsx:61`) | **existe** — `isFetching` + `aria-live` (`CatalogPageClient.tsx:242`) | indicador de carregando **na paleta** visível |
| 2. Vazio | a confirmar (texto de "nenhum resultado") | **existe** — `catalog.noResults` | mensagem na paleta que ofereça a busca avançada |
| 3. Erro de rede | **existe** — `searchError` (`:62`) | **existe com retry** (`CatalogPageClient.tsx:138`) | retry na paleta |
| 4. Não encontrado | n/a | **existe** (`noResults`) | — |
| 5. Sem permissão | n/a | n/a | — |
| 6. Dados parciais | n/a | **existe** (erro com dados mantém a lista) | — |
| 7. Offline | **AUSENTE** | **AUSENTE** | P2 |

**Regra de produto a definir:** o que acontece ao digitar **1 caractere** — hoje `debouncedQuery.length < 2`
(`:70`) simplesmente **não busca e não avisa** ✗. O usuário fica sem retorno.

## 6. Micro-interações e movimento

- Paleta: abrir/fechar com `motion.presets` (opacidade + `scale` curto), `Escape` fecha (`aria-modal`).
- Seleção por teclado move o destaque **sem** animar a lista (evita parecer "pesado").
- Debounce de **250 ms** já é o valor certo (`SearchCommand.tsx:64`) — manter e documentar como padrão do
  produto para busca.
- Reduced motion: a paleta deve abrir instantaneamente quando o usuário pede menos movimento (o
  `MotionConfig` global cobre, desde que não haja `initial={{opacity:0}}`).

## 7. Acessibilidade AA

- **P1 — a paleta não é um diálogo acessível:** não há `role="dialog"`, `aria-modal`, `aria-label` nem
  `role="listbox"`/`aria-activedescendant` no `SearchCommand` (grep de `role="`/`aria-` não retorna nada
  no componente). Consequências: leitor de tela não anuncia a abertura, não sabe que há uma lista, e a
  navegação por setas (`selectedIdx`, `:63`) é invisível para tecnologia assistiva.
- **P1 — `Escape`:** não confirmado no código; se não fechar, o usuário de teclado fica preso.
- **P2** — o mínimo de 2 caracteres precisa de texto de ajuda (não pode ser um silêncio).
- Foco: ao abrir, o foco deve ir para o campo; ao fechar, **voltar** ao elemento que abriu (foco
  restaurável).
- Contraste: resultado selecionado deve manter 4,5:1 (verificar par de tokens no gate).

## 8. Copy e i18n

- Namespaces: **`catalog`** (`q`, `noResults`, `clearFilters`, `type`, `genero`, `anoMin/anoMax`,
  `scoreMin/scoreMax`, `sort`) e **`catalogFilters`** (`filters`) + chaves da paleta (namespace próprio,
  a confirmar).
- **A CRIAR:** textos de ajuda da paleta ("digite ao menos 2 caracteres", "ver busca avançada") nos 3
  locales, com paridade.
- Tom: direto; a busca não deve sugerir nada que não exista no acervo.

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | paleta ocupa a tela; filtros em drawer **com o mesmo botão do catálogo** (`catalog-filters-mobile-open`) |
| 768 | paleta centralizada `max-w-xl` |
| 1024+ | paleta centralizada; filtros em sidebar sticky quando em `/catalog` |

## 10. Métricas de sucesso

- **Buscas por sessão** e **taxa de busca sem clique** (busca que não gera abertura de ficha).
- **Uso combinado de filtros** (quantos filtros por busca) — mede se "avançada" faz sentido.
- **Abandono na paleta** (abriu e fechou sem buscar) — hoje não instrumentado.
- **Tempo até o primeiro resultado** (debounce + rede) e **taxa de erro** da busca.

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1 — CORRIGIDO o diagnóstico (D-626)** | **Eu estava errado:** a paleta **tem** `role="dialog"` + `aria-modal="true"` + `aria-label` (`SearchCommand.tsx:243-245`), **Escape** fecha (`:154,195`), o foco vai para o campo ao abrir (`:167`) e clique-fora fecha (`:204`). O que falta é só o padrão **combobox/listbox** (`aria-activedescendant`) — e implementá-lo exige mover as mensagens de estado para **fora** da lista, senão a própria lista passa a ter filhos inválidos (mesma classe do `<dl>` do admin). Registrado como trabalho com cuidado, não como "sem ARIA" | `SearchCommand.tsx:243-245,154,167,204` | eu | AA |
| **P1 — verificado OK (D-626)** | `Escape` **fecha** a paleta (`:154-155` e `:195-196`) | `SearchCommand.tsx:154,195` | — | feito |
| **P1** | **As duas superfícies não conversam**: a paleta não leva aos filtros do catálogo e os filtros não abrem a paleta | `SearchCommand.tsx` × `CatalogPageClient.tsx:28-58` | eu | — |
| P2 | 1 caractere = silêncio (sem aviso do mínimo) | `SearchCommand.tsx:70` | eu | — |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| **A CRIAR** | Operadores de busca (frase exata, exclusão, intervalo) e busca por pessoa/estúdio — não existem no produto | ausência | Operador (escopo) | — |
| — | **Positivo a preservar:** debounce de 250 ms, mínimo de 2 caracteres, navegação por `selectedIdx`, estados `searching`/`searchError`, filtros server-side com **query string compartilhável**, `noResults` e `clearFilters` | `SearchCommand.tsx:43-78`; `CatalogPageClient.tsx:28-58,242` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- busca-avancada=/catalog
grep -n "role=\|aria-\|Escape\|debounce\|length < 2" apps/web/src/components/SearchCommand.tsx
grep -n "q\|genero\|anoMin\|scoreMin\|sort" apps/web/src/components/CatalogPageClient.tsx | head -20
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-busca-avancada/{1440,375}.png` (a rota
`/catalog`, que hoje é o resultado da busca filtrada).

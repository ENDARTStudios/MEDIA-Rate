# Conceito do Catálogo (`/catalog`) — UI/UX com FigCraft

> **Primeiro desenho desta sessão (v1).** Substitui a leitura por partes que a
> [spec da sessão](./10-catalogo.md) fazia bloco a bloco: aqui a página é desenhada
> inteira, com a grade medida e os cinco achados P1/P2 da spec resolvidos no desenho.
>
> **Artefatos:** `docs/02-architecture-design/figcraft/conceito-catalogo/`
> — `catalogo-1440.png` (1440×2675, a página) · `catalogo-375.png` (375×1191, dobra)
> — `catalogo-375-filtros.png` (375×812, drawer aberto) · `catalogo-estados.png` (1200×836, os quatro estados)
> — `conceito-catalogo.figcraft` (4 páginas) · `conceito-catalogo.jsonl` (992 comandos)
> **Gerador:** `apps/web/scripts/figcraft-conceito-catalogo.mjs`
>
> **Regra desta rodada:** nada de número inventado. Contagens aparecem como **"N"** porque
> vêm da API; os "8,7" nos selos são **exemplos de escala**, como na régua da home (D-583.4).

## 1. O que muda em uma frase

O catálogo hoje **começa pelos chips e pela grade** e deixa a busca e a ordenação no meio do
caminho; o desenho propõe **h1 → lead → busca + ordenação → chips → recorte com contagem →
seções por tipo**, com a sidebar de filtros fixa à esquerda e o rodapé dela dizendo quantos
títulos o recorte tem. O usuário para de rolar para descobrir que pode filtrar.

## 2. Grade — medida, não escolhida

Tudo sai da grade do produto (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`), como o v10 da home
corrigiu:

| Constante | Valor | Origem |
|---|---|---|
| `M` | 112 | `max-w-7xl` (1280) centrado em 1440 − `lg:px-8` (32) |
| `CONTEUDO` | 1216 | 112 → 1328 |
| `SIDEBAR` | 240 | `w-60` de `CatalogPageClient.tsx:415` |
| `COL_CONTEUDO` | 944 | 1216 − 240 − 32 de vão |
| `CARD_W` | 176 | (944 − 4×16) ÷ 5 → **5 colunas em 1440**, como a spec mede |
| `CARD_H` | 264 | pôster 2:3 |
| `PITCH` | 360 | 48 do cabeçalho + 264 do card + 40 de rótulos + 8 |

Em 375: `M` 16, conteúdo 343, **2 colunas** de 163 — idêntico ao medido na spec (§3).

## 3. Arquitetura de informação (o que o desenho propõe)

| # | Bloco | Estado |
|---|---|---|
| 1 | `h1` "Catálogo" + lead com **`max-w-[34rem]`** | **novo** — resolve o P2 do D-603 (hoje herda a coluna inteira) |
| 2 | Busca (560 px) + Ordenação (200 px) na mesma faixa | **novo** — antes a ordenação morava dentro da barra de filtros |
| 3 | Chips de tipo com ícone, **44 px de altura**, ativo com `aria-current` | evolui `CategoryChip.tsx` |
| 4 | Sidebar sticky `w-60` com Tipo · Gênero · Ano · Nota mínima · Só com crítica | mantém `CatalogFiltersClient.tsx` |
| 5 | Rodapé da sidebar: **"N títulos no recorte"** + barra + "Limpar filtros" | **novo** — no desktop o filtro é ao vivo, então não há botão "aplicar" |
| 6 | Seções por tipo: tile 32 + `h2` + contagem + "Ver todos →" | mantém `CatalogTypeSections.tsx:64-88` |
| 7 | Grade de 5 colunas, card com pôster 2:3, selo de nota e rótulos | mantém `MediaCardShell.tsx` |
| 8 | "Carregar mais" (cursor) | mantém `CatalogPageClient.tsx:341-361` |

## 4. Drawer no 375 (frame próprio)

Painel `w-72` (288) pela esquerda, com:

- grupos com **alvos de 48 px** (chips inclusos) — resolve o P1 de toque medido na spec;
- rodapé fixo com "Limpar tudo" (88) + **"Ver N títulos"** (120): no mobile o botão existe
  porque **também fecha o painel** — no desktop, não, porque lá o filtro é ao vivo;
- nota de contrato: **`Esc` fecha, foco preso no painel**, `aria-modal`.

## 5. Estados (terceiro artefato)

| Estado | Desenho | Regra que o desenho fixa |
|---|---|---|
| Carregando | skeleton de 5 cards + 2 linhas de rótulo | altura igual à do card real → **zero CLS** quando os dados chegam; `aria-busy="true"` |
| Sem resultado | ícone `search-x`, título, explicação e **"Limpar filtros"** | é o único estado em que a ação primária é *desfazer* |
| Erro de rede | aviso com ícone, texto e "Tentar de novo" | não descarta o que já está em tela |
| Parcial / offline | **faixa âmbar** acima da grade | **A CRIAR**: hoje não existe leitura de `navigator.onLine` (P2 da spec); a faixa é estado, não erro |

## 6. Acessibilidade (os P1 da spec, resolvidos no desenho)

1. **Chip ativo** anuncia estado: `aria-current="page"` (navegação por recorte) e foco visível
   com `ring` de acento — o desenho mostra o chip ativo com borda de 1,5 px na cor do tipo.
2. **Drawer**: `Esc` fecha, foco preso no painel, `aria-modal="true"`, e o botão que abre
   devolve o foco ao fechar.
3. **Alvos de toque**: chips 44, filtros e botões do drawer 48 (antes, chips de ~32).
4. **Contraste**: o desenho usa apenas `fg-primary` / `fg-secondary` / `fg-muted` sobre
   `surface-card`; o par mais fraco é `fg-muted` sobre card (5,18:1, já no gate).

## 7. Movimento

- Filtro aplicado: nada se move — a grade troca com `opacity` de 120 ms no contêiner, sem
  deslocar layout;
- "Carregar mais": novos cards entram com `blur + rise` (assinatura do produto), 240 ms;
- Skeleton: `animate-pulse` já existente; **desligado** em `prefers-reduced-motion`.

## 8. Copy e i18n

Namespaces existentes bastam: `catalog.*` (título, lead, `count`, `noResults`, `clearFilters`,
`loadMore`, `error`, `retry`) e `catalogFilters.*`. **A CRIAR** (2 chaves, 3 locales):
`catalogFilters.groupLabel` (rótulo do grupo de filtros) e `catalog.offline` (faixa de offline).
Nenhum texto novo pode ter número fixo — a contagem vem da API e aparece como `N` no desenho.

## 9. Ordem de implementação (se aprovar)

1. **Bloco 1–2** (lead com `max-w` + faixa de busca/ordenação): resolve o P2 do D-603 e o
   primeiro rolo de descoberta. Barato: só layout do `page.tsx` e do cabeçalho cliente.
2. **Bloco 5** (contagem no rodapé da sidebar): leitura, não ação; usa `data.total` que o
   componente já tem.
3. **P1 de acessibilidade** (chip com `aria-current`, `Esc`/foco no drawer, alvos 44/48): sem
   mudança visual além do tamanho dos chips.
4. **Estado offline** (faixa âmbar + `navigator.onLine`): último, porque exige teste próprio.
5. **Densidade da grade**: o desenho confirma 5 colunas em 1440 — não proponho mudar a grade,
   só o **pitch entre seções** (360), que hoje faz os rótulos de um tipo encostarem no
   cabeçalho do próximo.

## 10. O que o desenho **não** muda

- A grade de 5 colunas em 1440 e 2 em 375 (medida na spec, mantida);
- `PAGE_SIZE = 12` e o cursor de "carregar mais";
- A ordem das seções por tipo (a canônica `CATEGORY_TOKENS`);
- A sidebar sticky `top-20` com scroll próprio;
- O comportamento de filtro ao vivo por query string (é o que torna o recorte compartilhável).

## 11. Como reproduzir

```powershell
node apps/web/scripts/figcraft-conceito-catalogo.mjs          # 992 comandos → .jsonl
& 'C:\Program Files\FigCraft\figcraft-cli.exe' run docs\02-architecture-design\figcraft\conceito-catalogo\conceito-catalogo.jsonl `
    --out docs\02-architecture-design\figcraft\conceito-catalogo\conceito-catalogo.figcraft
& 'C:\Program Files\FigCraft\figcraft-cli.exe' render docs\02-architecture-design\figcraft\conceito-catalogo\conceito-catalogo.figcraft `
    -o docs\02-architecture-design\figcraft\conceito-catalogo\catalogo-1440.png --scale 1 --page "Catálogo — 1440"
```

## 12. Achados de ferramenta (para não repetir)

1. **`parent` mudou de contrato no FigCraft**: `figcraft-cli commands` diz
   `parent? (id; default: the page)`. O gerador da home passa **nome**
   (`parent: "Home v9 / 1440"`) e hoje falharia com
   `invalid parameters for node.create: parent must be a node id`. Este gerador não usa
   frames: os nós nascem na página (mesmas coordenadas, porque as páginas começam em 0,0).
2. **`lucide-static` nunca foi dependência declarada** — o gerador da home lê
   `node_modules/lucide-static/icons/*.svg` e quebra em instalação limpa. Aqui os ícones vêm
   de **`lucide-react`** (dependência real) renderizados com `renderToStaticMarkup`: zero
   dependência nova.
3. **Medir o PNG, não o script**: a primeira renderização mostrou seções invadindo uma à
   outra (pitch 296 para conteúdo de 352) e contagem dentro do `h2` — dois erros que a
   leitura do gerador não pegaria.

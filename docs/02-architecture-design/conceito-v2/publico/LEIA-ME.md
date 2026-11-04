# Conceito v2 — quadros do público (5 telas)

Primeira rodada do conceito v2 para a família pública, desenhada no FigCraft a partir de
[`../00-FUNDAMENTOS.md`](../00-FUNDAMENTOS.md) e do que o produto já mede em
`docs/02-architecture-design/ui-ux/` (`10-catalogo`, `11-rankings`, `13-media-score`, `22-descoberta`).

## Arquivos

| Arquivo | O que é |
|---|---|
| `conceito-publico-v2.jsonl` | roteiro FigCraft (2.696 comandos, determinístico) |
| `conceito-publico-v2.figcraft` | documento com as 5 páginas |
| `home-v2.png` | 1440 × 2760 — Hero/Home |
| `catalogo-v2.png` | 1440 × 1800 — Catálogo |
| `rankings-v2.png` | 1440 × 1540 — Rankings |
| `descobertas-v2.png` | 1440 × 1460 — Descobertas |
| `obra-v2.png` | 1440 × 1920 — Página da mídia |

Gerador: `apps/web/scripts/figcraft-v2-publico.mjs` (importa `figcraft-v2-lib.mjs` por caminho
relativo e usa a grade da lib: `M=120`, `CONTEUDO=1200`, `COL=78`, `VAO=24`).

## Como regerar (da raiz da worktree)

```powershell
node apps/web/scripts/figcraft-v2-publico.mjs

$dir = "docs/02-architecture-design/conceito-v2/publico"
& 'C:\Program Files\FigCraft\figcraft-cli.exe' run "$dir/conceito-publico-v2.jsonl" `
  --out "$dir/conceito-publico-v2.figcraft"

& 'C:\Program Files\FigCraft\figcraft-cli.exe' render "$dir/conceito-publico-v2.figcraft" `
  -o "$dir/home-v2.png" --scale 1 --page "Home — v2 público"
# (repetir para: "Catálogo — v2 público", "Rankings — v2 público",
#  "Descobertas — v2 público", "Obra — v2 público")
```

## Mecânica de cada quadro (linha do rodapé)

| Quadro | Mecânica |
|---|---|
| Home | a régua é controle, não ornamento: clicar numa faixa reescreve a URL e filtra as seis mídias; o recorte volta pelo link |
| Catálogo | cada filtro reescreve a URL (recorte compartilhável) e o rail conta os ativos |
| Rankings | alternar tipo ou faixa reordena a lista no lugar; a régua é o eixo das duas leituras |
| Descobertas | toda relação declara o motivo (faixa, fonte ou franquia) e a evidência; nada de "para você" solto |
| Obra | a nota nunca aparece sem a decomposição (crítica × público × consenso) e sem a fonte com data |

## Limites declarados

- **Contagens:** todo total aparece como `N` (vem da API). Obras, notas e datas são **exemplo de
  escala**, dito no rodapé de cada quadro.
- **Pôsteres:** não há arte real; cada pôster é um bloco com monograma e rótulo `PÔSTER` (sem
  quadrado vazio sem rótulo).
- **Tipografia:** os tokens pedem Inter; nesta máquina só Space Grotesk está instalada, então o
  texto de corpo cai no fallback do sistema (Segoe UI). As quebras são manuais, então o desenho
  não depende da fonte instalada.
- **Decomposição da nota:** usa os pesos reais do engine (`movie`: crítica 40% + público 40% +
  consenso 20%, `m=60`) e a fórmula real do consenso (`1 − |crítica − público|`). A aritmética
  do exemplo é consistente: 8,9 / 8,6 → consenso 9,7 → S = 8,94 → bayesiano → 8,9.
- **Categorias sem nota ativa** são declaradas como estado ("notas em preparação" em Quadrinhos),
  não escondidas nem preenchidas com número.

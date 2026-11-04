# Conceito v2 — Fundamentos (base para os quadros)

> **Status:** fundação do novo conceito visual do MEDIA Rate. Este documento é a fonte de
> verdade para os geradores e para os quadros desenhados no FigCraft; cada quadro deve
> poder ser rastreado até uma regra daqui.
>
> **Branch exclusiva:** `feat/conceito-v2-multiart` · worktree `.agents/worktrees/feat/conceito-v2-multiart`.
> Nada aqui entra em `main` sem aprovação do Operador e sem PR.

## 1. A direção: "mesa de montagem"

O MEDIA Rate não é uma loja de streaming nem um agregador de notas: é uma **mesa de
decisão** — você chega com tempo escasso e sai com uma escolha justificada. O v1 estava
correto e genérico: fundo escuro, cards, carrosséis. O v2 troca o vocabulário de *app*
pelo vocabulário de **mesa de edição / folha de contato**:

| Princípio | Como aparece |
|---|---|
| **A régua é o instrumento, não um enfeite** | a escala de 0 a 10 é uma peça persistente da interface: aparece na home, no catálogo (como eixo de filtro), na ficha e no admin de curadoria |
| **Editorial, não vitrine** | tipografia com hierarquia de jornal (display + texto + números tabulares), hairlines que separam blocos como em prova de impressão, muito ar entre grupos |
| **Corte, não fade** | transições secas: seções trocam como corte de filme; nada de fade lento/genérico. Movimento só onde comunica estado (régua, entrada de item) |
| **Uma cor de trabalho + as seis da régua** | o acento de marca é único e disciplinado; as seis cores das faixas de score são o único lugar com cor saturada |
| **Superfície em duas camadas** | "mesa" (fundo) e "papel" (card/bloco) com contraste de luminosidade, não com bordas brilhantes |

### O que é "vício de design de IA" (proibido neste conceito)

1. Gradiente roxo-azul de fundo, glow neon em tudo, "glassmorphism" como textura padrão.
2. Card com borda 1px + `rounded-2xl` em toda peça, e tudo dentro de card (card de card).
3. Ícone Lucide sozinho dentro de círculo colorido como "feature".
4. Pill/badge para tudo, inclusive para texto que não é estado.
5. Emoji como ícone, ilustração genérica de "pessoa com laptop", 3 cards idênticos com
   títulos de 2 palavras ("Fácil", "Rápido", "Seguro").
6. Fade-in em cada seção no scroll; parallax decorativo; contador animado sem motivo.
7. Texto de marketing com número inventado ("+10.000 usuários").
8. Hero com mockup de dashboard flutuando em perspectiva.

## 2. Tokens v2

Base escura continua (é o produto, e a ficha de obra precisa de contraste para pôster),
mas com hierarquia mais dura e um acento "papel".

```txt
# mesa (fundo) — três degraus, sem borda
mesa.0   #08080C   fundo da página
mesa.1   #0E0E14   faixa de seção alternada
mesa.2   #14141C   bloco/painel

# papel (superfícies de conteúdo)
papel.0  #F4F1EA   papel claro (usado em blocos editoriais escassos)
papel.tinta #14141C texto sobre papel

# tinta (texto sobre mesa)
tinta.1  #F2F0EB   primário
tinta.2  #A8A49C   secundário
tinta.3  #6E6A64   terciário/rótulo

# regra (hairlines) — 1px, nunca "border colorida"
regra.1  #26262E
regra.2  #34343E   hover/foco de campo

# acento de trabalho (marca)
acento   #E8543F   coral de trabalho (CTA, link, estado ativo)
acento.hover #F26B57
acento.tinta #1A0E0B  texto sobre acento

# faixas da régua (as six, canônicas — iguais às do produto)
faixa.9  #2FD3A0   Excepcional
faixa.8  #3FA9F5   Muito bom
faixa.7  #8B8CF0   Bom
faixa.6  #E8B44A   Razoável
faixa.5  #E8853F   Fraco
faixa.0  #E05A55   Evite

# estado
aviso    #E8B44A
erro     #E05A55
sucesso  #2FD3A0
```

**Regra dura:** nenhuma outra cor entra nos quadros. As seis faixas só aparecem onde
representam nota (régua, selo, barra, chip de faixa) — nunca como decoração de card.

### Tipografia

| Papel | Fonte | Escala (1440) |
|---|---|---|
| Display (h1 de página) | Space Grotesk 700, tracking -0.02em | 44 / 1.06 |
| Título de seção (h2) | Space Grotesk 600 | 26 / 1.15 |
| Título de bloco (h3) | Inter 600 | 17 / 1.3 |
| Corpo | Inter 400 | 16 / 1.6 |
| Apoio/rótulo | Inter 500, uppercase, tracking 0.08em | 11 |
| Número (nota, contagem) | Inter 600 `tabular-nums` | conforme contexto |

## 3. Grade

- Container: `max-w-[1200px]` centrado, margem de 48 em 1440 → conteúdo de **120 a 1320**.
- 12 colunas de **78** com vão de **24** (`12*78 + 11*24 = 1200` — exatamente o container). **Correção:** a primeira versão dizia 84, o que somava 1272 e fazia `col(11)+78` passar da direita (1392 > 1320). A lib foi corrigida; `col(11)+COL = 1320` fecha na margem.
- Blocos editorial: `col-span-4 / 6 / 8 / 12`. Nada de largura "no olho".
- Altura de linha de seção: 96 entre blocos grandes, 48 entre blocos irmãos.
- Régua (hairline) sempre na coluna 1 → 12, nunca "quase até o fim".

Constantes para os geradores: `M=120`, `CONTEUDO=1200`, `DIREITA=1320`, `COL=84`, `VAO=24`,
`col(i) = M + i*(COL+VAO)`.

## 4. Mecânica das páginas (o que cada quadro precisa mostrar)

O quadro não é "uma tela bonita": cada um tem de mostrar **a mecânica** que a página
resolve. Uma linha obrigatória por quadro, no rodapé do artefato, explicando o mecanismo.

### Família A — público/descoberta
1. **Hero/Home**: promessa → régua como instrumento → 6 tipos → prova (fontes) → carrosséis.
   Mecânica: a régua filtra o catálogo ao clicar numa faixa (é controle, não ornamento).
2. **Catálogo**: barra de busca/ordenação, filtros em rail, grade densa, contagem do recorte.
   Mecânica: cada mudança de filtro reescreve a URL (recorte compartilhável) e o rail mostra
   quantos filtros estão ativos.
3. **Rankings**: topo por tipo e por faixa, com a régua como eixo vertical.
   Mecânica: alternar tipo/faixa reordena a lista sem recarregar.
4. **Descobertas**: relações entre obras ("quem gostou de X também considerou Y"), com o
   motivo explícito (mesma faixa, mesma fonte, mesma franquia).
   Mecânica: cada recomendação declara o porquê — nunca "recomendado para você" solto.

### Família B — obra
5. **Página da mídia**: pôster + ficha + selo de nota + **decomposição da régua** (crítica x
   público x consenso) + fontes com nota e data + ações (watchlist, listas, comparar).
   Mecânica: a nota nunca aparece sem a decomposição e a fonte.

### Família C — conta
6. **Dashboard**: estado do que você consome (continuar, watchlist, últimas notas) + atalhos.
7. **Perfil**: gosto declarado x observado, com a régua do perfil.
8. **Login/Registro**: fluxo centrado, uma decisão por tela.

### Família D — admin (10 telas, mesmo desenho)
9. **Overview**: saúde do acervo (cobertura por tipo, filas, erros de coleta).
10. **Curadoria/Fila**: o trabalho de operação — o que está pendente, o que falhou, o que
    publicar. Mecânica: cada linha declara o próximo passo.
11. **Catálogo admin, Métricas, Usuários, Auditoria, Fontes, Cotas, Diagnóstico, Config**:
    tabela densa + rail de filtros + detalhe lateral.

Admin **não** repete o visual editorial do público: é uma **mesa de operação** — mais densa,
mono no número, sem pôster grande. Mesmos tokens, mesma grade, densidade maior.

## 5. Regras de produção dos quadros

- Geradores em `apps/web/scripts/figcraft-v2-*.mjs`, saída em
  `docs/02-architecture-design/conceito-v2/<familia>/`.
- Cada gerador: 1440 de largura, páginas nomeadas (`"Catálogo — v2"`), comandos
  determinísticos (sem aleatoriedade), sem dado inventado — contagem como `N`, nota de
  exemplo marcada como exemplo.
- Rodapé de cada quadro: `mecânica:` + uma linha.
- Verificação obrigatória: renderizar o PNG e **medir** (dimensões, sobreposição, overflow)
  antes de declarar pronto. Render que não abre é quadro inexistente.
- `figcraft-cli run <jsonl> --out <figcraft>` e `figcraft-cli render <figcraft> -o <png> --page <nome>`.

## 6. Escopo de escrita por frente (sem sobreposição)

| Frente | Escreve em |
|---|---|
| Fundação (Lead) | este documento, `apps/web/scripts/figcraft-v2-lib.mjs` |
| Público + obra | `docs/.../conceito-v2/publico/`, `docs/.../conceito-v2/obra/`, `apps/web/scripts/figcraft-v2-publico.mjs` |
| Conta + admin | `docs/.../conceito-v2/conta/`, `docs/.../conceito-v2/admin/`, `apps/web/scripts/figcraft-v2-conta-admin.mjs` |
| Logo skill | `docs/07-operations-marketing/LOGO-DESIGN-SKILL.md`, `design-system/media-rate/logo/` (somente leitura hoje), `apps/web/scripts/logo-*.mjs` |

Ninguém edita `apps/web/src/**` nesta fase: é **conceito**, não implementação. A
implementação vem depois, com PR e aprovação.

# DESIGN — Design system (estado real)

## Cores canônicas por tipo de mídia — `CATEGORY_TOKENS` (fonte única)

| Tipo | Token | Hex |
|---|---|---|
| Filme | movie | `#818CF8` |
| Série | series | `#38BDF8` |
| Jogo | game | `#34D399` |
| Livro | book | `#FBBF24` |
| Quadrinho | comic | `#F472B6` |
| Mangá | manga | `#A78BFA` |

- Contraste AA das 6 cores testado (PR #143). `nicheLabelKey()` (via CATEGORY_TOKENS)
  resolve os rótulos de nicho — NUNCA chaves `catalog.movie` (não existem; as chaves
  reais são filme/livro — armadilha histórica do T460).
- **Proibido misturar** acentos indigo/sky legados de foco/marca com CATEGORY_TOKENS
  (cores de tipo de mídia) — migração para tokens semânticos é a #148 item 2.

## Convenções real-vs-demo (F17)

- Métrica **sem dado** → exibir "—" (nunca zero nem número inventado).
- Visualização **demo** → badge `demoBadge` visível (pulso sempre demo; radar cai para
  fallback com <3 gêneros).
- Trend/delta do card 1 = dado real Premium.

## Componentes e padrões

- RSC primeiro; client components só onde há interação (Kanban, gráficos).
- Dashboard consolidada em `DashboardOverview` (dead code de gráficos removido no
  T460/#143).
- Biblioteca: `BibliotecaClient` com abas por status + contagens globais server-side;
  deep links `?status=`/`?tipo=` validados contra enums (nunca confiar na query).
- Kanban: `WatchlistKanban` com `podeMoverPara()` — drop inválido é no-op (D-529),
  a API rejeita 400 (D-528) como segunda camada.

## Acessibilidade

Ver [ACCESSIBILITY](ACCESSIBILITY.md). Regra mínima: contraste AA nos tokens canônicos
(testado), foco visível, rótulos i18n em todo controle (nunca chave crua).

## Onde mexer

- Tokens/paleta: `apps/web/src/lib/` (CATEGORY_TOKENS) — não espalhar hex em componentes.
- Mensagens: `apps/web/src/messages/{pt-BR,en-US,es-ES}.json` (3 línguas, paridade).
- Antes de criar componente: procurar equivalente em `apps/web/src/components/`.

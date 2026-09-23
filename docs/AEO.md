# AEO — Answer Engine Optimization (respostas extraíveis)

Objetivo: páginas que respondem perguntas **diretas e completas** para snippets,
voice e answer engines. Estratégia-mãe: [`SEO_AEO_AIO_GEO.md`](SEO_AEO_AIO_GEO.md).

## Princípio

Toda página pública responde **uma pergunta central** no primeiro parágrafo — concisa,
autocontida, sem depender do resto da página para fazer sentido. Depois sustenta com
detalhes, escopo e ressalvas. **Nada de blocos artificiais de keyword.**

## Padrão do projeto (exemplo real)

A FAQ da **Metodologia** (`/methodology` + `/faq`) é o modelo: pergunta literal em
`H2/H3` → resposta visível → evidência contextual na MESMA página.

## Checklist ao escrever/alterar página pública

- [ ] A pergunta de maior intenção está em heading próprio (`H2/H3`)?
- [ ] A resposta direta vem ANTES da explicação longa?
- [ ] Dados citados (score, contagens, fontes) são demonstráveis no HTML?
- [ ] Schema/FAQ **só quando a resposta está visível** — sem texto oculto, sem
      repetição em massa, sem alegação promocional.
- [ ] Glossário para termo próprio ambíguo (ex.: "MEDIA Score™") quando a pesquisa
      mostrar ambiguidade — definição estável + link para o método.

## Perguntas-alvo já mapeadas

- "Como o MEDIA Score é calculado?" → `/methodology`
- "Quais fontes o MEDIA Rate usa?" → `/sources`

## Mensuração

Consultas com interrogativos (impressões/CTR por cluster) no Search Console; ajustes
de snippet **por dado**, nunca por suposição. Revisão trimestral na Beta.

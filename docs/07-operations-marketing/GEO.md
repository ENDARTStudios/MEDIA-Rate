# GEO — Generative Engine Optimization (ser citado por IA generativa)

Objetivo: sistemas generativos (ChatGPT, Perplexity, Copilot) citarem o MEDIA Rate
**corretamente** — com método, cobertura e limites. Estratégia-mãe:
[`SEO_AEO_AIO_GEO.md`](SEO_AEO_AIO_GEO.md). Relacionado: [AIO](AIO.md) (medição).

## Princípio de citação responsável

**Não manipular**: sem listas de nomes de modelos, páginas invisíveis ou texto
fabricado para "parecer citação". A contribuição do MEDIA Rate é explicável em
termos de método, cobertura e limites do score — é isso que torna citável.

## Pilar implementado

- **Páginas âncora estáveis e datadas**: `/methodology`, `/sources`, `/about` —
  autor/organização claros, URL estável, data de revisão quando aplicável.
- **JSON-LD só com fatos demonstráveis no HTML** — nunca nota/rating/contagem que
  não corresponda a evidência pública.
- **Ligações semânticas**: obra ↔ tipo ↔ gênero ↔ método ↔ fontes (breadcrumb +
  schema do tipo adequado na página de entidade).
- **robots por bot** (T030/D-440): treino de IA bloqueado (Grupo A), busca com IA
  navega sem consumir otimizador de imagens (Grupo B) — decisão de custo/controle,
  não de visibilidade.

## Checklist de mudança em página de entidade/âncora

- [ ] O fato central (o que é, como se calcula, qual a cobertura) está em texto?
- [ ] Mudou o método/fontes? Atualiza `/methodology`/`/sources` no MESMO PR.
- [ ] JSON-LD continua 1:1 com o HTML visível?
- [ ] URL estável preservada (sem trocar slugs de páginas âncora)?

## Mensuração (com data, sempre)

Registrar menções em respostas de IA **por amostra de consultas**: data, prompt exato
e URL citada (planilha de monitoramento; nunca concluir por uma única resposta).

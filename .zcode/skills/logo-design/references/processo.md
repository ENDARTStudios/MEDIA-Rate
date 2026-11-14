# Processo de logo do MEDIA Rate — as 7 fases

> Absorve a estrutura da skill externa (MIT) e a traduz para o nosso contexto:
> produto escuro, uma cor de trabalho, governança por PR. O SKILL.md dá o
> resumo; aqui está o detalhe de cada fase, com os portões de parada.

## 0. Mapa de fases

| Fase | Saída | Portão |
|---|---|---|
| 1. Descoberta | brief de 1 página + suposições | brief acordado (feito ou declarado) |
| 2. Pesquisa/estratégia | clichês da categoria, word map, 2+ tipos de marca | direção de estratégia justificada |
| 3. Conceitos | 8–12 frases de uma linha, 3 construídas | 3 conceitos distintos e no brief |
| 4. Construção | 3 vetores em uma cor | presentável a ~80% |
| 5. Teste/refino | versões + folha de teste | `logo-audit` sem FAIL + PNG 16/32 olhados |
| 6. Checkpoint | 1 imagem greyscale + recomendação | **parar** e esperar escolha |
| 7. Kit | cor, lockups, ícone, guidelines | checklist final da skill |

## 1. Descoberta → brief

Colete (ou declare suposições):

- **Nome exato** (grafia, caixa, espaços) e como se escreve no texto corrido.
- **O que faz** em uma frase, sem jargão de marketing.
- **Público** e o contexto em que encontra a marca (app, loja, feed, e-mail).
- **3–5 adjetivos** — é o insumo mais valioso: viram pistas visuais.
- **Concorrentes** (3) e o que o diferencia de fato.
- **Restrições:** cores obrigatórias/proibidas, equity a manter, onde precisa
  funcionar (16 px, banner, bordado, avatar), quem decide.
- **Escopo:** símbolo? lockup? kit completo? só crítica?

Template de brief (1 página):

```md
# Brief — <marca>
O que é: <uma frase> · Público: <quem/onde>
Adjetivos: <a> · <b> · <c>
Concorrentes: <x, y, z> — convenção: <o que todos fazem>
Restrições: <cor, equity, tamanhos, prazo>
Decisor: <quem aprova> · Suposições: <o que assumimos sem confirmar>
Não pode parecer: <leituras erradas>
```

Atalho: sem informação? **declare as suposições** e siga. Não trave o trabalho
esperando respostas.

## 2. Pesquisa e estratégia

1. **Clichês da categoria** — liste e trate como proibidos, a menos que a forma
   seja genuinamente nova. Para o MEDIA Rate (streaming/avaliação de mídia):
   triângulo de play, estrela/pipoca, "G" de gauge, termômetro de nota, seta
   para cima, globo, chat bubble, gradiente roxo-azul, estrela de avaliação.
2. **Word map:** nome, oferta, adjetivos e promessa → substantivos, metáforas,
   opostos. Circule as interseções (é de onde saem os conceitos).
3. **Tipo de marca** — escolha pelo menos dois tipos para explorar (tabela em §3).
4. **Mapa do que já existe:** procure marcas parecidas (busca de imagem e o
   repertório próprio) para não recriar o que já existe — sem copiar.

## 3. Tipos de marca (trade-offs)

| Tipo | Bom em | Risco | No MEDIA Rate |
|---|---|---|---|
| **Wordmark** | nome curto e forte; voz editorial | depende de tipografia própria | alto potencial (v2 é editorial) |
| **Monograma** | "MR", "M", "R"; espaço quadrado | pode virar genérico; exige letra robusta | precisa de letterform própria |
| **Letterform** | letra como símbolo | legibilidade a 16 px | bom se a letra for a ideia |
| **Pictórico** | metáfora concreta | literalidade/clichê | só com twist (não desenhar o produto) |
| **Abstrato** | sistema, movimento, escala | "forma sem dono" | combina com a régua/mesa |
| **Emblema** | selo, carimbo | detalhe fecha a 16 px | herança do "selo" v1 |
| **Mascote** | tom humano/afetivo | não escala para UI | fora do vocabulário v2 |
| **Combinação** | símbolo + nome | complexidade | padrão para header/favicon |

## 4. Conceitos

- Escreva **8–12 frases de uma linha**, espalhadas por tipos. Exemplo de
  formato: "um losango cortado por uma régua horizontal, para uma marca que
  pontua o que você assiste".
- Se a frase serve para o concorrente, **não é conceito**.
- Pontue rápido (1–5): clareza da ideia, distinção, simplicidade, relevância,
  força em 16 px. Construa só os **3 melhores e mais diferentes**.
- Antes de construir, cheque que nenhum dos 3 é cópia de algo conhecido.
- Longlist fica no texto; construção é caro — não polir o que vai cair.

## 5. Construção em SVG (uma cor primeiro)

- Descreva a construção em **palavras e números** antes do código: primitivos,
  raios, ângulos, unidade de malha, relações (ex.: "losango |x|+|y|=96; corte
  horizontal; metades deslocadas ±16 u ao longo do corte; vão 16 u").
- Canvas `viewBox="0 0 256 256"` para símbolo; lockup mantém 256 de altura.
- **Uma cor** (tinta sobre papel ou luz sobre mesa). Cor é fase 7.
- Salve cada iteração (`selo-v1.svg`, `-v2.svg`…); nunca sobrescreva.
- Pipeline e receitas: `construcao-svg.md`.

## 6. Testar e refinar (no mínimo 2 voltas)

Rode o loop de prova do SKILL.md. Corrija o que falhar e **olhe de novo**.
Refinamentos típicos: escala (sobrevive a 16 px?), correções ópticas (overshoot,
irradiação no reverso, peso de horizontais, centro óptico), equilíbrio,
leituras involuntárias, distinção. Lista completa em `checklist-teste.md`.

## 7. Checkpoint (mostrar e parar)

Uma imagem com os conceitos em **cinza** (cor dispara debate de gosto), uma
linha por conceito, recomendação e oferta do kit:

```md
![conceitos](renders/conceitos.png)

### A — <nome> · <tipo de marca>  ← recomendado
**Ideia:** <uma frase>
**Por que encaixa:** <2–3 bullets ligados ao brief>

### B — … / ### C — …

**Recomendação:** <1–2 frases, com um risco honesto por conceito>
**Próximo:** escolha uma direção (ou diga o que gostou em cada). Preparo o kit
completo dela? Ele inclui cor, mono/reverso, lockups, ícone/favicon, folha de
teste e guidelines de uma página.
```

**Pare e espere.** Só construa o kit quando houver escolha (ou quando o pedido
já tiver autorizado a entrega completa — registre isso no relatório).

## 8. Kit (só após escolha)

1. Refino final: geometria, correções ópticas, corte pequeno, reverso fino (~3%
   por irradiação — branco sobre escuro parece maior).
2. Cor: a cor de trabalho + leitura em uma cor; contraste ≥ 3:1 sobre a mesa.
3. Tipografia e lockups: Space Grotesk em contornos; relações travadas em `cap`
   (símbolo, espaço, entrelinha, baseline única).
4. Variações: mono tinta, reverso, símbolo, ícone/favicon (tile com 52–58%),
   folha de teste.
5. Guidelines de 1 página: área de proteção (`½ × S`), tamanhos mínimos, cor,
   fundos aprovados, usos proibidos.
6. Registre o que passou, o que foi ajustado e o que fica pendente (trademark,
   prova de Pantone/impressão).

## 9. Redesign (mexer no selo v1)

- **Auditoria de equity:** o que as pessoas reconhecem (losango, play, rose)?
  O que é problema (duas cores dependentes, detalhe que fecha)?
- Modos: *refresh* (mesma ideia, forma melhor) × *rebrand* (ideia nova). O v2 é
  refresh de linguagem, não necessariamente de símbolo.
- Preserve pelo menos uma âncora reconhecível e declare qual.
- Refaça todos os testes do zero — familiaridade com o antigo engana.
- Mudança no selo oficial exige PR, aprovação e atualização de
  `design-system/media-rate/logo/**` + `Logo.tsx` (fora desta fase).


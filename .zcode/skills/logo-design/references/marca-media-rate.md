# A marca MEDIA Rate — contrato para desenhar logo

> Fonte de verdade: `docs/02-architecture-design/conceito-v2/00-FUNDAMENTOS.md`,
> `design-system/media-rate/logo/README.md` (v1), `design-system/media-rate/MASTER.md`,
> `DECISOES.md` (D-065) e `AGENTS.md`. Em conflito, vence o arquivo do repo.

## 1. O produto, em uma frase

O MEDIA Rate é uma **mesa de decisão**: você chega com tempo escasso e sai com
uma escolha justificada. Não é loja de streaming nem agregador de notas — é a
régua 0–10 aplicada a filme, série, jogo, livro, HQ e mangá.

Pistas visuais que a marca carrega (v2): **régua, corte editorial, mesa/papel,
selo**. O v1 carregava **losango (selo) + play (mídia)**.

## 2. Tokens (conceito v2)

```txt
mesa.0 #08080C · mesa.1 #0E0E14 · mesa.2 #14141C     (fundo, 3 degraus)
papel.0 #F4F1EA · papel.tinta #14141C                 (superfície clara)
tinta.1 #F2F0EB · tinta.2 #A8A49C · tinta.3 #6E6A64   (texto sobre mesa)
regra.1 #26262E · regra.2 #34343E                      (hairlines)
acento #E8543F · acento.hover #F26B57 · acento.tinta #1A0E0B
faixa.9 #2FD3A0 · 8 #3FA9F5 · 7 #8B8CF0 · 6 #E8B44A · 5 #E8853F · 0 #E05A55
```

**Regra dura:** nenhuma cor fora dessas. As seis faixas só aparecem onde
representam **nota** (régua, selo, barra, chip) — nunca como decoração.
O logo vive em **uma cor** (`acento` ou `tinta`/`papel.tinta`); a regra de
"duas cores" do v1 (rose + indigo) **não** vale para o v2.

## 3. Tipografia

- **Space Grotesk** (OFL) — display e wordmark; 700 para o assunto, 300 para o
  contraste editorial (como no v1). Inter para texto.
- Wordmark sempre em **contornos**; nunca `<text>` no master.
- Relações do lockup v1, se mantiver: símbolo = 1,42 × `cap`; espaço símbolo→
  palavra = 0,44 × `cap`; espaço entre palavras = 0,72 × `cap`; baseline única.

## 4. Equity do selo v1 (o que preservar ao mexer)

| Elemento | Papel | Preservar? |
|---|---|---|
| losango de cantos suaves | o "selo"/nota | forma reconhecível; pode virar corte/deslocamento desde que a leitura de losango sobreviva |
| play vazado | a mídia | **não** é obrigatório no v2; o triângulo de play é o clichê nº 1 da categoria |
| rose `#E11D48` no play | a nota | no v2 a cor de trabalho é `#E8543F`; não misturar |
| indigo `#818CF8` na estrutura | estrutura | v2 não usa duas cores no símbolo |
| contraste 700/300 | hierarquia | pode manter no wordmark |

Qualquer mudança no selo **oficial** exige PR, aprovação do Operador e atualização
de `design-system/media-rate/logo/**` + `Logo.tsx` + favicon/OG. Nesta fase de
conceito, escreva só em `docs/02-architecture-design/conceito-v2/logo/**`.

## 5. Clichês que o MEDIA Rate recusa

- Triângulo de play (isolado ou em círculo) — a própria v1 usa; no v2 é o que
  mais aproxima de "qualquer app de vídeo".
- Estrela, pipoca, balde de pipoca, claquete, globo, chat bubble.
- Termômetro/medidor/velocímetro de nota, barras crescentes, gráfico de linha,
  seta para cima — "dado genérico", não marca.
- Estrela de avaliação, "G" de gauge, selo de "aprovado".
- Gradiente roxo-azul, glow, glass, aurora — **D-065**.
- Monograma "MR" em fonte de sistema sem modificação própria.

## 6. Leituras que a marca quer evitar

- "App de streaming" genérico (play, telas, pipoca).
- "Site de review" genérico (estrela, nota, polegar).
- "Ferramenta de dados/BI" (barras, eixos, ponteiro de gauge).
- "Erro/quebrado" (formas partidas demais, glitch, X).
- "Infantil" (mascote, roxo, cantos de bolha).

## 7. Onde o logo encosta no produto

| Peça | Arquivo | Status |
|---|---|---|
| Lockup do header | `apps/web/src/components/Logo.tsx` | **não editar** nesta fase |
| Selo oficial + exports | `design-system/media-rate/logo/**` | outra frente — leitura apenas |
| Favicon / apple-icon / OG | `apps/web/public/`, `apps/web/src/app/` | só por PR |
| Conceito v2 (esta frente) | `docs/02-architecture-design/conceito-v2/logo/**` | escrever aqui |

## 8. Regra de ouro

O símbolo tem de ser **o selo do que você assiste pontuado**, não um gráfico de
nota nem um botão de play. Se o desenho explica o produto (play → streaming),
ele identifica o concorrente; se explica o dado (barra → nota), identifica o
dashboard. A marca é a **ação de pontuar**, com a régua como instrumento.

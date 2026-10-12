---
name: ux-copywriting
description: >
  Escrita de copy de interface e conversão do MEDIA Rate nos 3 locales
  (pt-BR/en-US/es-ES): funil gancho→promessa→prova→CTA, tom de voz, regras de
  veracidade (nada de promessa perpétua de gratuidade ou número inventado),
  padrões de microcopy, mensagens de erro/estado vazio e nomes de ação em
  português, inglês e espanhol com paridade de chaves. Use ao escrever ou revisar
  qualquer texto que aparece na tela, e-mail ou material de aquisição do produto.
---

# UX Copywriting MEDIA Rate

## Tom de voz

Cinéfilo-informado, direto, sem hype. Frases curtas. Zero adjetivo de propaganda
("revolucionário", "o melhor do mundo", "incrível"). O produto é um **termômetro
de qualidade** — a voz é de quem já viu tudo e diz o que vale o seu tempo.

- Fala com "você" (pt-BR), "you" (en-US), "tú" (es-ES).
- Vocabulário de decisão: vale o tempo, decidir, salvar, comparar, onde assistir.
- Precisão > simpatia: número certo, nome real da fonte, escala correta
  (GAME 0–100; demais 0–10 — nunca dizer "0 a 10" para games).

## Estrutura obrigatória (ver `marketing-funnel.md`)

1. **Gancho** — dor/desejo específico em 4–12 palavras. Sem número inventado.
2. **Promessa** — o que é + ganho, em 1–2 frases, com simplicidade e razão.
3. **Prova** — dado real e verificável (fonte derivada, método, score real).
4. **CTA** — imperativo + objeto, uma ação dominante.

## Regras duras de veracidade (quebram CI/geram incidente)

- ❌ "grátis para sempre" / "free forever" / "gratis para siempre" — proibido
  (T087; guarda em `test/hero-promessa-perpetua.spec.ts`). Menção a plano
  gratuito é ok desde que sem prazo indeterminado.
- ❌ "em breve"/"coming soon" para algo que já existe (`home-truthfulness.spec.ts`).
- ❌ número de marketing digitado à mão. Fontes/categorias/títulos vêm de
  `@/lib/sources` ou da API, com `{count}` no ICU.
- ❌ nome de fonte que não existe em `FONTES_WEB` (ex.: não escreva "IMDb" se a
  fonte registrada é "OMDb (IMDb)").
- ❌ prometer funcionalidade não entregue (roadmap como disponível).

## Microcopy — padrões do projeto

| Situação | Padrão |
|---|---|
| Verbo de ação | imperativo: "Explorar catálogo", "Criar conta grátis", "Salvar na watchlist" |
| Atrito | factual: "Sem cadastro para explorar o catálogo." |
| Estado vazio | o que aconteceu + o que fazer: "Nenhum resultado para «{q}». Limpe os filtros ou tente outro título." |
| Erro | sem culpa, com saída: "Não conseguimos carregar o catálogo. Tentar de novo." |
| Carregando | gerúndio curto: "Buscando títulos…" |
| Confirmação | passado + próximo passo: "Salvo na sua watchlist. Ver lista." |
| Falta de dado | honesto: "Ainda sem avaliações suficientes." (`catalog.fewSources`) |
| Aria/leitor de tela | frase completa, com escala: `scoredial.ariaLabel` = "Score: {score} de {max}" |

## i18n (D-210) — obrigatório

- Sempre editar `apps/web/src/messages/{pt-BR,en-US,es-ES}.json` com **as mesmas
  chaves** (`test/i18n-parity.spec.ts`).
- pt-BR é a referência; en-US/es-ES são tradução real, nunca PT copiado
  (`test/i18n-estrutural.spec.ts` proíbe rótulos PT em EN/ES).
- Acentos corretos no valor; **commit em pt-BR sem acento**, não o JSON.
- Placeholders ICU (`{count}`) idênticos nos 3 locales.
- Evite apóstrofos dentro de strings ICU (o `'` é caractere de escape) —
  prefira reformular.
- Após editar, valide: `node -e "JSON.parse(require('fs').readFileSync('apps/web/src/messages/pt-BR.json','utf8'))"`
  (repetir para os 3).

## Referência de vocabulário por locale

| pt-BR | en-US | es-ES |
|---|---|---|
| filme / série / game / livro / HQ / mangá | movie / series / game / book / comic / manga | película / serie / juego / libro / cómic / manga |
| crítica | critics | crítica |
| público | audience | público |
| consenso | consensus | consenso |
| watchlist | watchlist | watchlist |
| catálogo | catalog | catálogo |
| decidir | decide | decidir |

Plurais canônicos de categoria já aprovados: `catalog.filme/serie/game/livro/comic/manga`
(EN: Movies/Series/Games/Books/Comics/Manga; ES: Películas/Series/Juegos/Libros/Cómics/Manga).

## Checklist antes de entregar copy

- [ ] Cada string tem uma função: valor, prova ou ação.
- [ ] Gancho e CTA funcionam sem contexto (lidos isolados, em 3 s).
- [ ] Nenhum número hardcoded; `{count}` quando aplicável.
- [ ] Nenhuma promessa perpétua / "em breve" indevido.
- [ ] Escala de score correta quando citada (games 0–100).
- [ ] 3 locales com paridade e idioma real; JSON validado.
- [ ] Acentos e maiúsculas consistentes com o restante da tela.
- [ ] Testes de copy rodados (`npm test --workspace apps/web`).

# Funil de marketing (gancho → promessa → prova → CTA)

Estrutura obrigatória de qualquer tela de aquisição (hero, landing, e-mail,
post social). Cada bloco tem um trabalho; se um bloco não tem trabalho, sai.

## 1. Gancho — primeiros 3 segundos / topo do post

Trabalho: parar o scroll e nomear uma **dor, desejo ou curiosidade** específica
do público (quem consome filme/série/game/livro/HQ/mangá e perde tempo
escolhendo).

Regras:
- 1 frase, 4–12 palavras, no idioma do usuário; pode ser pergunta.
- Concreta e verificável: **proibido número/estatística inventada**.
- Não é slogan de marca ("Todo o seu entretenimento. Um único score." é
  posicionamento, não gancho).
- Onde vive: `landing.hero` (H1) + pill de marca (`landing.heroEyebrow`).

## 2. Desenvolvimento / Promessa

Trabalho: explicar em 1–2 frases o que o produto faz e qual o ganho, com
gatilhos de **simplicidade** ("uma nota só") e **razão** (como funciona).

Regras:
- Dizer o que É, não adjetivo vazio ("revolucionário", "melhor do mundo").
- Cobrir a amplitude real: 6 categorias, N fontes (N derivado).
- Sem promessa de preço/gratuidade perpétua (T087).
- Onde vive: `landing.heroSubtitle`.

## 3. Prova ou exemplo

Trabalho: validar. Precisa ser **real e verificável** — caso, número do
sistema, demonstração, transparência de método.

Formatos aceitos neste projeto:
- Números derivados do produto: `NUM_FONTES_ATIVAS`, total do catálogo
  (`getCatalog().total`), 6 categorias (`HomeStats`).
- Lista real das fontes agregadas (`FONTES_ATIVAS`) — em marquee ou chips.
- Explicação do método (crítica + público + consenso) — `scoredial.*` +
  `landing.proofBody`.
- Score de um título real vindo da API/ISR (nunca do `MOCK_MEDIA` apresentado
  como dado real).

Proibido: depoimento inventado, "mais de X usuários" sem base, print fictício,
nota de exemplo exibida como nota real.

## 4. Chamada para ação (CTA)

Trabalho: dizer exatamente o que fazer agora.

Regras:
- **Uma CTA primária** visualmente dominante (fundo `#E11D48`, `rounded-lg`,
  `px-8 py-3.5`, `text-sm font-semibold`).
- Verbo no imperativo + objeto: "Explorar catálogo", "Criar conta grátis".
- A secundária é outline e nunca compete em peso visual.
- Atrito mínimo vence: o catálogo é público, então a CTA primária é
  **Explorar catálogo** (T474) e o cadastro é a secundária.
- Microcopy de atrito é permitida quando **factual** ("Sem cadastro para
  explorar o catálogo") — nunca promessa perpétua de gratuidade.
- CTA final da página repete a ação (ver bloco CTA em `page.tsx` da home).

## Auditoria do funil (usar em review)

| Pergunta | Se "não" |
|---|---|
| O gancho nomeia uma dor/desejo específico? | reescrever o H1 |
| A promessa explica o produto sem adjetivo vazio? | enxugar |
| A prova é verificável no repositório/produto? | trocar por dado derivado |
| Existe UMA ação dominante e óbvia? | hierarquizar os botões |
| Cada linha tem função (valor, prova, ação)? | remover a linha |
| Algum número está hardcoded? | derivar do registro/API |

# Apoio, parceria e patrocínio — estratégia

> **Onde isso vive no produto:** página `/apoie` (3 seções com âncora: `#apoiador`,
> `#parceiro`, `#patrocinador`), link no rodapé (grupo Produto) e entrada no `sitemap`.
> **O que existe hoje:** a página, os `mailto:` com assunto próprio por público e o evento
> `support_cta_click` (com `audience`). **O que não existe:** formulário, CRM, página de
> reconhecimento e qualquer acordo assinado. Este documento trata os três como programa, não
> como botão.

## 1. A tese

O ativo do MEDIA Rate é uma frase: **"esta obra vale o seu tempo"** — e ela só vale porque
não é comprável. Todo o financiamento tem de vir de quem quer a **independência**, nunca de
quem quer a **nota**. Essa é a única restrição estratégica; o resto é tática.

Isso define o posicionamento: não somos um catálogo com anúncios, somos um **avaliador
financiado por quem usa e por quem se beneficia da avaliação** — e o preço de entrar é aceitar
que a nota não muda.

## 2. Os três públicos (nenhum deles é "doador")

| | Quem é | O que compra de verdade | O que **não** está comprando | Caminho |
|---|---|---|---|---|
| **Apoiador** | pessoa que usa o produto e quer que ele continue independente | continuação do produto: planos, e apoio pontual | influência, atenção garantida, acesso a dado de outro usuário | `/pricing` + e-mail de apoio pontual |
| **Parceiro** | veículo, escola, festival, biblioteca, instituição cultural, mantenedor de dados | licença de recorte do catálogo/score com metodologia e fonte, e canal de correção de dados | exclusividade de fonte, endosso editorial, ranking "amigo" | e-mail de parceria |
| **Patrocinador** | marca que quer falar com quem decide o que consumir | atenção qualificada, **rotulada** como patrocínio, em seção definida | nota, ordem de ranking, linha editorial, silêncio sobre o rótulo | e-mail de patrocínio + material |

A distinção que faz a página funcionar: **apoiador financia a independência, parceiro usa a
independência, patrocinador se associa à independência.** Se qualquer um dos três quiser
comprar a nota, ele deixa de ser os três.

## 3. Gancho, promessa, prova e objeção — por público

### Apoiador

- **Dor:** cansou de recomendação que é propaganda com outro nome; não sabe em quem confiar.
- **Gancho:** "A nota que não está à venda — e o que você paga para ela continuar assim."
- **Promessa:** o produto continua sem anúncio no catálogo e com metodologia aberta.
- **Prova:** `/methodology` (pesos e cortes), `/sources` (de onde vem cada dado), `/status` (o
  serviço está no ar, medido na hora).
- **Objeção:** "por que pagar se o básico funciona?"
- **Resposta:** o básico funciona **porque** alguém paga a curadoria; o apoio é o que evita a
  alternativa, que é vender atenção dentro do catálogo.
- **CTA:** *Ver planos* (primário) · *Falar sobre apoio pontual* (secundário).

### Parceiro

- **Dor:** precisa de um recorte confiável para matéria, aula ou programação, com fonte citável
  e sem montar planilha própria.
- **Gancho:** "Use o MEDIA Score como fonte — com a metodologia junto."
- **Promessa:** recorte licenciado, metodologia citável, canal direto para corrigir dado errado.
- **Prova:** `/sources` mostra o lastro por tipo de mídia; `/methodology` mostra o cálculo.
- **Objeção:** "por que a nota de vocês e não a nossa?"
- **Resposta:** porque a nossa é auditável e a correção é pública — parceiro não compra o
  número, ganha o direito de contestá-lo com dado.
- **CTA:** *Propor uma parceria*.

### Patrocinador

- **Dor:** quer atingir quem decide o que consumir, num ambiente em que a marca não seja lida
  como ruído.
- **Gancho:** "Patrocine a decisão, não a nota."
- **Promessa:** presença rotulada em seção definida, com contexto de decisão real.
- **Prova:** a regra está publicada na própria página; o rótulo é parte do produto.
- **Objeção:** "como sei que vocês não vão maquiar a avaliação para me agradar?"
- **Resposta:** porque maquiar destrói o único motivo pelo qual alguém lê a nota — e o
  patrocínio vira o último a perceber.
- **CTA:** *Pedir o material*.

## 4. Arquitetura de mensagem (3 línguas)

| | Tagline (≤8 palavras) | One-liner | CTA |
|---|---|---|---|
| PT | A nota não está à venda. | Sustente um catálogo que diz o que vale o seu tempo. | Ver planos · Propor parceria · Pedir material |
| EN | The score is not for sale. | Fund a catalog that tells you what is worth your time. | See plans · Propose partnership · Request the deck |
| ES | La nota no está en venta. | Sostén un catálogo que dice qué vale tu tiempo. | Ver planes · Proponer alianza · Pedir el material |

Regra de copy (`.zcode/skills/ux-copywriting`): frase curta, verbo no imperativo, zero
superlativo, zero número. "Independência" é a palavra-âncora; "grátis" nunca aparece sozinha.

## 5. Funil e o papel de cada página

```
descoberta → convicção → conversa → acordo
/home, /catalog  /methodology, /sources, /status   /apoie        e-mail + 1:1
```

- `/apoie` **não converte**: ela qualifica. O objetivo é que a pessoa escolha **um** dos três
  caminhos e escreva com contexto.
- `/pricing` é a única conversão transacional (apoiador).
- `/methodology` e `/sources` são a prova que o patrocinador e o parceiro vão querer ler — por
  isso estão linkadas de dentro de `/apoie`, não escondidas no rodapé.
- `/status` é a prova de confiança operacional: prometer parceria e cair é pior que não prometer.

## 6. Plano de 90 dias

**Semanas 1–2 — base**
- Página no ar (feito), link no rodapé (feito), `support_cta_click` com `audience` (feito).
- Montar 3 listas nominais: 20 parceiros (instituições/veículos que já citam dados de mídia),
  15 patrocinadores (marcas com afinidade cultural, não concorrentes de streaming), e a base de
  usuários ativos para o pedido de apoio.
- Definir `utm_source` por canal (`email-1a1`, `linkedin`, `newsletter`, `imprensa`).
- **Como saber se funcionou:** os três links de `/apoie` recebem clique com `audience` distinto.

**Semanas 3–4 — primeira abordagem**
- 20 e-mails 1:1 de parceria e 15 de patrocínio (modelos na seção 7), um por vez, com um recorte
  concreto do catálogo no corpo — nunca "somos uma plataforma".
- 1 post público explicando a regra da nota (a prova que interessa ao patrocinador).
- **Como saber:** taxa de resposta por público registrada manualmente; sem resposta em 5 dias
  úteis, segundo toque com um dado novo (um recorte, uma correção feita).

**Semanas 5–8 — prova pública**
- Publicar o primeiro recorte aberto (ex.: "como o score de uma franquia evolui") — serve de
  material para parceiro e de isca para imprensa.
- Abrir canal de correção de dados e registrar as correções aceitas (isso é o que o parceiro
  compra).
- **Como saber:** pedidos de recorte/licença vindos de fora do círculo que já conhecia o produto.

**Semanas 9–12 — fechamento e retrospectiva**
- Fechar o primeiro acordo (parceria de licença ou patrocínio de seção), com rótulo publicado.
- Página de reconhecimento **só** com quem autorizou por escrito.
- **Como saber:** existe ou não um acordo com contrapartida; se não existir, o programa continua
  com abordagem 1:1 — não se muda o produto para "ficar mais vendável".

> Metas aqui são **metas**, não fatos: contagens absolutas pequenas e explícitas, para não
> repetir o erro de número de marketing digitado (D-583.4). Nenhuma taxa de conversão é
> prometida neste documento porque não há baseline medido.

## 7. Modelos de abordagem 1:1

### Roteamento de contato (um alias por público)

| Público | Endereço | Por quê |
|---|---|---|
| Apoiador | `endart.studios+contato@gmail.com` | alias geral, o mesmo do rodapé e do `/feedback`; apoio pontual não tem fila própria |
| Parceiro | `endart.studios+parcerias@gmail.com` | proposta de licença/recorte e correção de dados |
| Patrocinador | `endart.studios+patrocinio@gmail.com` | material, números do mês e contrato |

O endereço por público é o que permite contar proposta por programa sem CRM e sem etiqueta
manual. Um alias trocado manda patrocínio para a fila de parceria e some — por isso o par
público → endereço é cobrado por teste (`apps/web/test/apoie.spec.ts`), não só por este
documento.

**Parceria (instituição/veículo) — assunto: "recorte de catálogo com metodologia para [veículo]"**

> [Nome], vi que [publicação/aula/programação] usa [dado/lista de X]. O MEDIA Rate mantém um
> catálogo com nota consolidada por obra e a metodologia aberta (`/methodology`) e o lastro por
> fonte (`/sources`). Posso enviar um recorte específico de [tema] com a metodologia e a data de
> coleta, para você usar como fonte citável. Se houver erro de dado, o canal de correção é
> direto comigo. Vale 30 minutos?

**Patrocínio — assunto: "patrocínio de seção — material com números do mês"**

> [Nome], o MEDIA Rate responde "vale o meu tempo?" para [tipo de obra]. A regra editorial é
> pública: patrocínio compra visibilidade rotulada, nunca nota. O material que posso enviar traz
> os números do mês (audiência e intenção das seções patrocináveis), a regra por escrito e dois
> formatos de inserção. Se a nota estiver no escopo da conversa, a resposta é não — e prefiro
> dizer isso antes. Quer o material?

**Apoio pontual — assunto: "apoio ao MEDIA Rate"**

> Obrigado por usar. Se o produto te economizou tempo, o apoio pontual paga infraestrutura e
> curadoria. Não há contrapartida além de reconhecimento opcional: a nota não muda por apoio.
> Se preferir recorrente, os planos estão em `/pricing`.

## 8. Canais e o que não fazer

| Canal | Para quem | Por quê |
|---|---|---|
| E-mail 1:1 | parceiro, patrocinador | B2B pequeno; resposta vem de conversa, não de funil |
| LinkedIn (post + comentário) | parceiro, patrocinador | onde instituição cultural e marca procuram parceria |
| Newsletter do produto | apoiador | já existe relação; o pedido é legítimo ali |
| Imprensa | parceiro | só com pauta (correção de dado, metodologia), nunca "conheça nossa startup" |
| Comunidade/Telegram | apoiador | conversa, não broadcast de pedido de dinheiro |

**Não fazer:** compra de seguidores/engajamento, DM em massa, urgência fabricada ("últimas
vagas"), prova social inventada, e — o mais importante — **aceitar patrocínio que exige nota**.

## 9. Como medir (com o que existe hoje)

| Sinal | Onde | O que decide |
|---|---|---|
| `support_cta_click` com `audience` (apoiador/parceiro/patrocinador) | PostHog, implementado em `SupportCta` | qual dos três caminhos a página está ativando |
| `utm_source` por canal na URL `/apoie` | `$pageview` (já existe) | qual canal traz conversa, não só visita |
| Resposta por e-mail | planilha manual | continuar ou matar o canal |
| Acordos fechados e valor | planilha | se o programa paga o próprio custo |

**O que não temos e não vamos fingir que temos:** CRM, automação de e-mail, atribuição de
receita de patrocínio. Planilha é suficiente nas primeiras 12 semanas — instrumentar antes de
ter volume é o mesmo erro de digitar número.

## 10. Guardrails (recusar mesmo com dinheiro na mesa)

1. **Patrocínio condicionado a nota, ordem de ranking ou "ajuste" de avaliação** — recusar.
2. **Exclusividade de fonte** — fere `/sources`; recusar.
3. **Conteúdo patrocinado sem rótulo** — recusar; o rótulo é o produto.
4. **Dados de usuário como moeda** — nunca (LGPD); nem agregado sem base legal.
5. **Prazo prometido que não depende de nós** — não prometer (está escrito na página).
6. **Teto de concentração:** nenhum patrocinador deve passar de ~40% do financiamento total;
   acima disso, a independência vira ficção contábil.

### Registro público — implementado (`/apoie#registro`)

O guardrail nº 1 só é verificável com registro aberto, então ele deixou de ser intenção:
`apps/web/src/lib/sponsorships.ts` é a fonte única (`PATROCINIOS`, `TETO_CONCENTRACAO`) e a
página renderiza tabela quando há entradas ou o estado honesto quando não há.

Regras de entrada (cobradas por `test/patrocinios.spec.ts`, não só por este documento):
nome **autorizado por escrito** (nada de "cliente confidencial"), `secao` que a pessoa reconhece
na tela, `rotulo` descrevendo como o patrocínio aparece, e `desde` em ISO — data de início da
veiculação, não de assinatura. Uma entrada que exija mexer em nota, ranking ou linha editorial
não entra.

Estado atual: **lista vazia**, e a página diz exatamente isso — "nenhum patrocínio ativo" é fato,
não "em breve". O teto de 40% vive como constante e como texto publicado (único número que o
copy pode ter).


## 11. O que falta construir

- **Formulário** (hoje `mailto:`) — só quando o volume de e-mail justificar; `mailto:` tem a
  vantagem de não criar promessa de SLA.
- **Página de reconhecimento de apoiadores** (opt-in, com autorização por escrito) — depende do
  primeiro apoiador, não de código. Diferente do registro de patrocínio, que já está no ar.
- **Material de patrocínio** com números do mês — derivar de PostHog na hora de montar, nunca
  congelar número no texto.
- ~~Registro público de patrocínios~~ — **feito**: `/apoie#registro` + `src/lib/sponsorships.ts`,
  com invariantes cobertas por `test/patrocinios.spec.ts`.

## 12. Riscos

- **Leitura como "pay-to-play"**: mitigado por `/apoie#regra`, pelo rótulo e pelo registro público.
- **Concentração em um patrocinador**: mitigado pelo teto da seção 10.
- **Suporte consumir o time de produto**: cada acordo exige um recorte e um relatório; limitar a
  dois acordos ativos por trimestre enquanto a operação for pequena.
- **Parceiro citar o score sem a metodologia**: mitigado entregando a citação pronta com a nota
  (o material de parceria inclui o trecho de metodologia).

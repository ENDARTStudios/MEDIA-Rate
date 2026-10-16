# UI-UX — Planos (`/pricing`)

> Sessão **3 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-planos/{1440,375}.png`.

## 1. Identidade da sessão

- **Objetivo do usuário:** entender o que cada plano dá, quanto custa na **moeda dele** e assinar (ou
  confirmar que o gratuito basta).
- **Persona/estado de conta:** público (anônimo), logado free, logado pagante. O **rótulo do CTA muda
  com o estado** (`PricingCards.tsx:209`): `startFree` · `subscribe` · `upgrade`.
- **Rota:** `/pricing`. O **período** escolhido viaja no link de checkout
  (`/checkout/${plan.id}?billing=${safeBilling}`, `PricingCards.tsx:200`), então a escolha é preservada.
- **Entradas:** navbar "Planos", CTA de paywall (402) em outras telas, rodapé.
- **Saídas:** `/register` (plano gratuito), `/checkout/[plan]?billing=` (assinatura), FAQ de planos.
- **Fora de escopo:** checkout e recibo (sessão 8), FAQ institucional (sessão 19).

## 2. Arquitetura de informação

Página **server component** (`apps/web/src/app/[locale]/pricing/page.tsx`): resolve i18n, **moeda por
região** (`currencyForRegion`/`symbolForCurrency` a partir de `headers()`, L10) e a disponibilidade do
plano anual (`annualAvailable()`, L11) — nada disso depende de JS no cliente.

| # | Bloco | Componente |
|---|---|---|
| 1 | `h1` + subtítulo | `pricing/page.tsx` |
| 2 | Toggle de período (mês/ano) com `aria-pressed` | `PricingCards.tsx:45-56` |
| 3 | Cards de plano (4) + selo "mais popular" | `PricingCards.tsx:95-209` |
| 4 | Tabela comparativa (rolagem horizontal) | `PricingTable.tsx:20-43` |
| 5 | Grade "o que cada plano desbloqueia" | `pricing/MediaUnlockGrid.tsx:15-51` |
| 6 | FAQ de planos (acordeão) | `PricingFAQ.tsx` (namespace `pricingFaq`) |
| 7 | Rodapé | global |

## 3. Layout, grid e densidade

- Cards: grade responsiva; em 1440 ficam lado a lado com o Plus destacado (borda/realce + selo
  "Mais popular", L106).
- Tabela comparativa: `w-full text-sm` dentro de `div.mb-20.overflow-x-auto` (`PricingTable.tsx:33-34`) —
  no mobile **rola horizontalmente** em vez de quebrar (decisão correta para tabela densa).
- Grid de desbloqueio: `overflow-x-auto` (`MediaUnlockGrid.tsx:20`) — mesmo padrão.
- Altura medida da página em 1440: ≈ 780 px até a primeira dobra de cards (captura `1440.png` mostra os
  quatro cards completos na primeira tela).

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Fundo / card / elevado | `colors.bg` · `colors.cb` · `colors.ce` | seções e cards |
| Texto | `text.primary` `#F5F5F7` · `text.secondary` `#A0A0B8` | títulos e corpo |
| Acento (Plus) | `accent.indigo` `#818CF8` + tinta `#0F172A` (`:205`) | CTA do Plus |
| CTA secundário | `colors.ce` + `text.primary` (`:206`) | demais planos |
| Selo "popular" | token de acento | `:106` |
| Cor por tipo (grid) | `CATEGORY_TOKENS[...].color` (`MediaUnlockGrid.tsx:42`) | ícones da grade |

**Fora de token (P2):** CTAs e alguns rótulos usam hex literal (`#818CF8`, `#0F172A`, `#1B1B2C`,
`#F5F5F7`) em vez das classes semânticas (`bg-surface-elevated`, `text-fg-primary`); são valores
canônicos, portanto **não violam o censo**, mas mantêm o acoplamento ao literal.

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | **não se aplica** — a página é estática (sem fetch de dados) e chega no HTML | — | — |
| 2. Vazio/indisponível | **existe parcialmente** — o período anual pode estar indisponível e aparece como "Em breve" no toggle | `PricingCards.tsx:45-56` + `annualAvailable()` | garantir que **nenhum** botão de compra aponte para período indisponível |
| 3. Erro de rede | **não se aplica** na página; o erro real acontece no `/checkout` (sessão 8) | — | **P2**: mensagem de erro de checkout precisa voltar com contexto para cá |
| 4. Não encontrado | **não se aplica** | — | — |
| 5. Sem permissão | **não se aplica** (a página é a própria oferta) | — | — |
| 6. Dados parciais | **existe** — preço anual só é exibido quando `annualAvailable()` permite, e há desconto calculado (`:142`, `ANNUAL_DISCOUNT`) | `PricingCards.tsx:129-142` | deixar explícito o "por que não há anual" |
| 7. Offline | **AUSENTE** | — | **P2** |

## 6. Micro-interações e movimento

- Toggle de período: `aria-pressed` + troca de valores no lugar (`:56,129-142`) — sem animação de
  transição; **A CRIAR (P2)**: crossfade curto do preço com `motion.duration.fast`.
- CTA: `transition-[filter,background]` + `hover:brightness-110` (Plus) / `hover:bg-[#2A2A3D]` (`:203-206`).
- Cards: **sem** hover de elevação — o destaque do Plus é estático.
- Reduced motion: nada aqui decide markup por preferência (gate verde).

## 7. Acessibilidade AA

- **Hierarquia (medida):** `h1` (título da página) → **`h2` no nome de cada card**
  (`PricingCards.tsx:112-115`) — o comentário no código registra que era `<h3>` e **pulava nível**
  (T210); hoje está correto. **Este é o padrão de referência** para cards de plano e para as telas que
  repetem o padrão (Assinaturas, Admin).
- Toggle de período: `aria-label={t("billingPeriod")}` (`:45`) + **`aria-pressed`** por botão (`:56`) ✓.
- Lista de recursos: `<ul role="list">` + `<li>` (`:150-152`) ✓ (o `role="list"` é necessário porque o
  reset do Tailwind remove semântica de lista).
- **Destaque positivo:** a tabela comparativa usa `<th scope="col">` (`PricingTable.tsx:37,43`) — deve
  ser citada como padrão no **Admin**, onde as tabelas não têm `scope` (achado do `test:auth`, D-605).
- Grade de desbloqueio: ícones `aria-hidden` + rótulo no elemento (`MediaUnlockGrid.tsx:42,51`) ✓.
- Contraste: tokens verdes (221/221); o selo "popular" e o texto do CTA do Plus são os pares a vigiar.
- **A CRIAR (P1):** foco visível nos cards quando navegados por teclado (o card inteiro não é focável —
  só o CTA é, o que é aceitável) e ordem de tabulação documentada.

## 8. Copy e i18n

- Namespaces: **`pricing`** (títulos, períodos, `mostPopular`, `billingPeriod`, `startFree`, `subscribe`,
  `upgrade`, `month`, `year`, `annualDiscount`…) e **`pricingFaq`** (6 perguntas do acordeão).
- Preços **localizados por moeda e locale** via `formatPlanPrice(valor, locale, símbolo)`
  (`PricingCards.tsx:129-142`) ✓ — nunca string de preço hardcoded.
- Regra de veracidade (D-603/BETA-GAP-05): nada de "em breve" apresentado como disponível; o período
  anual indisponível aparece **rotulado**, não como botão de compra.
- Existe **duplicação parcial** entre `pricingFaq` (planos) e o FAQ institucional (sessão 19): são
  públicos diferentes (dúvida de compra × dúvida de produto) — a home já foi consolidada na fonte
  canônica (D-603); aqui a duplicação é **aceitável**, mas precisa de regra escrita para não divergir.
- **A CRIAR:** texto do estado offline.

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | cards empilham; tabela e grade **rolam na horizontal** (`overflow-x-auto`); selo "Mais popular" precisa continuar visível sem corte |
| 768 | cards em 2 colunas |
| 1024+ | 4 cards na linha; tabela completa visível |

## 10. Métricas de sucesso

- **Checkout iniciado / visitas a `/pricing`** (conversão da vitrine).
- **Distribuição por plano escolhido** e por período (mensal × anual).
- **Cliques no toggle de período** (indica se o anual está sendo percebido).
- **Abertura do FAQ de planos** por pergunta (revela objeção não respondida no corpo).
- **Taxa de retorno** à página após abandonar o checkout (sessão 8).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| P1 | Confirmar que **nenhum CTA de compra** aponta para período indisponível (anual "Em breve") | `PricingCards.tsx:45-56,198-209` + `annualAvailable()` | eu | BETA-GAP-05 / D-603 |
| P2 | Hex literal nos CTAs onde existem classes semânticas | `PricingCards.tsx:205-206` | eu | D-584 |
| P2 | Sem transição ao trocar período (preço troca seco) | `PricingCards.tsx:129-142` | eu | D-580 |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| P2 | Duplicação `pricingFaq` × FAQ institucional sem regra escrita | `PricingFAQ.tsx` vs. `institutional-content.ts` | eu | D-603 |
| — | **Positivo a preservar:** `aria-pressed` no toggle, `<ul role="list">` nos recursos, `<th scope="col">` na tabela, `h2` por card e preço por moeda/locale | `PricingCards.tsx:45,56,112-115,150`; `PricingTable.tsx:37,43` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- planos=/pricing
grep -n "aria-pressed\|scope=\"col\"\|role=\"list\"\|formatPlanPrice" apps/web/src/components/PricingCards.tsx apps/web/src/components/PricingTable.tsx
npm run design:contrast; npm run design:hex
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-planos/1440.png` · `375.png`.

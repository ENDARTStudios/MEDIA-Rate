# UI-UX — Legal: Planos (aspectos legais da oferta) (`/pricing`)

> Sessão **18 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-legal-planos/{1440,375}.png`
> (mesma rota da sessão 3 — esta spec olha a **oferta como contrato**, não a vitrine como UI).

## 1. Identidade da sessão

- **Objetivo do usuário:** saber **exatamente** o que está comprando: preço, periodicidade, renovação,
  cancelamento, reajuste, reembolso e o que acontece se ele mudar de plano.
- **Persona:** público prestes a assinar (e o assinante que quer conferir uma cobrança).
- **Rota:** `/pricing` (a mesma da vitrine) — os aspectos legais moram no **FAQ de planos**
  (`PricingFAQ.tsx`, namespace `pricingFaq`) e no texto de renovação (`pricing.renewInfo`).
- **Entradas:** cards de plano, FAQ, e-mail de cobrança.
- **Saídas:** `/checkout/[plan]` (sessão 8), `/settings` (cancelar), `/terms`.
- **Fora de escopo:** a UI da vitrine (sessão 3), o fluxo de pagamento (sessão 8), Termos (21).

## 2. Arquitetura de informação (o que a oferta declara hoje)

| # | Declaração | Onde | Situação |
|---|---|---|---|
| 1 | Preço por período e **por moeda/região** | `PricingCards.tsx:129-142` (`formatPlanPrice`) | existe ✓ |
| 2 | **Renovação automática** e "cancele a qualquer momento" | `pricing.renewInfo`, `pricing.cancelAnyTime` | existe ✓ |
| 3 | **Cancelamento** e o que ele encerra | `pricingFaq.faq5A` + `settings.cancelHint` | existe ✓ |
| 4 | **Upgrade/downgrade** | `pricingFaq.faq6A` | existe parcialmente (downgrade "é feito ao cancelar") |
| 5 | Trial de 7 dias e a confirmação ao final | texto do card Plus ("7 dias grátis; ao final, você confirma se quer assinar") | existe ✓ |
| 6 | **Reembolso / direito de arrependimento** | **`pricingFaq.faq7`** (publicado na oferta, D-624) + `homeContent.plansCancelBody` | **existe na oferta** ✓ — canal `+reembolso` e o prazo legal de 7 dias declarados |
| 7 | **Reajuste de preço** e aviso prévio | — | **AUSENTE** ✗ |
| 8 | Impostos/taxas e nota fiscal | — | **AUSENTE** ✗ |

## 3. Layout, grid e densidade

A oferta é lida em três lugares: o **card** (preço), o **toggle** (período) e o **FAQ** (condições). A
recomendação desta spec não é redesenhar: é **garantir que as declarações obrigatórias estejam no card ou
imediatamente abaixo dele**, não escondidas em pergunta frequente (o FAQ só é lido por quem já desconfia).

## 4. Tokens em uso

Herda integralmente a sessão 3. Nada novo a declarar aqui — e nenhuma cor deve ser usada para "destacar"
condição legal de forma que pareça promocional (a condição legal usa texto, não cor de acento).

## 5. Estados obrigatórios

| Estado | Situação |
|---|---|
| 1–4. Carregando / vazio / erro / 404 | **não se aplicam** (página estática — ver `12-planos.md`) |
| 5. Sem permissão | **não se aplica** |
| 6. **Dados parciais** | **existe e importa** — a oferta muda por **moeda/região** e por **disponibilidade do anual** ("Em breve"); se um preço não existir para a região, a página precisa **dizer** isso em vez de omitir o plano |
| 7. Offline | benefício do estático |

## 6. Micro-interações e movimento

Nenhuma exigência legal depende de animação. A única regra: **não** animar/realçar condição contratual de
forma que ela pareça oferta (nada de piscar preço, contagem regressiva artificial ou "últimas vagas").

## 7. Acessibilidade AA

- O preço é o dado mais importante da página: precisa de **contraste de texto** (4,5:1) e de estar em texto
  real (não imagem) — hoje é texto ✓.
- O **toggle de período** já é acessível (`aria-pressed`, sessão 3) ✓ — é ele que muda o preço exibido, então
  a mudança precisa ser **anunciada** (`aria-live`) para quem não vê: **P2**.
- O selo "Mais popular" não pode ser o único sinal de diferenciação do plano (hoje há borda/realce ✓).

## 8. Copy e i18n

- Namespaces: `pricing` (`cancelAnyTime`, `renewInfo`, `mostPopular`, …) e `pricingFaq` (6 perguntas).
- Preços **localizados por moeda e locale** ✓ (`formatPlanPrice`) — nunca string de preço hardcoded.
- Regra de veracidade (BETA-GAP-05): nada de "em breve" apresentado como disponível ✓ (já respeitado).
- **A CRIAR:** textos de **reembolso/arrependimento**, **reajuste** e **impostos/nota fiscal** nos 3 locales
  — a base legal é decisão do Operador (ver §11).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | condição legal precisa aparecer **no fluxo** (não em tooltip/hover, que não existe no toque) |
| 768+ | condição pode ficar abaixo do card com o mesmo destaque textual |

## 10. Métricas de sucesso

- **Assinaturas iniciadas × cancelamentos** e **motivo** (não instrumentado hoje).
- **Cobranças contestadas/estornadas** (mede se a oferta foi clara).
- **Chamados de suporte sobre cobrança** (deflexão via oferta clara).
- **Leitura do FAQ de planos** antes do checkout (indicador de dúvida comercial).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | **Sem declaração de reembolso/arrependimento.** Produto vendido online no Brasil: o direito de arrependimento (CDC art. 49) e a política de reembolso precisam estar **declarados e acessíveis** antes da compra — hoje não há nada sobre isso na vitrine nem no FAQ. **Não é assessoria jurídica**: é uma lacuna de informação na UI, registrada para o Operador decidir com quem cuida do jurídico | ausência em `PricingCards.tsx`/`PricingFAQ.tsx`; `pricingFaq.faq5A` cobre só cancelamento | **Operador** (decisão jurídica) + eu (UI) | — |
| P1 | **Sem política de reajuste** (quando e como o preço pode mudar) | ausência | Operador | — |
| P2 | **Impostos/nota fiscal** não mencionados na oferta | ausência | Operador | — |
| P2 | Mudança de preço ao trocar período pode não ser anunciada a leitor de tela | `PricingCards.tsx:56,129-142` | eu | AA |
| P2 | Downgrade só descrito como "feito ao cancelar" (`pricingFaq.faq6A`) — merece frase própria sobre o que acontece com o valor já pago | `17-assinaturas.md` §8 | eu | — |
| — | **Positivo a preservar:** preço localizado por moeda/região, renovação automática declarada, cancelamento com caminho real (`/settings`), trial de 7 dias explicado e nenhuma promessa de disponibilidade falsa | `PricingCards.tsx:129-142`; `pricing.renewInfo`; `settings/page.tsx:95-113` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- legal-planos=/pricing
grep -n "renewInfo\|cancelAnyTime\|mostPopular\|formatPlanPrice" apps/web/src/components/PricingCards.tsx
grep -n "faq5\|faq6" apps/web/src/messages/pt-BR.json
# lacunas: nenhuma chave de reembolso/arrependimento/reajuste/impostos
Select-String -Path apps/web/src/messages/pt-BR.json -Pattern 'reembolso|arrependimento|reajuste|imposto'
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-legal-planos/{1440,375}.png`.

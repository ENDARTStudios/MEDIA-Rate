# UI-UX — Planos e Assinaturas (`/checkout/[plan]` · `/billing/success` · `/settings`)

> Sessão **8 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-assinaturas/{1440,375}.png`
> (captura de `/checkout/plus` com sessão válida).

## 1. Identidade da sessão

- **Objetivo do usuário:** concluir a assinatura de um plano pago, confirmar que deu certo e **gerenciar**
  (ver o plano atual, cancelar a renovação).
- **Persona/estado de conta:** logado (free → plus/premium). Anônimo que chega no checkout é mandado para
  login.
- **Rotas reais (a sessão é espalhada em três):**
  - `/checkout/[plan]` — **client**, chama `POST /api/v1/checkout` (com CSRF, `getCsrfToken`) e redireciona
    para o Stripe (`checkout/[plan]/page.tsx:11-14`);
  - `/billing/success` — **server**, confirmação pós-pagamento com confete (`billing/success/page.tsx:49`);
  - `/settings` — bloco **"Plano"** com plano atual e cancelamento (`settings/page.tsx:95-113`).
- **Entradas:** CTA dos cards de `/pricing` (leva `?billing=`), FAQ de planos, upgrade a partir do aviso de
  limite (ex.: `/historico`).
- **Saídas:** Stripe (externo), depois `/billing/success` → `/dashboard`; e `/pricing` para trocar de plano.
- **Fora de escopo:** vitrine de preços (sessão 3), planos legais (18).

## 2. Arquitetura de informação

| # | Bloco | Rota | Componente |
|---|---|---|---|
| 1 | Plano inválido (rota inexistente) | `/checkout/[plan]` | `page.tsx:85` |
| 2 | `h1` do checkout + vantagens do plano (`<ul role="list">`) | `/checkout/[plan]` | `page.tsx:96-105` |
| 3 | Botão de assinatura (com estado "Redirecionando para o Stripe…") | `/checkout/[plan]` | `page.tsx:159-162` |
| 4 | Erro de checkout | `/checkout/[plan]` | `page.tsx:27,70-78` |
| 5 | Confirmação + confete + ícone | `/billing/success` | `page.tsx:49-62` |
| 6 | CTA para o dashboard | `/billing/success` | `page.tsx:64-83` |
| 7 | Bloco "Plano": plano atual + cancelar renovação + próximo tier | `/settings` | `page.tsx:95-134` |

## 3. Layout, grid e densidade

- Checkout: coluna central estreita (uma decisão por tela ✓) com lista de vantagens e um único CTA.
- Sucesso: cartão central com ícone, título e um CTA; confete sobreposto (`ConfettiCelebration`) sem
  capturar clique.
- Settings: bloco de cartão entre as demais seções de configuração, com o `h2` "Plano".

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Superfície/borda | `bg-surface-card` / `border-surface-border` | cartões |
| Texto | `text-fg-*` / `text.primary` | títulos e rótulos |
| Acento | `accent.indigo` | CTA de assinatura |
| Confirmação | `score.high` (verde) | ícone de sucesso |
| Foco | `focus.ring` | botão e link |

**Fora de token (P2):** `text-[#F5F5F7]` literal no `h1` do checkout (`:96`) e no de sucesso
(`billing/success/page.tsx:62`); `#A0A0B8` literal nas listas (`:105`). São valores canônicos, mas
deveriam ser as classes semânticas (`text-fg-primary`/`text-fg-secondary`).

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | **existe** — botão desabilitado + "Redirecionando para o Stripe…" | `checkout/[plan]/page.tsx:159-162` | skeleton não se aplica (tela de decisão) ✓ |
| 2. Vazio | **não se aplica** | — | — |
| 3. Erro de rede / de checkout | **existe** — `error` exibido, mas **com texto em pt-BR hardcoded** (`"Falha no checkout"`, `"Erro desconhecido"`) | `page.tsx:70,77` | **P1**: localizar + botão de tentar de novo |
| 4. Não encontrado/plano inválido | **existe** — `checkout.invalidPlan` com `h1` próprio | `page.tsx:85` | CTA de volta para `/pricing` |
| 5. Sem permissão | **existe** — sem sessão, redireciona para login | `page.tsx:30-35` | ver P1: o redirect acontece até com sessão válida (store não hidrata) |
| 6. Dados parciais | **existe** — o plano anual pode estar indisponível ("Em breve" na vitrine) | `billing-config.ts` | impedir chegar ao checkout com período indisponível |
| 7. Offline | **AUSENTE** | — | P2 |

**Sucesso (`/billing/success`)**: estados de confirmação ✓; **a confirmar** se há verificação real do
pagamento (a página é estática — se alguém abrir a URL sem ter pago, ela confirma mesmo assim ✗). É P1 se
confirmado: confirmação sem checagem destrói a confiança no fluxo.

## 6. Micro-interações e movimento

- Checkout: `disabled` + rótulo de progresso (sem spinner ✗ **P2**: acrescentar indicador visual).
- Sucesso: `ConfettiCelebration` — **gate no `useEffect`**, nunca `return null` no render (defeito do
  D-587, hoje com teste de regressão em `test/reduced-motion.spec.tsx` ✓).
- Cancelamento: **a confirmar** se há diálogo (a chave `settings.cancelConfirm` sugere `confirm()` nativo
  ✗ — **P1**: usar `confirm-dialog.tsx`, que já existe no repo, em vez de `window.confirm`).

## 7. Acessibilidade AA

- Checkout: **um** `h1` por estado renderizado ✓ (branches exclusivos); lista de vantagens com
  `<ul role="list">` ✓ (o reset do Tailwind remove semântica sem o `role`).
- Erro precisa de `role="alert"`/`aria-live` — **a confirmar**; hoje é texto comum.
- Settings: o bloco de próximo plano usa `role="img"` + `aria-label={ts("lockedFeatures")}` (`:123-124`) ✓
  e ícone `aria-hidden` ✓ — bom padrão para "recurso bloqueado".
- Cancelar é ação destrutiva: precisa de confirmação acessível (foco preso no diálogo) e não só de um
  `window.confirm`.
- `billing/success`: ícones decorativos com `aria-hidden` ✓; `h1` presente ✓.

## 8. Copy e i18n

- Namespaces: **`checkout`** (`title`, `invalidPlan`, `subscribe`, `redirecting`, `success`, `canceled` +
  vantagens `plusB1…`), **`settings`** (`cancelSubscription`, `cancelConfirm`, `cancelDone`, `cancelError`,
  `cancelHint`, `lockedFeatures`) e **`pricing`** (`cancelAnyTime`, `renewInfo`).
- **P1 — vazamento de i18n no código:** `"Falha no checkout"` e `"Erro desconhecido"`
  (`checkout/[plan]/page.tsx:70,77`) estão em **português fixo** e apareceriam assim em EN/ES. O gate atual
  (`test/i18n-leak.spec.ts`) varre **só o catálogo de mensagens** — este caso passa por ele. Fica como
  pendência de gate (varrer literais visíveis em `src`), não só de texto.
- Regra de veracidade: `pricing.renewInfo` promete "cancele a qualquer momento" ✓ e existe caminho real de
  cancelamento em `/settings` ✓ — promessa e produto estão alinhados ✓ (diferente do que a §5.7 investiga).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | coluna única; CTA em largura total; confete cobre a tela sem bloquear |
| 768 | cartão centralizado com largura limitada |
| 1024+ | igual, com mais respiro |

## 10. Métricas de sucesso

- **Checkout iniciado → pago** (conversão) e **abandono no Stripe** (retorno com `checkout.canceled`).
- **Cancelamentos** em `/settings` e **motivo** (não instrumentado hoje).
- **Upgrades vindos de limites de plano** (ex.: `/historico`) — mede se o paywall é justo.
- **Falhas de checkout** por tipo (rede × cartão × validação) — hoje o erro é texto solto.

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | **Texto em pt-BR hardcoded** no erro do checkout | `checkout/[plan]/page.tsx:70,77` | eu | gate de i18n (D-604) |
| **P1** | `/checkout` lê o store direto e **redireciona para login** quando `!isAuthenticated` — com a sessão sem hidratar (P0 do D-610), **um usuário logado que dá F5 no checkout é mandado para o login** | `checkout/[plan]/page.tsx:25,30-35`; mapa do P0 em `14-dashboard.md` §11 | eu | D-610 |
| **P1 (confirmado)** | Cancelamento usa **`window.confirm`** (`settings/page.tsx:48`) e os retornos usam **`alert()`** (`:63,66,69`) — diálogos nativos, fora do tema e com suporte irregular em tecnologia assistiva. O repo já tem `ui/confirm-dialog.tsx` e `sonner` | `settings/page.tsx:48,63,66,69` (confirmado em `25-configuracoes.md` §11) | eu | — |
| P1 | `/billing/success` pode confirmar assinatura **sem verificar o pagamento** (página estática) | `billing/success/page.tsx:49-62` | eu | — |
| P1 | Erro de checkout sem `role="alert"`/`aria-live` confirmado | `checkout/[plan]/page.tsx:27` | eu | AA |
| P2 | Hex literal onde há token semântico | `checkout/[plan]/page.tsx:96,105`; `billing/success/page.tsx:62` | eu | D-584 |
| P2 | Sem indicador visual de progresso no botão (só texto + disabled) | `:159-162` | eu | — |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| P2 | Sem gestão de **faturas/forma de pagamento** (só cancelamento) — decisão de produto (portal do Stripe) | ausência de `billing_portal` | Operador | — |
| — | **Positivo a preservar:** CSRF no checkout (`getCsrfToken`), plano inválido com tela própria, `<ul role="list">` nas vantagens, cancelamento com confirm/sucesso/erro em i18n, `aria-label` no preview de recurso bloqueado, e o confete com gate em `useEffect` (D-587) | `checkout/[plan]/page.tsx:8,85,105`; `settings/page.tsx:109-124`; `ui/ConfettiCelebration.tsx` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:auth-env -- --start
$env:API_PROXY_TARGET="http://localhost:4000"; npm run dev --workspace apps/web
npm run uiux:evidence -- --state "$env:TEMP\mr-uiux-auth\state.json" assinaturas=/checkout/plus
npm run uiux:auth-env -- --stop --purge

grep -n "Falha no checkout\|Erro desconhecido\|isAuthenticated\|role=\"list\"" "apps/web/src/app/[locale]/checkout/[plan]/page.tsx"
grep -n "cancelSubscription\|cancelConfirm\|lockedFeatures" "apps/web/src/app/[locale]/settings/page.tsx"
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-assinaturas/1440.png` · `375.png`.

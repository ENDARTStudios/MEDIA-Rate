# UI-UX — Configurações (`/settings` · `/user/data`)

> Sessão **16 de 25** (última de produto). Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-configuracoes/{1440,375}.png`.

## 1. Identidade da sessão

- **Objetivo do usuário:** ajustar a conta — plano, idioma, consentimento, controles de LGPD e exclusão de
  dados — sem precisar falar com suporte.
- **Persona/estado de conta:** logado; parte das ações depende do plano (cancelar só existe para plano pago).
- **Rotas:** `/settings` (client + **`ProtectedPage`**, `settings/page.tsx:1,27` — hidrata a sessão ✓) e
  `/user/data` (server + `UserDataPage`, `user/data/page.tsx:3,18` — **sem `ProtectedPage`** ✗, ver §11).
- **Entradas:** chip de usuário no header, rodapé ("Seus dados"), avisos de limite de plano.
- **Saídas:** `/pricing` (mudar de plano), `/login` (após encerrar conta), cookies (gerenciar).
- **Fora de escopo:** assinatura como fluxo de compra (sessão 8), legal (17–25).

## 2. Arquitetura de informação

`/settings` é um client component de 240 linhas com seções; `/user/data` é a página de dados do titular.

| # | Bloco | Componente |
|---|---|---|
| 1 | `h1` "Configurações" | `settings/page.tsx:76` |
| 2 | Aviso de fim de trial + CTA | `:84-89` |
| 3 | **`h2` "Plano"** — plano atual, cancelar renovação, próximo tier | `:95-134` |
| 4 | Controles de **LGPD** (consentimento, exportação, exclusão) | `components/settings/LgpdControls.tsx` |
| 5 | Consentimento de cookies/analytics (store de consentimento) | `use-consent-store` (`:import`) |
| 6 | Idioma/região | `useTranslations("nav")` (a confirmar o seletor aqui ou só no header) |
| 7 | Página de dados do titular | `UserDataPage.tsx` em `/user/data` |

## 3. Layout, grid e densidade

- Coluna central com seções e `h2` por bloco; ações destrutivas agrupadas e visualmente separadas.
- Densidade baixa (é tela de decisão, não de listagem); uma ação por linha com explicação abaixo.

## 4. Tokens em uso

Todos de [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). **Fora de token (P2):** `text-[#F5F5F7]`
(`:76,84,95,129`), `text-[#A0A0B8]` (`:97,113`) e `text-[#85859F]` no lugar de `text-fg-*`.

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | a confirmar (a página é client e depende do store de sessão) | `settings/page.tsx` | **P1**: esqueleto/permissão enquanto a sessão hidrata (evita piscar "deslogado") |
| 2. Vazio | **não se aplica** | — | — |
| 3. Erro de rede | **existe parcialmente** — o cancelamento trata erro, mas com `alert()` | `:63-69` | **P1**: erro inline/toast com retry |
| 4. Não encontrado | n/a | — | — |
| 5. Sem permissão | **existe** no `/settings` (ProtectedPage) ✗ **ausente em `/user/data`** | `user/data/page.tsx:18` | **P1**: proteger também a página de dados (é a mais sensível do produto) |
| 6. Dados parciais | **existe** — plano atual, trial e próximo tier | `:84-134` | — |
| 7. Offline | **AUSENTE** | — | P2 |

## 6. Micro-interações e movimento

- Cancelamento é **destrutivo**: precisa de diálogo com confirmação explícita, consequência escrita e foco
  preso — hoje usa `window.confirm` (§7, P1).
- Ações de LGPD (exportar/excluir) devem ter progresso visível (são operações longas).
- Sem animação decorativa aqui: a tela é utilitária.

## 7. Acessibilidade AA

- **P1 — diálogos nativos do navegador:** `window.confirm` no cancelamento (`:48`) e **`alert()`** em três
  pontos de retorno (`:63,66,69`). Além de feios, `alert`/`confirm` **não são estilizáveis, não seguem o
  tema e têm suporte irregular** em tecnologias assistivas. O repo já tem `ui/confirm-dialog.tsx` e
  `sonner` para toast — é **reuso**, não invenção. Este achado estava como "a confirmar" na spec de
  Assinaturas (`17-assinaturas.md` §11) e agora está **confirmado**.
- Hierarquia: `h1` → `h2` por seção ✓ (sem pular nível).
- Botões de ação destrutiva com rótulo textual (nunca só ícone) e estado desabilitado durante a chamada.
- Contraste: os literais da §4 são os pontos a corrigir (valores canônicos ⇒ AA preservado).

## 8. Copy e i18n

- Namespaces: **`settings`** (`title`, `cancelSubscription`, `cancelConfirm`, `cancelDone`, `cancelError`,
  `cancelHint`, `trialEnded`, `trialEndedCta`, `lockedFeatures`), `pricing`, `nav`, `consent`.
- Sem texto hardcoded identificado nesta sessão ✓ (as strings passam por `useTranslations` ✓).
- **A CRIAR:** texto de progresso para exportação/exclusão de dados e a explicação do que a exclusão apaga.

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | seções empilham; ações destrutivas em largura total (alvo ≥ 44 px) |
| 768 | uma coluna com respiro |
| 1024+ | coluna central com seções agrupadas |

## 10. Métricas de sucesso

- **Cancelamentos concluídos × iniciados** (mede atrito do fluxo — ou a ausência de retenção).
- **Exportações de dados** e **exclusões de conta** (volume e tempo de conclusão).
- **Alterações de consentimento** (quantos recusam analytics — insumo de privacidade).
- **Chamadas de suporte** relacionadas a plano/privacidade (métrica de deflexão).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1 — CORRIGIDO (D-619)** | Cancelamento e retornos usavam **`window.confirm`** + **`alert()`** (3). Trocados por **`ConfirmDialog`** (Radix, foco preso) e **`toast`** do `sonner`, com botão desabilitado durante a chamada | `settings/page.tsx:47-95,120-137` | eu | feito |
| **P1** | `/user/data` **sem `ProtectedPage`** — página com dados pessoais sem guard, entra no grupo de "leem o store sem guard" (D-610) | `user/data/page.tsx:18`; `UserDataPage.tsx:39` | eu | D-610 |
| **P1** | Erro do cancelamento em `alert()` — sem erro inline, sem retry, sem registro visual | `:63-69` | eu | D-603 |
| P1 | Estado de carregando/permissão não confirmado (risco de piscar "deslogado" enquanto a sessão hidrata) | `settings/page.tsx` (client) | eu | D-610 |
| P2 | Literais `#F5F5F7`/`#A0A0B8`/`#85859F` onde há `text-fg-*` | `:76,84,95,97,113,129` | eu | D-584 |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| — | **Positivo a preservar:** `ProtectedPage` no `/settings`, seções com `h2` claro, `data-testid` no cancelamento (bom para teste), controles de LGPD em componente próprio (`settings/LgpdControls.tsx`), CSRF na ação (`getCsrfToken`) e o bloco de plano reaproveitando o padrão da sessão 8 | `settings/page.tsx:1,27,95-134`; `user/data/page.tsx` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:auth-env -- --start
$env:API_PROXY_TARGET="http://localhost:4000"; npm run dev --workspace apps/web
npm run uiux:evidence -- --state "$env:TEMP\mr-uiux-auth\state.json" configuracoes=/settings
npm run uiux:auth-env -- --stop --purge

grep -n "window.confirm\|alert(\|ProtectedPage\|data-testid" "apps/web/src/app/[locale]/settings/page.tsx"
grep -n "ProtectedPage\|useAuthStore" "apps/web/src/app/[locale]/user/data/page.tsx" apps/web/src/components/UserDataPage.tsx
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-configuracoes/{1440,375}.png`.

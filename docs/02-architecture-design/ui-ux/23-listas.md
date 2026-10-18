# UI-UX — Listas (`/listas` · `/listas/[slug]`)

> Sessão **14 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-listas/{1440,375}.png`.

## 1. Identidade da sessão

- **Objetivo do usuário:** criar listas temáticas ("Top 10 terror dos anos 90"), adicionar/remover títulos,
  ordenar e compartilhar.
- **Persona/estado de conta:** logado; **listas colaborativas são Premium** (`listas.premiumOnly`) e o
  limite/402 é tratado na criação.
- **Rotas:** `/listas` (índice + criação) e `/listas/[slug]` (detalhe, com slug compartilhável).
- **Entradas:** sidebar do dashboard ("Favoritos" aponta para `/listas` — ver §11), watchlist, ficha.
- **Saídas:** ficha da obra; perfil público (`/user/[id]` mostra listas?), compartilhamento por link.
- **Fora de escopo:** watchlist (12), biblioteca (6), perfil (15).

## 2. Arquitetura de informação

`ListasPage.tsx:26` (índice) e `ListaViewPage.tsx` (detalhe).

| # | Bloco | Componente |
|---|---|---|
| 1 | Cabeçalho "Listas" (namespace `listas.title`) | `ListasPage.tsx` |
| 2 | Botão/ação **"Nova lista"** e formulário inline | `ListasPage.tsx:33` (`showCreate`) |
| 3 | Lista de listas (título, descrição, contagem) | `ListasPage.tsx` |
| 4 | **Estado honesto de 404** ("Lista não encontrada" + link para as listas) | `ListasPage.tsx:32,50-52` (D-603) |
| 5 | Detalhe: busca de mídia para adicionar, edição de título/descrição, remover item, excluir lista | `ListaViewPage.tsx` (D-603) |
| 6 | Erro com **retry** (`ErrorState`) | `ListasPage.tsx:12,54` |
| 7 | Rodapé | global |

## 3. Layout, grid e densidade

- Índice: lista vertical de cartões de lista (título + descrição + contagem), com o formulário de criação
  **inline** (não em outra rota) ✓.
- Detalhe: cabeçalho editável + grade de itens (mesma família visual do catálogo).
- **A confirmar:** paginação/limite no detalhe de listas grandes (as listas podem crescer muito).

## 4. Tokens em uso

Todos de [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md) — `bg-surface-card`, `border-surface-border`,
`text-fg-*`, `accent.indigo` na ação primária, `focus.ring` nos controles de edição.
Nenhum hex novo identificado após a migração D-604 (esta sessão foi tocada no D-603 sem introduzir literal).

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | **existe** — `loading` com texto/`Skeleton` | `ListasPage.tsx:30`; `ListaViewPage.tsx:169` | **P2**: padronizar como skeleton de cartões |
| 2. Vazio | **existe** — `listas.empty` ("Você ainda não criou listas") com a ação de criar ao lado | `ListasPage.tsx` | — |
| 3. Erro de rede | **existe com retry** — `ErrorState` com `onRetry` (D-603) | `ListasPage.tsx:12,54`; `ListaViewPage.tsx` | — |
| 4. **Não encontrado** | **existe e é exemplar** — `naoEncontrada` separa 404 de falha de rede (`ApiError.status === 404`) | `ListasPage.tsx:50-52`; `ListaViewPage.tsx` (D-603) | — |
| 5. Sem permissão/plano | **existe** — `listas.premiumOnly` e tratamento de 402 na criação | `ListasPage.tsx:70` (402) | CTA de upgrade no ponto do erro |
| 6. Dados parciais | **existe parcialmente** — lista vazia tem mensagem própria (`listas.emptyItems`) | `listas.emptyItems` | — |
| 7. Offline | **AUSENTE** | — | P2 |

**Destaque:** o par **404 honesto × erro com retry** foi implementado aqui no D-603 e é o **padrão de
referência** do produto para esta distinção (a spec do Catálogo e a de Listas devem ser lidas juntas).

## 6. Micro-interações e movimento

- Criação inline: o formulário aparece no lugar (sem modal) — movimento curto de altura/opacidade; em
  reduced motion, aparece direto.
- Adicionar item: feedback imediato + persistência (a confirmar se é otimista como na watchlist ✓).
- Excluir lista: **ação destrutiva** — deve usar `ui/confirm-dialog.tsx` (o repo já tem) em vez de
  `window.confirm` (a confirmar).

## 7. Acessibilidade AA

- **P1:** `/listas` e `/listas/[slug]` leem o store de auth (`ListasPage.tsx:28`, `ListaViewPage.tsx:68`)
  **sem `ProtectedPage`** → com F5 (store não hidratado) a tela mostra o estado de **deslogado** para quem
  está logado. É o mesmo defeito do dashboard (D-610) e aqui é pior: a pessoa vê "você ainda não criou
  listas" ✗, o que **afirma algo falso** sobre os dados dela.
- Formulário de criação: campos com `label` associado e erro por campo (a confirmar); botão de submit com
  estado de carregando.
- Ação destrutiva por teclado (excluir/remover) precisa de confirmação acessível com foco preso.
- Hierarquia: `h1` "Listas" no índice; no detalhe, o título da lista deve ser `h1` (a confirmar se não é
  `h2` sob um `h1` genérico).

## 8. Copy e i18n

- Namespace **`listas`**: `title`, `create`, `titleLabel`, `titlePlaceholder`, `descriptionLabel`,
  `createSubmit`, `cancel`, `empty`, `emptyItems`, `error`, `notFound`, `backToListas` (criada no D-603),
  `itemAdded`, `itemRemoved`, `saved`, `created`, `premiumOnly`.
- Sem texto hardcoded identificado nesta sessão ✓ (ao contrário do checkout/admin/watchlist).
- **A CRIAR:** texto do CTA de upgrade no 402 e rótulo de acessibilidade para o formulário inline.

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | índice em 1 coluna; formulário inline ocupa a largura; detalhe com grade 2 colunas |
| 768 | 2–3 colunas |
| 1024+ | índice + detalhe com respiro confortável |

## 10. Métricas de sucesso

- **Listas por usuário** e **itens por lista** (lista com 1 item indica intenção frustrada).
- **Listas compartilhadas/visitadas por outro usuário** (o slug é o vetor social — medir).
- **Conversão do `premiumOnly`** (402 na criação colaborativa).
- **Exclusões** de lista (arrependimento) e **edições de título** (indica criação apressada).

## 10.1 Compartilhar e PDF (implementado)

A lista nasceu para **indicar**; faltavam o gesto de mandar para alguém e o de arquivar.

| Peça | Onde | Decisão |
|---|---|---|
| Compartilhar | `components/listas/ShareLista.tsx` (na `/listas/[slug]`) | a lista já é pública pelo slug (`GET /listas/:slug`), então compartilhar é dar o link — sem conceito novo de "acesso" |
| Convite | `lib/list-share.ts` → `montarConvite` | título + **recado** + contagem + link, pronto para WhatsApp/e-mail. O recado é a `descricao` da lista (é ali que o dono escreve para quem fez) |
| Web Share | `navigator.share` quando existe | cancelar o share sheet não é erro |
| Cópia | Clipboard API, com fallback honesto | sem API, a mensagem diz "selecione e copie à mão" — nunca um falso "copiado" |
| PDF | `lib/list-pdf.ts` + jsPDF em **import dinâmico** | título, recado, dono, contagem, itens numerados (tipo · ano · nota) e rodapé com marca/data; zero byte no bundle inicial |

Item sem nota ou sem ano aparece **sem o campo** no PDF (nunca "null"); nome do arquivo sai do
slug, sem acento (`lista-para-o-joao.pdf`). Cobertura: `test/listas-compartilhar-pdf.spec.ts`
— convite, linhas, nome de arquivo, layout com dublê **e** geração real de jsPDF (header `%PDF-`
e arquivo maior quando há mais itens).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1 (risco, não reproduzido)** | `/listas` e `/listas/[slug]` leem o store de auth **sem `ProtectedPage`** (`ListasPage.tsx:28`; `ListaViewPage.tsx:68`). **Se** o store não hidratar — como aconteceu de fato em `/dashboard` (D-610) — a tela mostraria "Você ainda não criou listas" para quem tem listas, ou seja, **afirmação falsa sobre dados do usuário**. **Não reproduzi aqui:** na captura de 2026-10-15 o header aparece autenticado (chip "Teste · Free") e o vazio exibido era **verdadeiro** (o usuário do banco de teste realmente não tem listas). Fica como risco de mesma família do P0, com a reprodução confirmada na outra rota | `ListasPage.tsx:28`; `ListaViewPage.tsx:68`; mapa em `14-dashboard.md` §11 | eu | D-610 |
| P1 | Limite/`premiumOnly` (402) sem CTA de upgrade no ponto do erro | `ListasPage.tsx:70` | eu | padrão de `/historico` |
| **P1 — CORRIGIDO (D-619)** | Exclusão de lista usava **`window.confirm`**; agora usa `ConfirmDialog` com variante destrutiva | `ListaViewPage.tsx:168-176,247-260` | eu | feito |
| P2 | Carregamento como texto em vez de skeleton | `ListaViewPage.tsx:169` | eu | — |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| P2 | "Favoritos" no dashboard aponta para `/listas` (favorece confusão com watchlist) | `DashboardSidebar.tsx:37` | eu | sessão 5/12 |
| — | **Positivo a preservar:** **404 honesto separado de falha de rede** com `ErrorState` + retry (D-603), criação **inline** (sem modal), vazio com ação ao lado, e chaves de feedback de ação (`itemAdded`, `saved`, `created`) | `ListasPage.tsx:26-70`; `ListaViewPage.tsx` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:auth-env -- --start
$env:API_PROXY_TARGET="http://localhost:4000"; npm run dev --workspace apps/web
npm run uiux:evidence -- --state "$env:TEMP\mr-uiux-auth\state.json" listas=/listas
npm run uiux:auth-env -- --stop --purge

grep -n "naoEncontrada\|ErrorState\|430\|404\|premiumOnly\|showCreate" apps/web/src/components/ListasPage.tsx
grep -n "isAuthenticated\|useAuthStore" apps/web/src/components/ListasPage.tsx apps/web/src/components/ListaViewPage.tsx
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-listas/{1440,375}.png`.
**Atenção:** se a captura sair no estado de deslogado, é exatamente o P1 desta sessão (o guard ausente) —
registrar a imagem como evidência do defeito, não da tela.

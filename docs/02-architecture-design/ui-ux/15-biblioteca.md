# UI-UX — Minha Biblioteca (`/biblioteca`)

> Sessão **6 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-biblioteca/{1440,375}.png`.

## 1. Identidade da sessão

- **Objetivo do usuário:** ver tudo o que marcou, **organizado por status de consumo** (quero ver /
  consumindo / concluído / abandonado) e por tipo de mídia, e agir (mudar status, remover).
- **Persona/estado de conta:** logado (qualquer plano). A rota é protegida por `ProtectedPage`
  (`biblioteca/page.tsx:3`) ✓ — **é uma das 5 rotas que hidratam a sessão corretamente** (D-610).
- **Rota:** `/biblioteca`, com deep link de status (`/biblioteca?status=QUERO_CONSUMIR` — usado pela
  sidebar do dashboard, `DashboardSidebar.tsx:33`).
- **Entradas:** sidebar do dashboard ("Minha biblioteca" e "Quero ver"), header, pós-ação de status.
- **Saídas:** ficha da obra, listas, watchlist.
- **Fora de escopo:** watchlist (sessão 12), listas (14), dashboard (5).

## 2. Arquitetura de informação

Página server **dinâmica por decisão** (`export const dynamic = "force-dynamic"`, `revalidate = 0` —
`biblioteca/page.tsx:8-9`): é dado por usuário, não pode ser cacheado ✓. O conteúdo é
`biblioteca/BibliotecaClient.tsx:58`.

| # | Bloco | Componente |
|---|---|---|
| 1 | `h1` "Minha biblioteca" + subtítulo | `biblioteca.title` / `biblioteca.subtitle` |
| 2 | Abas de **status** (4) com contagem global | `STATUS_TABS` (`BibliotecaClient.tsx:19`) + `tabsAria` |
| 3 | Filtro por **tipo de mídia** | `tiposAria` |
| 4 | Grade de itens (cursor) | `GET /api/v1/interacoes` → `{items,total,porStatus,nextCursor}` (`:54`) |
| 5 | Ação por item: status (glifo) e remover | `interaction/StatusIcons.tsx` (`StatusGlyph`), `biblioteca.removerAria` |
| 6 | Rodapé | global |

**Destaque de produto:** os rótulos de status são **conjugados por tipo** ("quero jogar", "lendo",
"vi" — `:52-53`), e as contagens das abas vêm do **servidor** (globais, não do recorte local — `:55`).

## 3. Layout, grid e densidade

- Container de página com padding padrão; grade de cards responsiva (mesma família visual do catálogo).
- Abas em linha com contagem por status; filtro de tipo como grupo de chips.
- Densidade: com muitos itens, a lista cresce por cursor ("carregar mais"), sem paginação numerada.

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Superfície/borda | `bg-surface-card` / `border-surface-border` | cards de item |
| Texto | `text-fg-primary` / `text-fg-secondary` | título, metadados |
| Acento | `accent.indigo` | aba/filtro ativo |
| Status | ícones de `StatusIcons` (cor por status) | glifo do item |
| Foco | `focus.ring` | abas, chips, botões de ação |

**Fora de token:** nenhum hex novo identificado nesta sessão (os rótulos usam `text-fg-*`); conferir se
os glifos de status usam `scoreColor`/tokens em vez de literais (P2 se não).

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | **existe** — `biblioteca.loading` ("Carregando sua biblioteca…") com `loading` de estado | `BibliotecaClient.tsx:81` | **P2**: usar skeleton de cards (hoje é texto) |
| 2. Vazio | **existe e é específico** — `emptyHint` (biblioteca vazia) × `filterEmptyHint` (recorte sem resultado) | chaves `biblioteca.*` | CTA no vazio global ("explorar catálogo") |
| 3. Erro de rede | **existe com retry** — `biblioteca.error` ("…Tente novamente") e `setError` no catch (`:98`) | `BibliotecaClient.tsx:83,98` | — |
| 4. Não encontrado | **não se aplica** | — | — |
| 5. Sem permissão | **existe** — `ProtectedPage` decide (sessão ausente → /login) | `ProtectedPage.tsx` | — |
| 6. Dados parciais | **existe** — cursor (`nextCursor`) carrega o resto; contagens globais independentes do recorte | `:54-55` | rótulo de "carregando mais" com `aria-live` |
| 7. Offline | **AUSENTE** | — | P2 |

## 6. Micro-interações e movimento

- Troca de aba/filtro: **refetch server-side** com `loading` do recorte (evita lista "piscando" errada).
- Ação de status: feedback imediato (otimista?) + persistência — **a confirmar** se há rollback em erro.
- Remover: `biblioteca.removerAria` no controle ✓; precisa de confirmação/undo (ver P2).
- Reduced motion coberto pelo provider; nada aqui decide markup por preferência.

## 7. Acessibilidade AA

- **Destaque:** os grupos de filtro têm rótulo acessível (`tabsAria` "Filtrar por status" e `tiposAria`
  "Filtrar por tipo de mídia") — **melhor que o Catálogo**, que ainda precisa disso (ver
  `10-catalogo.md` §7). Replicar o padrão nas demais sessões.
- Ações por item têm `aria-label` (`removerAria` = "Remover da biblioteca") ✓.
- A **contagem por status** precisa ser lida junto da aba (ex.: "Concluído, 12 itens") — **a confirmar**;
  se a contagem for só visual, é P1 para leitor de tela.
- Foco visível em abas/chips (herda `focus.ring`); navegação por teclado entre abas: **a confirmar** se
  é `tablist` com setas ou botões simples.
- Hierarquia de títulos: `h1` da página + títulos de item — conferir que os cards usam `h3` sob o `h1`
  sem pular nível (o Catálogo usa `h2` de seção; aqui não há seção, então item pode ser `h2`/`h3`).

## 8. Copy e i18n

- Namespace **`biblioteca`**: `title`, `subtitle`, `loading`, `error`, `emptyHint`, `filterEmptyHint`,
  `remover`, `removerAria`, `tabsAria`, `tiposAria`, e rótulos de status conjugados por tipo.
- O rótulo conjugado por tipo é **conteúdo**, não string de UI: garantir que os 3 locales conjuguem
  corretamente (é o teste de i18n que mais importa aqui).
- Sem texto hardcoded; paridade/vazamento cobertos por gate (D-604).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | abas com rolagem horizontal ou quebra; grade 2 colunas; ações do item precisam continuar alcançáveis |
| 768 | grade 3 colunas |
| 1024+ | grade 4–5 colunas; abas fixas no topo |

## 10. Métricas de sucesso

- **Distribuição por status** (quantos itens ficam em "quero ver" sem virar "consumindo" — mede intenção
  não realizada).
- **Mudança de status** por sessão (a ação central da tela).
- **Uso do filtro de tipo** e taxa de recorte vazio (`filterEmptyHint`).
- **Remoções** (se alto, a marcação inicial foi equivocada).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1 — verificado OK (D-628)** | A contagem faz parte do nome acessível da aba (o rótulo inclui o número) | `BibliotecaClient.tsx:163-179` | — | feito |
| **P1 — verificado OK (D-628)** | É um `tablist` de verdade: `role="tablist"` + `aria-label` + `role="tab"` + `aria-selected` (`BibliotecaClient.tsx:163-179`) | `tabsAria` | eu | AA |
| P2 | Carregamento é texto, não skeleton | `BibliotecaClient.tsx:81` | eu | — |
| P2 | Remover sem confirmação/undo aparente | `biblioteca.removerAria` | eu | — |
| P2 | Feedback de erro da ação (rollback otimista) não confirmado | `carregar`/ações | eu | — |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| — | **Positivo a preservar:** `ProtectedPage` (hidrata a sessão), `tabsAria`/`tiposAria`, rótulos de status conjugados por tipo, contagens globais do servidor, cursor em vez de paginação numerada, `force-dynamic` por ser dado de usuário | `biblioteca/page.tsx:3,8-9`; `BibliotecaClient.tsx:19,52-55,68-98` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:auth-env -- --start
$env:API_PROXY_TARGET="http://localhost:4000"; npm run dev --workspace apps/web
npm run uiux:evidence -- --state "$env:TEMP\mr-uiux-auth\state.json" biblioteca=/biblioteca
npm run uiux:auth-env -- --stop --purge

grep -n "tabsAria\|tiposAria\|STATUS_TABS\|nextCursor\|force-dynamic" apps/web/src/components/biblioteca/BibliotecaClient.tsx apps/web/src/app/[locale]/biblioteca/page.tsx
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-biblioteca/1440.png` · `375.png`.

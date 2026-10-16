# UI-UX — Descoberta (`/discover` · `/discoveries` · `/dashboard/discoveries`)

> Sessão **13 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-descoberta/{1440,375}.png`
> (a rota `/discover`) e `ui-ux-dashboard/` para a variante protegida.

## 1. Identidade da sessão

- **Objetivo do usuário:** sair do conhecido — receber sugestões que ele **não** pediu, com um motivo
  ("porque você consumiu X"), em vez de navegar por filtro.
- **Persona/estado de conta:** funciona para visitante (sugestões gerais) e melhora logado
  (personalização por consumo).
- **Rotas reais (3, com o mesmo propósito):**
  - `/discover` — `DiscoverClient`, semeada por `getCatalog` no servidor (`discover/page.tsx:4`), namespace
    `catalog`;
  - `/discoveries` — `DiscoveriesFeed`, namespace `discoveries`;
  - `/dashboard/discoveries` — **`ProtectedPage`** + `DiscoveriesContent` (`dashboard/discoveries/page.tsx:3-4`).
- **Entradas:** menu do dashboard ("Descobertas"), home, e-mail/notificações.
- **Saídas:** ficha da obra; adicionar à watchlist/biblioteca; listas.
- **Fora de escopo:** catálogo (1), dashboard (5), busca (11).

## 2. Arquitetura de informação

| Superfície | Blocos | Componente |
|---|---|---|
| `/discover` | grade/curadoria semeada no servidor + estado vazio | `DiscoverClient.tsx:40-64` |
| `/discoveries` | feed "para você" | `DiscoveriesFeed.tsx:85-96` (`section aria-labelledby="pava-title"`) |
| `/dashboard/discoveries` | feed dentro do painel | `DiscoveriesContent.tsx` (com `ProtectedPage`) |
| Bloco transversal | "Porque você consumiu X" | `BecauseYouConsumed(.Client)` |

**Convergência recomendada (sem conceito novo):** uma única superfície de descoberta com **um** caminho
(nav) e a personalização como camada — hoje o usuário tem três portas para a mesma coisa e nenhuma delas é
claramente "a" descoberta.

## 3. Layout, grid e densidade

- `DiscoveriesFeed`: grade de pôsteres com `section` + `h2` por bloco de recomendação (`:85-86`).
- `/discover`: grade do catálogo com curadoria no topo.
- Densidade: cartões de pôster (mesma família do catálogo), com o "porquê" em uma linha.

## 4. Tokens em uso

Todos de [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). **Exceção encontrada:** `DiscoverClient.tsx:64` usa
`text-[#A0A0B8]` literal (valor canônico, mas deveria ser `text-fg-secondary`) — P2.

**Destaque — política de imagem feita certo:** `DiscoveriesFeed.tsx:11,30-38` monta o pôster com
`isLocalSource`/`localSrcSet`/`remoteLadder`, declarando **`srcSet` + `sizes`**, e só cai em `next/image`
com `unoptimized` quando não há ladder pública. **Este é o padrão de referência** para as telas que hoje
usam `<img>` puro sem dimensão (ver `11-rankings.md` §11, P1).

## 5. Estados obrigatórios

| Estado | `/discover` | `/discoveries` | Falta |
|---|---|---|---|
| 1. Carregando | **existe** — `isLoading && !data` (`DiscoverClient.tsx:49`) | a confirmar (SSR ajuda) | skeleton no feed |
| 2. Vazio | **existe** — `t("empty")` (`:64`) | a confirmar | vazio que ofereça o catálogo |
| 3. Erro de rede | **existe e é exemplar** — `RateLimitedError` → `RateLimited` com `retryAfterSeconds` (`:53-54`) e `ErrorState` **com retry** (`:57-58`) | a confirmar | replicar o padrão no feed |
| 4. Não encontrado | n/a | n/a | — |
| 5. Sem permissão | **existe** — personalização exige sessão; visitante vê o geral | `/dashboard/discoveries` protegida ✓ | deixar claro o que muda ao entrar |
| 6. Dados parciais | **existe parcialmente** — item sem `imagem_url` não renderiza imagem (`DiscoveriesFeed.tsx:96`) | idem | carimbo de "sugerido em" |
| 7. Offline | **AUSENTE** | **AUSENTE** | P2 |

## 6. Micro-interações e movimento

- Entrada dos blocos de recomendação: usar `motion.presets.entry` com `stagger` curto nos pôsteres.
- "Porque você consumiu X": a explicação deve **entrar com o bloco**, não atrasar o conteúdo.
- Nada de carrossel automático (movimento não solicitado): se houver auto-avanço, ele deve parar em
  `prefers-reduced-motion` **e** em hover/foco (a confirmar se existe algum).
- Reduced motion: gate verde; manter.

## 7. Acessibilidade AA

- **Positivo:** `DiscoveriesFeed` usa `<section aria-labelledby="pava-title">` + `<h2 id="pava-title">`
  (`:85-86`) — o padrão semântico correto, igual ao `CatalogTypeSections` (D-601/608).
- Pôsteres: `alt` vem do título do item ✓; conferir que pôster **decorativo** (quando o título já está ao
  lado) use `alt=""` e não repita a informação.
- **P1:** `/discoveries` lê o store de auth (`DiscoveriesFeed.tsx:123`) **sem `ProtectedPage`** → F5 cai no
  estado de visitante (mesma família do P0 do D-610). Ou a rota é pública de verdade, ou deve ser
  protegida como a versão do dashboard.
- Contraste dos textos sobre pôster: o feed usa sobreposição — conferir 4,5:1 nos rótulos.

## 8. Copy e i18n

- Namespaces: **`discoveries`** (`:11,23`) e **`catalog`** (`discover/page.tsx:12` — a mesma chave `empty`
  do catálogo, o que pode confundir o vazio das duas telas).
- **A CRIAR:** texto do "porquê" (explicação da recomendação) com paridade nos 3 locales, e o rótulo do
  estado vazio próprio da descoberta.
- Tom: sugestão, nunca promessa ("recomendado porque…", não "você vai adorar").

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | grade 2 colunas; blocos de recomendação empilham |
| 768 | 3 colunas |
| 1024+ | 4–5 colunas; blocos lado a lado quando fizer sentido |

## 10. Métricas de sucesso

- **Cliques no feed** por bloco (mede qual tipo de recomendação funciona).
- **Adição à watchlist/biblioteca** a partir da descoberta (conversão real, não só clique).
- **Cliques na explicação** ("porque você consumiu X") — mede se o motivo convence ou atrapalha.
- **Uso por visitante × logado** — mede o valor da personalização.
- **Sobreposição entre as 3 rotas** (quantos usuários usam mais de uma) — dado para decidir a convergência.

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | **Três rotas para a mesma intenção** (`/discover`, `/discoveries`, `/dashboard/discoveries`) sem hierarquia clara entre elas | as 3 páginas + `DashboardSidebar.tsx:26` | eu | convergência (produto) |
| **P1** | `/discoveries` lê o store de auth **sem guard** | `DiscoveriesFeed.tsx:123`; mapa do P0 em `14-dashboard.md` §11 | eu | D-610 |
| P2 | `text-[#A0A0B8]` literal onde há `text-fg-secondary` | `DiscoverClient.tsx:64` | eu | D-584 |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| P2 | Vazio de `/discover` reusa a chave `catalog.empty` (não é vazio de catálogo) | `discover/page.tsx:12` | eu | i18n |
| — | **Positivo a preservar (dois padrões de referência):** a máquina de estados do `DiscoverClient`
(`RateLimited` + `ErrorState` com retry) e a **política de imagem do `DiscoveriesFeed`** (`srcSet`/`sizes`
com ladder local) | `DiscoverClient.tsx:49-64`; `DiscoveriesFeed.tsx:11,30-38` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- descoberta=/discover            # e: discover-feed=/discoveries
grep -n "RateLimited\|ErrorState\|retryAfterSeconds" apps/web/src/components/DiscoverClient.tsx
grep -n "localSrcSet\|remoteLadder\|sizes=\|aria-labelledby" apps/web/src/components/DiscoveriesFeed.tsx
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-descoberta/{1440,375}.png`.

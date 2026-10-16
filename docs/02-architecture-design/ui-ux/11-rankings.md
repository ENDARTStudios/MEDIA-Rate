# UI-UX — Rankings (`/top`)

> Sessão **2 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-rankings/{1440,375}.png`.

## 1. Identidade da sessão

- **Objetivo do usuário:** ver o que é melhor **agora** em cada tipo de mídia e escolher o próximo
  título por posição, sem montar filtro.
- **Persona/estado de conta:** **público**; a ação de watchlist aparece no card para quem está logado.
- **Rotas:** `/top` com **`?type=<slug>`** — os chips navegam por link
  (`TopPageClient.tsx:112`), então cada ranking é **compartilhável e indexável**.
- **Entradas:** item "Rankings" na navbar, CTA da home, links de outras telas.
- **Saídas:** ficha (`/media/[slug]` — hero L171 e itens do TOP 10 L214), lançamentos do ano (L236),
  franquias/"por onde começar" (L250).
- **Fora de escopo:** catálogo completo (sessão 1), ficha (sessão 4/…), listas do usuário.

## 2. Arquitetura de informação

Server-first: `apps/web/src/app/[locale]/top/page.tsx` roda `getTopPorTipo(tipo)` (L56) e entrega o
payload pronto para `TopPageClient` (L58) — a página chega **com conteúdo** no HTML.

| # | Bloco | Componente |
|---|---|---|
| 1 | `h1` "Rankings" + subtítulo | `TopPageClient.tsx:98-99` |
| 2 | Chips de tipo (`nav`) | `TopPageClient.tsx:103-120` |
| 3 | Hero do **Nº 1** (badge + capa + `h2` + score) | `TopPageClient.tsx:150-188` |
| 4 | **TOP 10** (`h2` + `<ol>`) | `TopPageClient.tsx:190-228` |
| 5 | Lançamentos do ano (`h2` + lista) | `TopPageClient.tsx:236` |
| 6 | Por onde começar — franquias (`h2` + `h3` + `<ol>`) | `TopPageClient.tsx:250-263` |
| 7 | Rodapé | global |

Os três blocos ficam em `div.space-y-12` (`:148`); erro e vazio **substituem** os blocos (`:140-146`).

## 3. Layout, grid e densidade

- Container único: `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8` (`TopPageClient.tsx:96`).
- Hero: faixa de largura total do container com arte de fundo e degradê de legibilidade (`:156`).
- TOP 10: lista de uma coluna, `space-y-3` (`:193`); cada item é uma linha com posição, miniatura
  48×72 (intenção — ver pendência P1), título, metadados e score à direita.
- Densidade: 10 itens + lançamentos + franquias ≈ 2.300 px em 1440 (medido na captura `1440.png`).

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Fundo | `colors.bg` | global |
| Card do item | `bg-surface-card` + `border-surface-border` (`:197`) | TOP 10 |
| Texto | `text-fg-primary` / `text-fg-secondary` (`:74,99,200`) | títulos, posição, metadados |
| Tipo (cor) | `CATEGORY_TOKENS` (via chip) | chips |
| Score | `scoreColor()` + `normalizeDisplayScore` + `formatarScoreLocale` (`:40-43`) | hero e itens |

**Fora de token nesta sessão (pendências):**
1. **Selo "Nº 1 do ranking"**: `bg-amber-400 text-amber-950` (`TopPageClient.tsx:167`) — paleta default do
   Tailwind; o token equivalente é `score.medium` `#FBBF24` (com texto `#05050A`).
2. **Degradê do hero**: `linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.25)…)`
   (`:156`) — `rgba` hardcoded; `surface.overlay` é `rgba(5,5,10,0.92)`.
3. `<h2>` e itens usam classes cruas (`text-2xl sm:text-4xl`, `text-xl`) em vez dos papéis de
   `typography` (`h1`/`h2`/`heading-*`) — padronizar é P2.

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | **SSR** entrega o conteúdo; sem `loading.tsx` próprio (`app/[locale]/top/loading.tsx` **ausente**) → usa o global | `app/[locale]/loading.tsx` | **P2**: skeleton da própria rota (hero + 10 linhas) para navegação client-side |
| 2. Vazio | **existe** — `top.empty`: "Ainda não há mídias suficientes avaliadas neste tipo" | `:144-146` `data-testid="top-vazio"` | CTA para o catálogo no vazio |
| 3. Erro de rede | **existe, mas sem retry** — `top.erro` em texto centralizado | `:140-142` `data-testid="top-erro"` | **P1**: botão "tentar de novo" (padrão M16/D-603) |
| 4. Não encontrado | **não se aplica** — `?type` inválido cai no tipo padrão (`asMediaType`, L46 do cliente) | — | — |
| 5. Sem permissão | **não se aplica** — ranking é público | — | — |
| 6. Dados parciais | **existe implicitamente** — item com `score == null` não renderiza score (`:41`); item sem capa não renderiza imagem (`:59,205`) | `TopPageClient.tsx:40-43` | declarar o critério de "ranking com poucas fontes" na UI |
| 7. Offline | **AUSENTE** | — | **P2** |

## 6. Micro-interações e movimento

- Chip: `transition-colors` (`:116`) — cor apenas, sem layout shift; estado ativo é cor + `aria-current`.
- Link do título: `hover:underline` (`:171,216`) — o produto quase não usa sublinhado em hover;
  **P2**: trocar por mudança de cor/realce consistente com o resto.
- Card do TOP 10: `shadow-sm` fixo (`:197`) — sem hover state.
- **A CRIAR (P2):** entrada do hero com `motion.presets.entry` e `stagger` de 30–40 ms nos 10 itens;
  hoje a página é estática. Reduced motion não decide markup (gate verde).

## 7. Acessibilidade AA

- **Hierarquia (medida):** `h1` (Rankings) → `h2` (hero Nº 1, TOP 10, Lançamentos, Por onde começar) →
  `h3` (nome da franquia) ✓ — **sem pular nível**, com `id` nos `h2` para ancoragem (`:190,236,250`).
- **Destaque positivo:** os chips são um `<nav aria-label={t("title")}>` (`:103`) com
  **`aria-current="page"`** no ativo (`:113`) — este é o padrão a ser replicado nas outras sessões.
- **Destaque positivo:** o ranking é `<ol>`/`<li>` (`:193-195,261-263`) — a posição é semântica, não
  só visual (`w-8 text-2xl` no número).
- Hero é `section` com `aria-label={t("heroBadge")}` (`:151-153`) ✓.
- **P1**: `<img>` sem `alt` visível no trecho inspecionado (`:60,206`) — se o alt for vazio precisa ser
  explícito (`alt=""`), e o título adjacente não substitui o rótulo da imagem quando ela é decorativa.
- **P1**: miniaturas são `<img>` puro — sem `width`/`height`/`sizes`, o que causa **CLS** (o layout
  reserva espaço só depois da carga) além de peso; a classe `h-18` (`:209`) **não existe** na escala do
  Tailwind (não há `18` no spacing), então a altura intencionada (72 px) **não é aplicada**.
- Contraste: pares de token verdes em `npm run design:contrast` (221/221); o selo `amber-400/amber-950`
  está fora do gate por ser literal — é o item P2 nº 1 da §4.
- **A CRIAR (P2):** `aria-label` no `nav` já existe; falta atalho de teclado para trocar de tipo.

## 8. Copy e i18n

- Namespace **`top`** (13 chaves): `title`, `subtitle`, `heroBadge`, `top10`, `lancamentos`, `porOndeComecar`,
  `porOndeComecarHint`, `ordemCronologica`, `categorias`, `empty`, `fontes` (plural ICU), `erro`.
- Plural correto (`top.fontes`: `one/other`) ✓ e `{ano}` interpolado em `lancamentos` ✓.
- Sem texto hardcoded; paridade e ausência de vazamento cobertas por `test/i18n-leak.spec.ts` (D-604).
- **A CRIAR:** rótulo do botão de retry (§5.3) e o texto do estado offline.

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | container `px-4`; chips quebram em 2–3 linhas (`flex-wrap`); item do TOP 10 mantém a linha (posição + miniatura + título + score) → **medir** se o título não trunca de forma agressiva |
| 768 | `sm:px-6`; hero cresce (`text-2xl sm:text-4xl`, `:170`) |
| 1024+ | `lg:px-8`; 10 itens em uma coluna larga (`max-w-6xl`) |

## 10. Métricas de sucesso

- **Cliques por posição** (1º × 5º × 10º) — mede se o ranking orienta a escolha.
- **CTR do hero** vs. TOP 10.
- **Navegação por tipo:** quantos usuários trocam de chip (e para quais tipos).
- **Web vitals de `/top`** — atenção a CLS por causa das miniaturas sem dimensão (§7, P1).
- **Zero-query:** % de sessões que saem sem clicar (indica ranking pouco convincente).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| P1 | Miniaturas em `<img>` puro, **sem `width`/`height`/`sizes`** e com classe `h-18` **inexistente** (altura não aplicada → CLS) | `TopPageClient.tsx:60-62, 206-209`; `tailwind.config.ts` sem `18` no spacing | eu | política de imagem do repo (`lib/image-policy.ts`) |
| P1 | Erro sem "tentar de novo" | `:140-142` | eu | D-603 (M16) |
| P1 | `alt` das imagens não explícito no trecho inspecionado | `:60,206` | eu | AA |
| P2 | Selo "Nº 1" com `amber-400`/`amber-950` (paleta default) | `:167` | eu | D-584 |
| P2 | Degradê do hero com `rgba(0,0,0,…)` hardcoded | `:156` | eu | D-584 |
| P2 | Sem `loading.tsx` da rota (usa o global) | `app/[locale]/top/loading.tsx` ausente | eu | — |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência de `navigator.onLine` | eu | — | ✔
| P2 | `hover:underline` fora do padrão de hover do produto | `:171,216` | eu | — |
| P2 | Classes tipográficas cruas em vez dos papéis de `typography` | `:170,190,236,250` | eu | — |
| — | **Positivo a preservar:** `<nav aria-label>` + `aria-current="page"` nos chips e `<ol>` no ranking — replicar nas sessões Descoberta, Catálogo e Listas | `:103,113,193` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- rankings=/top              # 1440 (inteira) + 375 (dobra)
grep -n "aria-current\|<ol\|<img\|h-18\|amber-" apps/web/src/components/TopPageClient.tsx
npm run design:contrast; npm run design:hex; npm run test:hydration --workspace apps/web
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-rankings/1440.png` · `375.png`.
**Nota de método:** posição de elemento não se conclui por captura `fullPage` (elemento `sticky`/`fixed`
sai na posição final) — confirmar no DOM.

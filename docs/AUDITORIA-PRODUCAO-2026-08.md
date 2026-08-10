# Auditoria de Produção — 2026-08-09/10

**Base**: `media-rate-web.vercel.app` + `media-rate-production.up.railway.app`
**Método**: Playwright automatizado (`e2e/auditoria-producao.spec.ts`) — 3 locales × páginas públicas + curl na API.
**Screenshots**: `docs/auditoria/*.png` (12). **JSON**: `docs/auditoria/achados.json`.

## Resumo

| Severidade | Qtd | Descrição |
|---|---|---|
| **Importante (bug real)** | 1 componente | `LockedComingSoonCard` com rótulos PT hardcoded (T241) |
| Importante (falso positivo) | — | Checklist com termos PT/ES compartilhados (nav es-ES) |
| Informativos | — | Contagens, seções, preços (validados) |
| Não-bugs | — | 401 /me e /watchlist (esperados), RSC aborts, R$ em pricing |

## Regressões confirmadas VIVAS em produção (deploy d4ba1f8)

| Check | Resultado |
|---|---|
| `/media/duna-livro` e `/media/berserk-manga` | **200** (T251 ok — slug discriminado resolve) |
| Ficha game (Terraria) com botão de status | **visível** (T249 ok) |
| Pricing símbolo por locale | **R$ 0/4,90/9,90 (pt), $ 4.90 (en), € 4,90 (es)** (T247 ok) |
| Toggle mensal/ano | **mês/ano distintos** (T247 ok) |
| Privacy seções | **12 nos 3 locales** (T248/T250 ok) |
| `?type=movie` / `?type=manga` / `?type=book` | **12 / 1 / 1 cards** (catálogo por tipo ok) |
| Home imgs | **20** (posters presentes) |
| Nav traduzida | EN: Catalog/Plans/Log in/Sign up ✓; ES: Catálogo/Planes/Entrar/Registrarse (chaves legítimas) |

## Achado REAL (importante) — T241

**`LockedComingSoonCard.tsx`** (seção da home para Livros/Quadrinhos/Mangás):
- `CATEGORY_LABEL` e `VARIANTE_LABEL` com strings PT hardcoded
- Em **en-US**: "BOOKS ... Romances **Livros**", "COMICS ... HQs & **Mangás**"
- Em **es-ES**: "LIBROS ... Romances **Livros**", "CÓMICS ... **HQs & Mangás**"
- **Causa**: rótulos de categoria e variação não usam i18n (o T241, empty-state da home, nunca foi implementado para essas strings)
- **Fix sugerido**: usar chaves `catalog.livro/comic/manga` + lista de variações por locale (i18n)

## Falsos positivos do checklist (excluídos)

- **nav es-ES "Catálogo"/"Entrar"**: são as chaves legítimas do es-ES (palavras idênticas em PT/ES) — não é bug
- **catalog-movie/book = 0 / home-imgs = 0** no 1º run: **timing** (waitUntil:load com RSC streaming); diag2 com wait extra confirmou 12 cards e 20 imgs
- **request-failed `?_rsc=`**: aborts normais do Next.js RSC (não são falhas de recurso real)
- **console 401 /auth/me e /watchlist**: esperados para visitante não autenticado

## Pendências conhecidas re-verificadas

- **T241** (home Livros/Quadrinhos/Mangás): **CONFIRMADO** — LockedComingSoonCard PT hardcoded
- **Faixa "em alta" com titulo_original** (D-248, adiado): não observado como regressão nesta varredura (home carrega títulos)
- **T234** (ordem migration DB virgem): dívida de infra, não aplicável à auditoria de produção atual

## Recomendação

1. **Corrigir T241** (LockedComingSoonCard via i18n) — único achado de UI real
2. Re-teste do checklist com termos PT/ES não-ambíguos (excluir palavras compartilhadas)

# Auditoria Manual Completa — Produção — 2026-08-09/10

**Base**: `https://media-rate-web.vercel.app` (Vercel) + `media-rate-production.up.railway.app` (Railway)
**Método**: Playwright (navegação real) × 3 locales, com evidência de URL/conteúdo.
**Deploy auditado**: `112c109` (T254+T255) — Vercel propagado, Railway uptime reset (~14min).

---

## 1. Páginas principais × 3 locales

| Página | pt-BR | en-US | es-ES | Obs |
|---|---|---|---|---|
| Home (`/`) | OK | OK | OK | conteúdo 9-11k chars, nav traduzida |
| Catálogo (`/catalog`) | OK | OK | OK | cards por tipo funcionando |
| Pricing | OK | OK | OK | moeda por locale (R$/$/€) + toggle mês/ano |
| Login | OK | OK | OK | formulário presente |
| Registro | OK | OK | OK | formulário presente |
| Privacidade | OK | OK | OK | 12 seções (LGPD pt / RGPD es / neutro en) |
| Termos | OK | OK | OK | foro Osasco/SP nos 3 |
| Sobre | OK | OK | OK | — |
| Metodologia | OK | OK | OK | — |
| FAQ | OK | OK | OK | — |

**Nenhuma página com erro de carregamento** ("algo deu errado" ausente em todos).

## 2. Fichas de mídia (reais do catálogo)

| Categoria | Mídias testadas | Status | Posters |
|---|---|---|---|
| Filme | O Enigma de Outro Mundo, A Grande Guerra, Um Sonho de Liberdade | OK (14 botões) | ✓ |
| Série | SK8 the Infinity, Friends | OK (14 botões) | ✓ |
| Game | Terraria, Rocket League | OK (13 botões) | **✗ imgs=0** (T245) |
| Livro | Duna (duna-livro) | OK (13 botões) | ✓ (2 imgs) |
| Quadrinho | Watchmen | OK (13 botões) | ✓ |
| Mangá | Berserk (berserk-manga) | OK (13 botões) | **✗ imgs=0** (T245) |

- Breadcrumb do mangá: **"Mangás"** ✓ (fix T253)
- Breadcrumb do livro: **"Livros"** ✓
- Nenhuma ficha com erro; botão watchlist + share presentes.

## 3. Funções testadas

| Função | Resultado | Evidência |
|---|---|---|
| Busca global `acao` | **Coringa nos 3 locales** (paridade acentos) | T227/T229/T246 vivos |
| Busca Ctrl+K | abre e busca | T246 ✓ |
| Botão watchlist na ficha | presente (data-testid status-control-full) | T238 ✓ |
| Botão Share | presente (en-US: "Share") | ✓ |
| Toggle de idioma | presente nos 3 (PT/EN/ES) | ✓ |
| Breadcrumbs | corretos (Mangás/Livros/Séries) | ✓ |
| Moeda por locale | R$ 4,90 / $ 4.90 / € 4,90 | T247 ✓ |
| Toggle mês/ano | rótulos distintos | T247 ✓ |

## 4. Validações i18n

- **Home EN/ES**: NENHUM termo PT hardcoded ("Books/Comics", "Libros/Cómics" — **T254 propagado** ✓)
- **Fichas EN/ES**: rótulos traduzidos (Synopsis/Cast/Reviews/Metadata; no PT hardcoded de UI)
- **Nav**: EN Catalog/Plans/Log in/Sign up; ES Catálogo/Planes/Entrar/Registrarse (chaves legítimas)
- **Dívida conhecida**: sinopse em PT nas fichas EN/ES (dados TMDB só pt-BR — D-248, requer re-coleta multi-idioma)

## 5. Achados classificados

| Severidade | Achado | URL/Evidência | Recomendação |
|---|---|---|---|
| **Alto** | Games (Terraria, Rocket League) sem pôster | `/pt-BR/media/terraria` imgs=0 | T245: validar credencial IGDB/Twitch no Railway e re-rodar seed-posters |
| **Alto** | Mangá (Berserk) sem pôster | `/pt-BR/media/berserk-manga` imgs=0 | T255 aplicado (fallback obra relacionada) — re-rodar seed-posters pós-deploy Railway |
| **Médio** | Sinopse em PT nas fichas EN/ES | `/en-US/media/sk8-the-infinity` | D-248: re-coleta TMDB multi-idioma (dívida, não-bug de UI) |
| **Baixo** | Livro/HQ/mangá: só 1 item cada no catálogo | catálogo real | Dívida de dados (seeds), não é bug |

**Nenhum achado Crítico.**

## 6. Conclusão

O site está **funcional e i18n-íntegro nos 3 idiomas** para a Open Beta. Os únicos achados "Alto" são **dívidas de dados** (pôsteres de games/mangá dependentes de seed-posters com credenciais reais — T245/T255, já corrigido no código, aguardando re-seed do Operador). Sinopse multi-idioma é dívida documentada (D-248). **Recomendação: liberar a Open Beta**; executar o re-seed de pôsteres como item pós-liberação.

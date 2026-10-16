# AUDITORIA UI/UX — MEDIA Rate (2026-10)

> Reavaliação de UI/UX de **todo o site** (45 rotas, 144 componentes): falhas, gaps e
> pendências, com prioridade, evidência e correção. Ciclo **T211**.
> Decisões: **D-582**. Achados de design anteriores: D-579/D-580/D-581.

---

## 1. Sumário executivo

**Veredito: o site está consistente nas superfícies públicas novas (home, catálogo, institucional), mas tem três dívidas estruturais que os gates atuais não enxergam.**

1. **Dois design systems convivem.** `design-tokens.ts` é a fonte declarada, mas **~2.190 hex literais (108 valores distintos)** estão em `src/`, e **17 dos 20 exports de token nunca são importados**. O `dashboard` inteiro usa paleta paralela (índigo `#8b7cff`, teal `#62d7c5`, âmbar `#f2c36b`, superfícies `#11111b`) e `text-white/30` (contraste **2,66:1**, reprova AA).
2. **O admin é "light-mode-first" num app dark-only.** 108 usos de `dark:` em 12 arquivos; o Tailwind não define `darkMode` (default `media`) e a classe `dark` do `<html>` é inerte → com o SO em modo claro, títulos ficam **1,05:1** sobre o fundo e os cards viram brancos chapados. Nenhum gate pega (os 3 configs Playwright forçam `colorScheme: "dark"` e não há rota `/admin` no axe).
3. **Feedback de ação não existe como sistema.** Remover da watchlist, avaliar, criar lista, remover item e assinar plano: sem toast, sem confirmação (5 fluxos usam `window.prompt`/`confirm`) e com falha silenciosa (`catch {}`).

**Corrigido neste ciclo (ver §4):** CTA do checkout sem fundo (classe inexistente), **hydration mismatch** em `/billing/success`, vazamento de português em EN/ES nas páginas institucionais (`/sources`, `/methodology`, `/terms`), `prose` inerte, medida de leitura das páginas legais, 58 pontos de contraste reprovando AA no produto logado, loop `requestAnimationFrame` infinito em `/pricing`, `hover` preso no touch (296 usos), emoji como ícone, e mais.

**Placar dos gates depois deste ciclo:** detector `design:detect` **0** no modo fonte e **0** no DOM em 20 rotas públicas; `design:contrast` **51/51**; vitest **615/615**; tsc **0**; eslint **0**; regressão visual **4/4**.

---

## 2. Método e evidência

| Frente | Como foi feito |
|---|---|
| Inventário | 45 rotas (`app/**/page.tsx`), 144 componentes, 11 `layout.tsx`, **0 `loading.tsx`**, 1 `error.tsx`, 2 `not-found.tsx` |
| Alcance das rotas | Probe HTTP das 30 rotas principais: 18 públicas (200), 10 redirecionam para `/login` |
| DOM renderizado | `impeccable detect --json` em **20 rotas públicas** + re-scan após cada correção |
| Estático | Censo de hex/utilitários, `text-white*`, `dark:`, `rounded-2xl`, `transition-all`, `hover:`, `100vh`, `role="list"`, `alt`, `aria-label`, headings, `loading/error/not-found` |
| i18n | Paridade de 1.208 chaves × 3 locales; varredura de texto PT em JSX/`alt`/`aria-label`; chaves órfãs |
| Acessibilidade | axe via `visual-qa`; foco/teclado/dialogs; alvos de toque; contraste WCAG 2.1 medido por hex |
| Qualitativo | 4 auditorias paralelas por superfície (público/marketing, produto logado, admin, transversal) com evidência `arquivo:linha` |

**Verificações independentes dos achados de auditoria (feitas por mim, não aceitas por relato):**
- `bg-primary-700` no checkout: **confirmado** — `primary` existe só como `DEFAULT`/`foreground` no `tailwind.config.ts`, sem escala numérica.
- `prose` em `/sources` e `/methodology`: **confirmado inerte** — `@tailwindcss/typography` ausente e `plugins: []` no config.
- `terms.h1`: **confirmado** "Termos de Uso" em EN e ES (agora corrigido).
- `/login` indexável: **confirmado** — `page.tsx` declarava `index: true` e sobrescrevia o `index: false` do `layout.tsx` (agora só o layout decide).
- Home ISR: **confirmado inefetivo** — `prerender-manifest.json` só tem `/_global-error`, `/icon.svg`, `/robots.txt`, `/sitemap.xml` (0 rotas do segmento `[locale]`, por causa de `cookies()` no layout).
- `/welcome` começando em `h2`: **refutado** (falso positivo — a página tem `<motion.h1>`; regex de `<h1` não casa com `motion.h1`).
- `/movie/[id]` duplicando conteúdo de `/media/[slug]`: **refutado** — canonical aponta para `/media/<slug>` corretamente.
- `/design-system` exposto: **refutado** — `noindex, nofollow` e fora do sitemap.

---

## 3. Estado por superfície

| Superfície | Veredito | Aberto |
|---|---|---|
| Home (hero, prova, seções) | Bom — funil gancho→promessa→prova→CTA, server-first, 0 achados | CTA final usa o rótulo do botão como H2; preços hardcoded na home |
| Catálogo / discover / top | Bom no catálogo e discover; `/top` é protótipo claro (tema claro se o SO for claro) | `/top` fora do tema; `/discover`+`/top` estavam fora do sitemap (corrigido) |
| Ficha `/media/[slug]` | Bom — tokens, dial, breadcrumb | 3 dials concorrentes, `alt` em PT, LCP carrega rung `original` |
| Institucional (`/about`,`/faq`,`/sources`,`/methodology`,`/terms`,`/privacy`) | **Corrigido agora** (eram as piores: PT em EN/ES, `prose` inerte, medida) | 3 tamanhos de H1 e 2 alinhamentos; FAQ em 3 fontes distintas |
| Auth / conversão (`/login`,`/register`,`/welcome`,`/checkout/[plan]`,`/billing/success`) | **Corrigido agora** (CTA sem fundo, hydration, metadata PT) | Pós-cadastro sem SSR útil (`opacity:0` até hidratar); `/onboarding` órfã |
| Produto logado (`/dashboard`,`/biblioteca`,`/watchlist`,`/listas`,`/historico`,`/profile`,`/settings`) | Contraste e a11y melhorados agora; dashboard continua um 2º design system | Paleta paralela, 89 `text-white*`, `rounded-2xl` 15×, 50 fontes <12px, sem toast/undo |
| Admin (8 telas) | **Pior superfície** — light-mode-first, PT hardcoded, dialogs nativos | 108 `dark:`, 36 `text-gray-500` AA, 4 tabelas sem `scope`, 5 fluxos com `prompt/confirm` |
| Rotas com sessão (`/watchlist`,`/biblioteca`,`/dashboard`,…) | Funcional | **5-6s de "Verificando sessão..."** antes de redirecionar ao login; sem conteúdo SSR |

---

## 4. Corrigido neste ciclo (com prova)

### 4.1 Bloqueadores

| Achado | Arquivo | Antes → Depois | Prova |
|---|---|---|---|
| CTA do checkout sem fundo nem foco (classes `bg-primary-700/800`, `focus:ring-primary-700` inexistentes) + card branco/texto escuro se o SO estiver claro | `app/[locale]/checkout/[plan]/page.tsx` | CTA canônico rose + foco índigo; tokens `#12121C`/`#2A2A3D`/`#F5F5F7`/`#A0A0B8`; `✓` → `Check` Lucide; erro `text-red-600` → `#F87171` | DOM scan `/checkout/plus` **0** |
| **Hydration mismatch** em `/billing/success` (SSR `<canvas>` vs cliente `null` com `prefers-reduced-motion`) | `components/ui/ConfettiCelebration.tsx` | `if (shouldReduce) return null` removido do render (gate fica no `useEffect`) | finding `script-error` **1 → 0** |
| Português vazando em EN/ES nas páginas institucionais (`MIDIA_LABEL` com "Filmes/Séries/Quadrinhos", literais "Crítica/Público") | `lib/sources.ts` → `MIDIA_LABEL_KEY` + `catalog.*`; `sources/page.tsx`, `methodology/page.tsx` | Chaves canônicas nos 3 locales (`scoredial.critic/audience`) | `/en-US/sources` PT-real **71 → 0**; `/methodology` **59 → 0**; idem ES |
| `<h1>` de `/terms` em português nos 3 locales | `messages/{en-US,es-ES}.json` | "Terms and Conditions" / "Términos y Condiciones" | HTML servido em EN/ES |
| `prose`/`prose-invert` inertes (plugin ausente) → títulos no default do browser e **links azuis nativos** sobre fundo escuro | `sources/page.tsx`, `methodology/page.tsx` | Estilos explícitos por token (`[&_h2]`, `[&_p]`, `[&_a]`) + medida 34rem com `text-sm` | DOM scan `/sources` e `/methodology` **0** |
| `/login` indexável (o `robots` da page sobrescrevia o `noindex` do layout) | `app/[locale]/login/page.tsx` | `robots` removido da page (herda `index:false`) | — |

### 4.2 Contraste / AA

| Achado | Arquivo | Antes → Depois |
|---|---|---|
| Escada `text-white/25…/42` (contraste 2,20–3,81:1) | `DashboardOverview.tsx` (45), `DashboardSidebar.tsx` (7), `BibliotecaClient.tsx` (6) | **58 → 0** trocados por `text-[#85859F]` (5,21:1) |
| Medida de leitura das páginas legais (14 e 11 linhas longas) | `terms/page.tsx`, `privacy/page.tsx` | `[&_p]:max-w-[38rem]` nos parágrafos/itens (tabelas seguem `3xl`) → **14 → 0** e **11 → 0** |
| `Arial` residual no SVG de export/print (achado `overused-font` aberto) | `DashboardOverview.tsx` | **13 → 0** (`Inter, system-ui, sans-serif`) |

### 4.3 Movimento, mobile e acessibilidade

| Achado | Arquivo | Correção |
|---|---|---|
| Loop `requestAnimationFrame` **infinito** sem gate nas pricing cards | `components/ui/glowing-effect.tsx` | Para com `prefers-reduced-motion`, não monta em telas sem ponteiro fino e pausa com a aba oculta |
| `scroll-behavior: smooth` fora do gate (WCAG 2.3.3) | `app/globals.css` | Movido para `@media (prefers-reduced-motion: no-preference)` |
| 296 `hover:` presos no touch (Tailwind 3.4 não gateia) | `tailwind.config.ts` | `future: { hoverOnlyWhenSupported: true }` |
| 25 de 31 `<ul>` sem `role="list"` (o Preflight do Tailwind remove `list-style` → Safari/VoiceOver perdem a lista) | 21 arquivos (exceto os do outro agente) | `role="list"` adicionado |
| `transition-all` no botão base do produto | `components/ui/button.tsx` | `transition-colors` |
| `NotificationBell`: `role="dialog"` sem Escape, sem foco e sem retorno de foco | `components/NotificationBell.tsx` | Escape + foco no painel + foco de volta ao sino + `aria-haspopup` |
| Menu de conta fechava **só** com `onMouseLeave` (teclado preso) | `components/Navbar.tsx` | `aria-expanded`, `aria-haspopup`, `role="menu"`, Escape e fechar ao sair do foco |
| Inputs de 14px em `/login` e `/register` (zoom automático no iOS) | `components/AuthForm.tsx` | `text-base sm:text-sm` nos 5 classNames de input |
| Barra fixa da ficha sob o home indicator do iPhone | `MediaDetailClient.tsx` + `app/layout.tsx` | `viewportFit: "cover"` + `pb-[max(0.75rem,env(safe-area-inset-bottom))]` |
| `ErrorBoundary` usando `<h2>` como título da página de erro | `components/ErrorBoundary.tsx` | `<h1>` |

### 4.4 Design system e conteúdo

| Achado | Arquivo | Correção |
|---|---|---|
| Emoji como ícone (D-065) | `app/[locale]/onboarding/page.tsx` | 🔍📊📝⌘K → `Search`, `BarChart3`, `PenLine`, `Command` |
| Eyebrow acima do H1 (mesmo padrão removido da home em T209) | `app/[locale]/welcome/page.tsx` | Removido |
| 2 blobs com `blur-[110/120px]` no hero (mesma família do aurora-blob, caro em mobile) | `components/HeroSection.tsx` | Radial-gradients estáticos de alfa baixo |
| 3 frases PT hardcoded no selo de classificação **enquanto as chaves `metadados.*` existiam traduzidas e órfãs** | `media-rate-ui/AgeRatingBadge.tsx` | Usa `metadados.suggestedByPublisher/classificationHint/mayVaryBySeason` |
| `<title>` do `/verificar-email` em PT nos 3 locales; `billing/success` sem title/description; `checkout/[plan]` com metadata PT sem OG | 3 arquivos | `generateMetadata` por locale (`auth.*`, `billing.*`, `checkout.*`) + OG padrão + noindex no checkout |
| `aria-label="Periodicidade"` fixo em PT no toggle de preços | `components/PricingCards.tsx` | `pricing.billingPeriod` (3 locales) |
| `/faq` e `/sources` existiam, estavam no sitemap e **não eram linkados em nenhum menu** | `components/MotionFooter.tsx` | Adicionados ao grupo de links |
| `/discover` e `/top` indexáveis (`index,follow`) e ausentes do sitemap | `app/sitemap.ts` | Adicionados (priority 0.8) |

### 4.5 Guarda nova contra regressão

`test/rgpd-locale.spec.ts` só varria o namespace `privacy` — foi por isso que `terms.h1` ficou em português nos 3 locales sem ninguém reclamar. Agora o mesmo regex de leak varre `terms` **e** compara títulos institucionais (`terms`/`privacy`/`about`) entre locales, reprovando frases de 2+ palavras idênticas ao pt-BR. Suíte: **615/615**.

---

## 5. Achados abertos — bloqueadores

| # | Achado | Evidência | Correção proposta |
|---|---|---|---|
| B1 | **Admin é light-mode-first num app dark-only**: 108 `dark:` em 12 arquivos; `darkMode` ausente (=`media`) e `className="dark"` inerte → títulos `text-gray-900` a **1,05:1** sobre `#12121C` e cards `bg-white` com o SO em modo claro | `tailwind.config.ts`, `app/layout.tsx:41`, `admin/{usuarios,catalogo,diagnosticos,lgpd,metricas,auditoria}` | `darkMode: "class"` (1 linha, acende os 108 usos) **ou** migrar o admin para tokens. Decisão D-582.1 |
| B2 | **`text-gray-500` (`#6B7280`) ainda vivo no admin: 36 usos** — 4,21:1 sobre `#05050A` | `admin/usuarios` (12), `admin/diagnostics` (11), `admin/lgpd` (10), `admin/catalogo` (3) | `text-[#9CA3AF]`. **Não corrigido por mim: arquivos em edição pelo outro agente** |
| B3 | **Dashboard: segundo design system** — 167 hex fora de token, 89 `text-white*`, 39 `border-white`, 30 `bg-white`, 15 `rounded-2xl`, 50 fontes < 12px, paleta paralela (`#8b7cff`, `#a69cff`, `#62d7c5`, `#f2c36b`, `#11111b`) | `components/dashboard/DashboardOverview.tsx` (1.757 linhas) | Quebrar em componentes + tokens canônicos. Decisão D-582.2 |
| B4 | **Sem feedback de ação como sistema**: remover da watchlist / avaliar / criar lista / remover item / assinar → sem toast, sem undo; `catch { /* Falha silenciosa */ }` em 3 handlers | `WatchlistButton.tsx:97,109,121`, `WatchlistClient.tsx:311,398`, `WatchlistCard.tsx:353` | Toast + undo otimista; confirmação para ações destrutivas |
| B5 | **`/feedback` é 100% português, usa emoji como nota, não envia nada e cita canais que não existem** (`discord.gg/mediarate`, `feedback@mediarate.app` — únicos no repo) | `app/[locale]/feedback/page.tsx:8-33` | i18n + Lucide `Star` + envio real, ou remover a rota. Decisão D-582.3 |

---

## 6. Achados abertos — altos

| # | Achado | Evidência | Correção |
|---|---|---|---|
| A1 | **5-6s de "Verificando sessão..."** antes de redirecionar para `/login` nas 10 rotas com sessão; HTML do servidor tem só esse texto (sem JS fica preso para sempre) | probe Playwright em `/listas`, `/historico`, `/compare` (redirect entre 3s e 6s) | Gate no servidor (ou shell SSR com CTA de login) + `loading.tsx` |
| A2 | **`<a>` dentro de `<a>`** (DOM inválido, dois alvos de clique, risco de erro de hidratação) | `HistoricoPage.tsx:116-122`, `ListaViewPage.tsx:274-279` envolvendo `MediaCard` (que já é link) | Remover o wrapper |
| A3 | **100% das rotas dinâmicas (0 prerenderizadas)** — `cookies()` no layout de locale anula o `revalidate = 3600` da home | `.next/prerender-manifest.json` com 4 rotas técnicas | **Investigado em D-585 e a causa acima foi REFUTADA**: remover o `cookies()` do shell não devolve pré-render (6 builds de evidência — AuthHeader fora, `locale`/`messages` explícitos, Sentry sem auto-instrumentação, `Suspense` no `useSearchParams`: todas seguem `ƒ`). Com layout mínimo o Next **tenta** pré-renderizar (falha só por falta do `QueryProvider`), logo o bloqueio está na composição do shell. Ficaram as 2 mudanças estritamente melhores (leituras de request fora do shell + `Suspense` no `DiagPanel`) e o método de bissecção validado. **Tarefa dedicada** (4-6 builds) ou PPR |
| A4 | **3 implementações divergentes do dial de score** (3 faixas `font-mono` vs 6 faixas `scoreColor` + glow) e **breakdown fictício `[40,40,20]` apresentado como Crítica/Público/Consenso** em `/settings` | `media-rate-ui/ScoreDial.tsx`, `media-rate-ui/StaticScoreDial.tsx`, `ui/score-dial.tsx:26,72-84` | Uma tabela de faixas; variante `animated={false}`; esconder breakdown sem dado. Decisão D-582.4 |
| A5 | **Cor de "público" divergente na mesma ficha**: âmbar `#F59E0B` (`Bar.tsx`) vs rose `#E11D48` (`CriticsVsAudienceBar`), enquanto o token declara `accent.audience = #E11D48` | `Bar.tsx:44,54,64` vs `CriticsVsAudienceBar.tsx:26,84` | Escolher o token e alinhar (decisão D-582.4) |
| A6 | **Sem estados por rota**: 0 `loading.tsx` em ~45 rotas, 0 `global-error.tsx`; throw no layout raiz cai na tela default do Next. Onde mais dói: `dashboard`, `catalog`, `biblioteca`, `historico`, `listas`, `media/[slug]`, `admin/*` | varredura de `app/**` | `loading.tsx` por segmento (reusar `CatalogSkeleton`) + `global-error.tsx`. Decisão D-582.5 |
| A7 | **Pós-cadastro sem SSR útil**: `/welcome` e `/verificar-email` nascem `opacity: 0` via `motion`/client → sem JS ficam **em branco** (a de verificação é ponto de entrada por e-mail) | `welcome/page.tsx:49-102`, `VerifyEmailClient.tsx:58-158` | SSR do texto base + animação CSS (contrato do hero) |
| A8 | **Ficha carrega o rung `original` do TMDB como backdrop** no ramo `<img>` (sem `sizes`/`fetchPriority`) | `MediaDetailPage.tsx:139-143`, `MediaDetailClient.tsx:162-174`, `lib/image-policy.ts:93` | `displaySrc(src, 1280)` + `sizes="100vw"` + `fetchPriority="high"` |
| A9 | **Grão de fundo é um filtro SVG vivo** (`feTurbulence` + `numOctaves=4` + 3 camadas `fixed` full-viewport por página); existe versão CSS morta com data-URI pré-rasterizado | `ui/layered-background.tsx:20-42` vs `globals.css:257-299` | Trocar pelo data-URI e apagar o CSS morto |
| A10 | **`design-tokens.ts` é 85% superfície morta** (17 de 20 exports sem importador) enquanto o código escreve ~2.190 hex | `lib/design-tokens.ts` | Consumir via classes utilitárias **ou** reduzir o arquivo ao que é usado |
| A11 | **52 strings PT hardcoded em JSX** (37 no admin) + **12 `alt` em PT** que vazam em EN/ES | `admin/metricas` (10), `admin/diagnostics` (7), `DesignSystemClient` (6), `MediaCard`/`MediaDetail*` (`Poster de …`/`Capa de …`), `SourceMiniCard`, `CatalogTypeBar`, `lazy.tsx` | Chaves i18n (`catalog.posterAlt`, `catalog.coverAlt`, `common.loadingCatalog`…) |
| A12 | **`/onboarding` é código morto** (privada no middleware, sem link de entrada, sem metadata, sem CTA) e `/top` é protótipo de tema claro | `app/[locale]/onboarding/page.tsx`, `TopPageClient.tsx` | Aposentar `/onboarding`; reescrever `/top` com tokens. Decisão D-582.6 |

---

## 7. Achados abertos — médios

| # | Achado | Evidência |
|---|---|---|
| M1 | **Nenhum gate cobre o admin**: sem `/admin` no axe, `design:visual` só visita a home, e os 3 configs Playwright forçam `colorScheme: "dark"` — a regressão crítica (B1) passa em CI verde | `playwright*.config.ts`, `e2e/a11y.spec.ts`, `visual-qa.mjs` |
| M2 | **`contrast-aa.spec.ts` cobre 3 hex de token** e não vê os literais em JSX (nem `#11111b`, `#0b0b12`) | `test/contrast-aa.spec.ts` |
| M3 | **`prefers-reduced-motion` fragmentado**: 7 componentes leem `matchMedia` uma única vez (não reativos); só 4 usam o hook canônico | `Navbar`, `Logo`, `MediaScoreBadge`, `CatalogSkeleton`, `CategoryIconRow`, `ui/text-marquee`, `ui/vertical-marquee` |
| M4 | **Anima propriedades de layout**: altura do Navbar (`h-14`↔`h-16`), underline por `width` no footer e `transition-[width] duration-700` (acima do orçamento de 300ms) | `Navbar.tsx:78,87`, `MotionFooter.tsx:5`, `CriticsVsAudienceBar.tsx:75,92` |
| M5 | **`transition-all` em 18 pontos** ainda (o botão base foi corrigido) | `Navbar` (3), `PricingCards` (2), `HeroSection`, `settings` (2), `VerifyEmailClient` (2), `DiscoveriesFeed`, `DashboardOverview` |
| M6 | **10 usos de `100vh` e zero `dvh`** → salto de layout com a barra dinâmica do mobile | `globals.css:73`, `app/layout.tsx:47`, `not-found`, `[locale]/layout`, `login`, `register`, `welcome`, `billing/success`, `DashboardSidebar`, `CatalogPageClient` |
| M7 | **61 textos abaixo de 12px** (50 no dashboard), contra o piso documentado | `DashboardOverview.tsx`, `WatchlistClient.tsx` |
| M8 | **Admin: 4 tabelas sem `scope="col"`**; **5 fluxos destrutivos** com `window.prompt`/`confirm` (sem i18n, sem foco, sem `aria`); **busca sem debounce** (1 request por tecla) | `admin/usuarios`, `admin/auditoria`, `admin/lgpd`, `admin/catalogo`, `admin/diagnostics` |
| M9 | **Admin: `/admin/upload` é rota órfã** (sem link no `AdminShell`), usa `fetch` cru em vez de `lib/http` e não lista `comic`/`manga` | `admin/upload/page.tsx` |
| M10 | **Admin: painel LGPD mostra "0 registros" falsos** enquanto carrega (sem early-return) e datas com `toLocaleString("pt-BR")` fixo | `admin/lgpd/page.tsx:93-209,163`, `admin/auditoria/page.tsx:143` |
| M11 | **`toLocaleString("pt-BR")` fixo** em telas admin → data em PT nos 3 locales | idem |
| M12 | **Dashboard sem `aria-live`** em resultado de sorteio/cópia/"carregar mais"; dialogs artesanais sem focus trap (`StatusReactionControl`, `SearchCommand`) mesmo com `@radix-ui/react-dialog` já instalado | `WatchlistClient.tsx:88-93`, `ProfileContent.tsx:146`, `StatusReactionControl.tsx:183,270`, `SearchCommand.tsx:243` |
| M13 | **`/settings` exibe números de plano digitados** (`7.9`/`9.4`) e o dial cai em barras fictícias; perfil monta link com locale fixo `pt-BR` e `window.location.origin` | `settings/page.tsx:15-19,111-117`, `ProfileContent.tsx:133,140` |
| M14 | **FAQ em 3 fontes distintas** (accordion do pricing, literais da home, cards do `/faq`) e **3 tamanhos de H1** nas 5 páginas institucionais (com alinhamento centrado vs à esquerda) | `PricingFAQ.tsx`, `HomeContentSections.tsx:223-267`, `faq/page.tsx`, `about/faq/sources/methodology` |
| M15 | **Chaves i18n órfãs (46+ amostradas)** — inclusive OAuth removido (`auth.continueWithGoogle/Apple`) e `landing.feature*`; o `i18n-leak.spec.ts` ainda **exige** as strings de OAuth que não existem mais | `messages/*.json`, `test/i18n-leak.spec.ts:15-61` |
| M16 | **Condições de 404/erro tratadas igual a falha de rede**, sem retry, em listas/watchlist/perfil (`if (error \|\| !lista)`) | `ListaViewPage.tsx:134-141`, `ListasPage.tsx:51-54`, `ProfileContent.tsx:58` |
| M17 | **`aria-label`/`alt` em PT** e `role="status"` ausente em mudanças assíncronas | ver A11 |

---

## 8. Achados abertos — baixos

- **`PricingTable` usa `"✓"` como glifo** de "incluído" (leitor de tela lê "check mark") → `Check` do Lucide + `sr-only`.
- **`/pricing` mistura `font-display`, `text-gray-100/200/400` e `surface-*`** com os tokens canônicos.
- **`/pricing` com loop de canvas sem gate** — corrigido; resta `next.config.ts` só anunciar `webp` (sem `avif`).
- **`layered-background`** (A9) e **9 `<Image>` sem `sizes`** em `dashboard/DiscoveriesContent.tsx` (40×56 fixos).
- **`aria-label="Breadcrumb"` em PT** na ficha (`MediaDetailClient.tsx:186`, `MediaDetailPage.tsx:115`).
- **CTA sticky do mobile usa dial de 32px** (`WatchlistButton` `h-8 w-8`) — abaixo dos 44px.
- **`LocaleSwitcher` com alvos de ~24px** e sem `aria-expanded`/`aria-haspopup`.
- **404 com "404" em `<p aria-hidden>`** e dois `not-found.tsx` divergentes, sem CTA de catálogo.
- **Dead code**: `Seasons.tsx`, `MediaRail.tsx`, `MovieDetailWrapper.tsx`, `GameDetailWrapper.tsx`, `ComingSoonRails.tsx`, `landing/ScoreShowcase.tsx`, `LgpdBanner.tsx` (**nunca montado** — checar compliance), 5 ícones SVG ad-hoc (`media-rate-ui/icons/*`, maior fonte de `#FFFFFF` do repo), `lib/motion.ts`, `lib/micro-interactions.ts`, `lib/premium-effects.ts`, `.layered-bg`/`.spotlight` no CSS (43 linhas), metade de `components/lazy.tsx`, barrel `media-rate-ui/index.ts` (40 exports, 1 importador).
- **Duplicação de className**: `HomeContentSections` repete o mesmo h3 22× e h2 8×; `DashboardOverview` repete a classe de card 11×; `admin/metricas` repete o título 8× → extrair `SectionTitle`/`Card`.
- **`/terms` e `/privacy`**: `<th>` sem `scope="col"` nas tabelas de pipe (as 2 públicas — corrigidas; sobram as do admin).

---

## 9. Decisões — tomadas e implementadas (D-583)

> O Operador delegou as decisões ("tome as decisões que melhor beneficiem o projeto").
> Cada item abaixo está **decidido e implementado**, exceto o que diz o contrário.
> Registro completo com justificativa: **D-583** em `DECISOES.md`.

| # | Decisão tomada | Estado |
|---|---|---|
| D-582.1 | **`darkMode: "class"`** (1 linha) + harness visual passando a rodar em `colorScheme: "light"` como gate; migração do admin para tokens fica agendada | ✅ implementado e verificado no CSS compilado (`.dark\:bg-gray-800` presente, `prefers-color-scheme` ausente) |
| D-582.2 | **Convergir o dashboard por partes** (não big-bang): AA dos `text-white*` e `rounded-2xl` → `rounded-lg` feitos; quebra em componentes antes de tokenizar | 🟡 parcial (o que era defeito visível está corrigido) |
| D-582.3 | **Manter `/feedback`, tornar honesto e alcançável**: i18n ×3, `Star` do Lucide, envio por `mailto` real, link no menu de conta | ✅ implementado |
| D-582.4 | **`scoreColor()` como única fonte de faixas** (tabelas locais removidas) + breakdown fictício removido + "público" no token rose (número em `#FB7185` por AA) | ✅ implementado (unificar a linguagem visual dos 3 dials segue) |
| D-582.5 | **Um `loading.tsx` no segmento `[locale]`** (`RouteSkeleton`) + `global-error.tsx` com a marca | ✅ implementado (skeletons por segmento ficam como polimento) |
| D-582.6 | **Aposentar `/onboarding`** (rota + 10 chaves × 3 locales + middleware) e **consertar `/top`** (consertado pela decisão 1) | ✅ implementado |
| D-582.7 | **Token `text.onBrand = #FFFFFF` com escopo** + exceção registrada ao D-065, com guarda que prova que a exceção ainda é necessária | ✅ implementado |
| D-582.8 | **Manter `/admin/upload`** (linkar no shell, tipos de `CATEGORY_TOKENS`, `lib/http`) e **consolidar a remoção de mídia no catálogo** | ⛔ bloqueado (arquivos em edição pelo outro agente) — decisão tomada |
| D-582.9 | **Não podar as chaves órfãs agora**: há lookups dinâmicos (`t(key as never)`) e o ganho é nulo; ficam reservadas | ✅ decidido (com a dívida do `i18n-leak.spec.ts` registrada) |
| D-582.10 | **Não apagar `LgpdBanner.tsx`** e escalar como questão de compliance (apagar banner de consentimento é decisão jurídica) | ⛔ fica com o Operador |

Decisões adicionais: `alt` em pt-BR → i18n (`catalog.coverAlt`/`posterAlt`), rung de display +
`fetchPriority` no backdrop da ficha, `100vh` → `dvh`, e remoção do `<a>` dentro de `<a>` em
Histórico e Listas.

---

## 10. Backlog priorizado (após D-583 e D-584)

**Feito em D-583:** B1 (admin `darkMode: "class"`), B5 (`/feedback` honesto), A2
(`<a>` dentro de `<a>`), A4/A5 (dial canônico + cor de público + fim do breakdown fictício),
A6 (loading + global-error), A8 (rung do backdrop), A11 (`alt` em pt-BR), A12 (`/onboarding`
aposentado), M6 (`dvh`), M15 parcial.

**Feito em D-584:** B4 (feedback de ação com toast + **Desfazer** na watchlist e nas listas),
A1 (gate de sessão: 307 do servidor em vez de 5-6s de "Verificando sessão..."), A11 pública
(`SourceMiniCard`, `CatalogTypeBar`, `lazy.tsx`, `/assistant`), M3 (`matchMedia` → hook
canônico em 6 componentes), M4/M5 (`transition-all` 17 → **0**; animação de altura do Navbar
removida), M17 (`/settings` sem número inventado), `sizes` nos 9 `<Image>` do dashboard,
**gate `design:hex`** (55 valores legados congelados; hex novo → exit 2), e limpeza de 15
arquivos de dead code + CSS morto.

**Feito em D-585/D-586:** A3 **investigado** (causa da auditoria refutada por 6 builds; ficaram
as 2 mudanças sem custo e o método de bissecção) e **B3 atacado**: `DashboardOverview` quebrado
(1.757 → 1.464 linhas + 8 componentes em `dashboard/overview/`) e a paleta paralela declarada
em um módulo único — **−262 ocorrências** de cor fora de token (55/972 → 35/710), sem mudar
pixel.

**P0 — aberto**
1. **B2** `text-gray-500` → `#9CA3AF` no admin (36) — *bloqueado: arquivos do outro agente*
2. **B3** Dashboard — **atacado em D-586**: helpers extraídos (1.757 → 1.464 linhas) e a paleta
   legada declarada uma única vez (`lib/dashboard-palette.ts` + tema), com **−262 ocorrências**
   de hex fora de token medidas pelo gate. Falta o passo final: migrar `dash-*` → tokens
   canônicos tela a tela, o que pede **baseline visual autenticado** (hoje inexistente)

**P1 — aberto**
3. **A3** ISR das rotas públicas — **investigado em D-585**: causa da auditoria refutada por
   experimento; bloqueio está na composição do shell, precisa de bissecção dedicada (4-6 builds)
   ou PPR. As duas mudanças sem custo já entraram (leituras de request fora do shell +
   `Suspense` no `DiagPanel`)
4. **A11 restante** 52 strings PT em JSX (37 no admin) + `aria-live` em mudanças assíncronas
5. **M1/M2** incluir `/admin` no axe (exige `storageState` de admin) e estender a checagem de
   contraste aos literais de JSX (hoje cobertos só pelo congelamento do `design:hex`)
6. **A7** `/welcome` e `/verificar-email` com base SSR (hoje nascem em `opacity: 0`)

**P2 — aberto**
7. **M8–M14**: admin (i18n, `scope="col"`, dialogs nativos, debounce, `/admin/upload`) — *bloqueado*
8. **M13/M14** `/settings` e FAQ em 3 fontes; **M16** retry nos estados de erro
9. **A9/A10** grão de fundo por data-URI; consumir ou reduzir `design-tokens.ts`; barrel
   `media-rate-ui` (40 exports, 1 importador)
10. **D-582.10** `LgpdBanner` (compliance, com o Operador); `image/avif` (policy travada por D-445)

---

## 11. Cegueiras de gate (o que passa verde hoje)

1. **Admin inteiro** não é visitado por nenhum gate (axe, visual ou contraste) e os configs Playwright forçam `colorScheme: "dark"` → B1/B2 passam.
2. **`contrast-aa.spec.ts` valida tokens, não o que o código escreve** (3 hex contra literais em JSX).
3. **Não existe regra de lint contra hex novo** — `design:detect` é advisory.
4. **`i18n-leak.spec.ts` cobre 5 rotas** (`/register`, `/catalog`, `/privacy`, `/login`, `/terms`) e valida chaves, não texto hardcoded em JSX → todo o A11 passou.
5. **`i18n-guard.spec.ts` não detecta chave órfã** (e hoje exige chaves de OAuth removido).
6. **Nenhum teste roda com `prefers-reduced-motion: reduce`** na suíte de unidade (o harness visual emula, mas só a home) — foi assim que o mismatch de `/billing/success` sobreviveu.
7. **Nenhum teste de metadata por rota** → `/login` indexável, `/onboarding` sem metadata e `/checkout` em PT passaram.

---

## 12. Comandos de verificação

```bash
# fonte (0 achados hoje)
npm run design:detect
# AA dos tokens (51/51 hoje)
npm run design:contrast
# DOM renderizado de uma rota (exige dev server)
node node_modules/impeccable/cli/bin/cli.js detect http://localhost:3000/pt-BR/pricing --json
# screenshots + overflow + axe
npm run design:visual -- --locales pt-BR,en-US,es-ES --axe
# regressão visual por pixel (baseline local, fora do CI)
npm run test:visual:update --workspace apps/web && npm run test:visual --workspace apps/web
# suíte
npm test --workspace apps/web && npm exec --workspace apps/web --no -- tsc --noEmit
```

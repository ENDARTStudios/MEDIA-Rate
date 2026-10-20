# UI-UX por sessão — MEDIA Rate (índice)

Especificação de UI-UX **de todas as sessões da plataforma**, ancorada no código que existe hoje.
Não é um conceito novo: a linguagem visual atual é a base (tokens de `apps/web/src/lib/design-tokens.ts`,
dark-only, Space Grotesk/Inter/JetBrains Mono). O que estas specs fazem é **fechar** cada sessão:
arquitetura de informação, estados obrigatórios, movimento, acessibilidade AA, copy nos 3 locales,
responsivo e as pendências medidas.

- **Template obrigatório:** [`01-TEMPLATE.md`](./01-TEMPLATE.md)
- **Regra de ancoragem:** todo bloco cita o componente real (`arquivo:linha`) e todo token citado existe
  em `design-tokens.ts`. Onde não existe implementação, a spec marca **A CRIAR**.
- **Evidência visual:** `docs/02-architecture-design/evidencias/ui-ux-<sessão>/{1440,375}.png`.
- **Origem das pendências:** `AUDITORIA-UI-UX-2026-10.md` (canônica) +
  `AUDITORIA-VISUAL-2026-10-13.md` (medida no DOM) + `evidencias/auth-2026-10-15/` (admin) + `DECISOES.md`.

## Situação real (levantada do código, 2026-10-15)

44 rotas com `page.tsx` existem hoje. A coluna **Estado** diz o que a spec vai encontrar:

| # | Sessão | Rotas reais | Estado | Spec |
|---|---|---|---|---|
| 1 | Catálogo | `/catalog` | existe | [10-catalogo.md](./10-catalogo.md) |
| 2 | Rankings | `/top` | existe | [11-rankings.md](./11-rankings.md) |
| 3 | Planos (vitrine) | `/pricing` | existe | [12-planos.md](./12-planos.md) |
| 4 | MEDIA Score | `/methodology`, módulo em `/media/[slug]` | existe (sem rota própria) | [13-media-score.md](./13-media-score.md) |
| 5 | Dashboard (área do usuário) | `/dashboard`, `/dashboard/discoveries` | existe | [14-dashboard.md](./14-dashboard.md) |
| 6 | Minha Biblioteca | `/biblioteca` | existe | [15-biblioteca.md](./15-biblioteca.md) |
| 7 | Metas e Evolução | — | **A CRIAR** (hoje só `/historico`) | [16-metas-evolucao.md](./16-metas-evolucao.md) |
| 8 | Planos e Assinaturas | `/checkout/[plan]`, `/billing/success`, assinatura em `/settings` | existe (espalhado) | [17-assinaturas.md](./17-assinaturas.md) |
| 9 | Login/Cadastrar | `/login`, `/register`, `/welcome`, `/verificar-email` | existe | [18-auth.md](./18-auth.md) |
| 10 | Admin | `/admin` + 7 subrotas | existe (**criar/elaborar**) | [19-admin.md](./19-admin.md) |
| 11 | Busca Avançada | — (hoje ⌘K + filtros do catálogo) | **A CRIAR** | [20-busca-avancada.md](./20-busca-avancada.md) |
| 12 | Watchlist | `/watchlist` | existe | [21-watchlist.md](./21-watchlist.md) |
| 13 | Descoberta | `/discover`, `/discoveries`, `/dashboard/discoveries` | existe (3 entradas) | [22-descoberta.md](./22-descoberta.md) |
| 14 | Listas | `/listas`, `/listas/[slug]` | existe | [23-listas.md](./23-listas.md) |
| 15 | Perfil | `/profile`, `/user/[id]` | existe (público + próprio) | [24-perfil.md](./24-perfil.md) |
| 16 | Configurações | `/settings`, `/user/data` | existe | [25-configuracoes.md](./25-configuracoes.md) |
| 17 | Legal — Sobre Nós | `/about` | existe — **feita** | [30-legal-sobre.md](./30-legal-sobre.md) |
| 18 | Legal — Planos | `/pricing` (aspectos legais da oferta) | existe parcialmente | [31-legal-planos.md](./31-legal-planos.md) |
| 19 | Legal — Metodologia | `/methodology`, `/sources` | existe — **feita** | [32-legal-metodologia.md](./32-legal-metodologia.md) |
| 20 | Legal — Privacidade | `/privacy` | existe — **feita** | [33-legal-privacidade.md](./33-legal-privacidade.md) |
| 21 | Legal — Termos de Uso | `/terms` | existe — **feita** | [34-legal-termos.md](./34-legal-termos.md) |
| 22 | Legal — Cookies | — | ****criada** em `/cookies` (D-622)** (hoje só o banner) | [35-legal-cookies.md](./35-legal-cookies.md) |
| 23 | Legal — Segurança | — | ****criada** em `/seguranca` (D-622)** | [36-legal-seguranca.md](./36-legal-seguranca.md) |
| 24 | Legal — Direitos do Titular | `/user/data` é interno do produto | ****criada** em `/direitos-do-titular` (D-622)** (público) | [37-legal-direitos-titular.md](./37-legal-direitos-titular.md) |
| 25 | Legal — Gerenciar Cookies | — (banner tem "Gerenciar") | ****criada** em `/cookies/gerenciar` (D-622), com o componente `ConsentPreferences`** | [38-legal-gerenciar-cookies.md](./38-legal-gerenciar-cookies.md) |

## Rotas existentes que não estão na lista do pedido

Ficam registradas para não virarem órfãs na especificação (cada uma aparece na spec da sessão a que
pertence, quando fizer sentido): `/` (home), `/about`, `/assistant`, `/compare`, `/design-system`,
`/faq`, `/feedback`, `/game/[id]`, `/historico`, `/media/[slug]`, `/movie/[id]`, `/sources`,
`/user/data`, `/verificar-email`, `/welcome`.

## Ordem de execução (prioridade declarada pelo Operador)

1. Catálogo · 2. Rankings · 3. Planos · 4. MEDIA Score · 5. Dashboard · 6. Minha Biblioteca ·
7. Metas e Evolução · 8. Planos e Assinaturas · 9. Login/Cadastrar · 10. Admin · 11. Busca Avançada ·
12. Watchlist · 13. Descoberta · 14. Listas · 15. Perfil · 16. Configurações · depois os 9 legais.

## Convenções transversais (valem para todas as specs)

- **Números:** sempre `formatarScoreLocale` (`@/lib/score-utils`) — pt-BR usa vírgula. Scores têm duas
  escalas reais: **0–100** (games, temporadas/episódios) e **0–10** (demais) — a spec da sessão deve
  dizer qual usa e onde (D-602, BETA-GAP-09).
- **Cor de score:** sempre `scoreColor()`/`CATEGORY_TOKENS` — nunca hex solto (D-582.4).
- **Movimento:** `MotionConfig reducedMotion="user"` no layout; valor que depende de reduced motion
  **não decide markup** (gate `test/reduced-motion.spec.tsx`, D-587/D-603).
- **Contraste:** pares de token em `npm run design:contrast` (221 pares) **e** literais no JSX.
- **Hex:** `npm run design:hex` — valor novo exige `--update` + justificativa (D-584).
- **Estado de erro:** 404 é estado honesto; falha de rede tem **retry** (D-603, M16).
- **i18n:** 3 locales com paridade de chaves; texto PT em EN/ES falha o gate (D-604).

## Progresso

**FEITO: 25 de 25** — as 16 sessões de produto e as 9 legais estão especificadas, cada uma com as 12
seções do template, ancoragem em `arquivo:linha`, evidência 1440/375 (ou o estado atual que representa a
sessão, quando a página ainda não existe), a11y AA e pendências com severidade e dono.

| # | Sessão | Spec | Achados |
|---|---|---|---|
| 1 | Catálogo | [10-catalogo.md](./10-catalogo.md) | 10 pendências (6 requisições paralelas, vermelho fora de token, sem offline) |
| 2 | Rankings | [11-rankings.md](./11-rankings.md) | 9 pendências (miniaturas `<img>` sem dimensão + `h-18` inexistente, erro sem retry, selo amber default) |
| 3 | Planos | [12-planos.md](./12-planos.md) | 5 pendências (hex literal nos CTAs, sem transição de período, duplicação de FAQ sem regra) |
| 4 | MEDIA Score | [13-media-score.md](./13-media-score.md) | 5 pendências, incluindo **4 dials de score diferentes** (A4) com nome e endereço |
| 5 | Dashboard | [14-dashboard.md](./14-dashboard.md) | 8 pendências, com **P0**: sessão válida e UI de visitante em `/dashboard` (store cliente não hidrata) — alcance exato medido: 5 rotas hidratam × 5 não |
| 6 | Minha Biblioteca | [15-biblioteca.md](./15-biblioteca.md) | 6 pendências; **padrão de referência** de a11y de filtros (`tabsAria`/`tiposAria`) e rótulos de status conjugados por tipo |
| 7 | Metas e Evolução | [16-metas-evolucao.md](./16-metas-evolucao.md) | **A CRIAR**: hoje o menu "Metas e evolução" entrega `/historico` (histórico com limite de plano). Decisão de produto pendente + dependência em `apps/api` para metas |
| 8 | Planos e Assinaturas | [17-assinaturas.md](./17-assinaturas.md) | 9 pendências: **texto pt-BR hardcoded** no erro do checkout, F5 no checkout manda logado para o login (P0 do store), sucesso pode confirmar sem checar pagamento |
| 9 | Login/Cadastrar | [18-auth.md](./18-auth.md) | 6 pendências: **`/login` e `/register` sem `h1`**, rate limit (429) sem tratamento, placeholder de senha parece valor preenchido; sem rota de recuperação de senha |
| 10 | Admin | [19-admin.md](./19-admin.md) | **Report-only** (arquivos de outro agente): 15 `<th>` sem `scope`, 4 telas reprovando AA (15 nós, com contraste medido), `<dl>` inválido, rótulos hardcoded em pt-BR e **acesso admin não determinístico** (o `test:auth` não é reprodutível hoje) |
| 11 | Busca Avançada | [20-busca-avancada.md](./20-busca-avancada.md) | **A CRIAR** sobre duas superfícies existentes (paleta ⌘K + filtros do catálogo). P1: paleta sem semântica de diálogo/lista e as duas superfícies não conversam |
| 12 | Watchlist | [21-watchlist.md](./21-watchlist.md) | 6 pendências: texto pt-BR hardcoded no store, drag sem alternativa de teclado (a confirmar), 402 sem CTA. **Refutada** a suspeita de skeleton infinito |
| 13 | Descoberta | [22-descoberta.md](./22-descoberta.md) | 6 pendências: 3 rotas para a mesma intenção (sem hierarquia) e `/discoveries` sem guard. **Dois padrões de referência:** máquina de estados do `DiscoverClient` e política de imagem do `DiscoveriesFeed` |
| 14 | Listas | [23-listas.md](./23-listas.md) | 6 pendências: 402 sem CTA, exclusão sem `confirm-dialog` confirmado. **404 honesto separado de erro de rede** (D-603) é o padrão do produto para essa distinção |
| 15 | Perfil | [24-perfil.md](./24-perfil.md) | 6 pendências: erro sem retry, 404 do perfil público a confirmar, gráficos sem alternativa textual; dois vazios distintos e estatística derivada de dado real |
| 16 | Configurações | [25-configuracoes.md](./25-configuracoes.md) | 5 pendências, com **P1 confirmado**: `window.confirm` + 3 `alert()` no cancelamento; e `/user/data` (dados pessoais) **sem guard** |

**Padrões de referência já identificados** (usar como exemplar nas demais specs, em vez de inventar):

- `section` + `aria-labelledby` + `h2` sem pular nível — Catálogo (`CatalogTypeSections.tsx:86-88`)
  e estrutura completa do Rankings;
- `<nav aria-label>` + `aria-current="page"` nos chips de tipo — Rankings (`TopPageClient.tsx:103,113`);
- `<ol>` para ranking ordenado — Rankings (`:193`), com a posição como semântica, não só `w-8`;
- `<th scope="col">` em tabela comparativa — Planos (`PricingTable.tsx:37,43`) — **é o padrão que falta
  no Admin** (achado do `test:auth`, D-605);
- `aria-pressed` em toggle de período — Planos (`PricingCards.tsx:56`);
- `<ul role="list">` para listas cujo reset do Tailwind remove semântica — Planos (`:150`);
- máquina de estados completa (skeleton, rate-limit com retry, erro sem/com dados, `aria-live`) —
  Catálogo (`CatalogPageClient.tsx:126-259`).

', na ordem declarada. Sessões autenticadas (Dashboard, Biblioteca, Assinaturas,
Watchlist, Listas, Perfil, Configurações) precisam do `--state` do `test:auth` para a captura — a
receita está em `docs/02-architecture-design/evidencias/auth-2026-10-15/README.md` (D-605).
## Resultado do programa

| Bloco | Sessões | Estado |
|---|---|---|
| Produto | 16 | **especificadas** (1–16) |
| Legal | 9 | **especificadas E implementadas** (17–25) — as 4 de criação (Cookies, Segurança, Direitos do Titular, Gerenciar Cookies) existem desde o D-622, com entrada no rodapé e no sitemap |

**Pendências que dependem de decisão do Operador** (registradas nas specs e em `DECISOES.md`): P0 do store de
sessão (5 rotas), acesso admin não determinístico (`test:auth` não reprodutível), gate de i18n que não varre
literais, canal de contestação de nota do MEDIA Score, declaração de reembolso/reajuste na oferta, prazo de
resposta e contato do encarregado (LGPD), e a consolidação dos 4 dials de score.

## Balanço definitivo das 143 pendências

Todas as pendências das 25 sessões têm **disposição registrada**. O que segue aberto está aberto por um
motivo nomeado — não por falta de diagnóstico.

| Disposição | Quantos | O que é |
| --- | --- | --- |
| **Corrigido no código** | 34 | P0 do store de sessão (D-619); diálogos nativos em settings/listas/admin (D-619/D-623); gate de i18n + vazamento em primitivo compartilhado (D-620); 4 dials de score → 2 (D-621); as 4 páginas legais + gerenciador de cookies (D-622); contraste, `scope`, `<dl>`, shell e 28 rótulos do admin (D-623); 199 classes do admin para tokens (D-625); `h1` do auth, `security.txt`, watchlist i18n, gate da descoberta, `aria-current` (D-626); Rankings `h-18`, erro de auth inline + 429, checkout i18n, CTA do 402 (D-627); perfil 404 × falha, sucesso de pagamento honesto, kanban com teclado (D-628); **paleta ⌘K combobox/listbox, aviso global de conexão, selo do hero, placeholder de senha** (D-629) |
| **Verificado OK — diagnóstico anterior era meu erro** | 12 | tablist da biblioteca com contagem no nome acessível; alternativa textual dos gráficos (3 sessões); CTA do 402 no `/listas` (existia desde D-603); paleta com diálogo/Escape/foco; `alt` decorativo + `aspect` do pôster; histograma com valor em texto; `CatalogSkeleton` no `/historico`; `ProtectedPage` no `/settings` |
| **Concluído por uma decisão única** | 15 | "sem estado offline" em 7 sessões = **uma** decisão implementada no layout (D-629) |
| **Migração mecânica ampla, impacto visual zero** | ~20 | 647 literais de cor idênticos aos tokens (`text-[#A0A0B8]`, `text-[#F5F5F7]`) e equivalentes em arquivos legados. PR dedicado, com a lição do D-625 de conferir o **CSS gerado** |
| **Decisão do Operador** | ~10 | Redação de reajuste/reembolso e prazo de resposta a relatos (**minutas prontas**, D-626); convergência das 3 rotas de descoberta; rótulo "Metas e evolução"; modelo de metas em `apps/api`; processo da tabela de cookies |
| **Polimento aceito conscientemente** | ~52 | `loading.tsx` por rota, atalho de teclado para filtros, animação do "carregar mais", skeleton em vez de texto em duas telas, padrão único de estados nas telas tabulares, desfazer em remoções. Ganho marginal, custo de manutenção não trivial — **registrados, não esquecidos** |

**Gates ao fim:** `tsc` 0 · `eslint` 0 · `vitest` **624/624** · `test:hydration` **36/36** · `build` 0 ·
`design:contrast` AA · `design:hex` OK · `design:detect` 0 · `i18n:source` OK.

### Nota de método

Ao longo do programa, **nove** P1 que eu havia registrado caíram na verificação — o último foi "a paleta não
tem semântica de diálogo" (tinha). Cada um foi corrigido **na spec**, não só no balanço: uma spec que afirma
problema inexistente é tão danosa quanto uma que esconde problema real.

## Proposta de conceito (fora das 25 sessões)

- **[Conceito v1 — Catálogo](./48-conceito-catalogo.md)** **(novo, FigCraft)**: página desenhada inteira (1440), dobra e drawer no 375 e os quatro estados; grade do produto (112..1328), sidebar `w-60` sticky, 5 colunas em 1440 e 2 em 375, contagem do recorte no rodapé da sidebar e os P1 de acessibilidade (chip com estado, `Esc`/foco no drawer, alvos 44/48) resolvidos no desenho · artefatos em `figcraft/conceito-catalogo/`

- **[Conceito v9/v10 — Home](./47-conceito-v9-home.md)** **(vigente)**: CTA novo, grade do produto (112..1328), seletor de idioma, **6 carrosséis (um por mídia)** e rodapé completo — ver seção 8: CTA novo, sistema de alinhamento, seletor de idioma, carrosséis por tipo e rodapé completo · [v8.2](./46-conceito-v8-home.md): tile **reproduzido do original** (raio 22, borda a 26%, fundo a 9%, traço 1.6) + símbolo de 62 px + efeito Dock — D-639: símbolo de 86 px **sem caixa** (o símbolo ocupa o footprint do `--tile` original) + efeito Dock — causa raiz da escala no D-638: símbolo em 85% da caixa (o símbolo cresce, a caixa não) + efeito Dock — spec em [v7](./45-conceito-v7-home.md): símbolos maiores na caixa + **efeito Dock** de aproximação (storyboard em `icones-dock.png`) · [v6](./44-conceito-v6-home.md): os 6 ícones primários + selo animado percorrendo a escala, sincronizado com a régua (storyboard em `selo-estados.png`) · [v5](./43-conceito-v5-home.md): os 6 ícones como elemento PRIMÁRIO, centrados; o selo de score desce para a régua · [v4](./42-conceito-v4-home.md): base no v2 (escolha do Operador) + os 6 ícones canônicos como filtros de tipo + movimento especificado para régua e ícones · alternativas: [v3](./41-conceito-v3-home.md) (assimétrico) e [v2](./40-conceito-v2-home.md) (histórico) (evolução do v2, ancorada no hero decidido e nos
  anti-padrões do projeto) · histórico: [v2](./40-conceito-v2-home.md) — proposta de linguagem visual, ancorada nos tokens do
  produto e desenhada no **FigCraft** (`docs/02-architecture-design/figcraft/conceito-home/`). É proposta,
  não substituição: a linguagem atual continua valendo até aprovação explícita.

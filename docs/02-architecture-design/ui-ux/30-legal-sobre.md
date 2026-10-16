# UI-UX — Legal: Sobre Nós (`/about`)

> Sessão **17 de 25** (a 1ª das 9 legais). Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-legal-sobre/{1440,375}.png`.

## 1. Identidade da sessão

- **Objetivo do usuário:** entender **o que é** o MEDIA Rate, **o que não é** e de onde vêm os dados — antes
  de confiar no score ou pagar por um plano.
- **Persona:** público, incluindo quem chega por link de terceiro/imprensa e quer verificar a idoneidade.
- **Rota:** `/about` (server component, 200 linhas). Indexável.
- **Entradas:** rodapé ("Sobre"), home, e-mail institucional.
- **Saídas:** `/methodology` (como o score é calculado), `/sources` (as fontes), `/pricing`, `/faq`.
- **Fora de escopo:** Metodologia (sessão 19), Termos (21), Privacidade (20).

## 2. Arquitetura de informação

Server component com seções `h2` e **`ScrollReveal`** por bloco (`about/page.tsx:4,74-81`).

| # | Bloco | Chave |
|---|---|---|
| 1 | `h1` + lead (medida `max-w-[34rem]`, `text-lg`) | `title`, `lead` (`:68-70`) |
| 2 | **O que é** | `whatIsTitle` / `whatIsBody` (`:76-79`) |
| 3 | **O que NÃO é** (cartão destacado) | `whatIsNotTitle` (`:83-85`) |
| 4 | Categorias cobertas | `categories*` |
| 5 | Como funciona | `howItWorksBody` |
| 6 | Transparência | `transparencyBody` |
| 7 | Idiomas/SEO | `languagesBody` |
| 8 | Roadmap | `roadmapBody` |

## 3. Layout, grid e densidade

- Coluna única de leitura; **medida de linha corrigida no D-603** (`max-w-[38rem]` nos parágrafos e
  `max-w-[34rem]` no lead) — é o padrão de leitura do produto para texto longo.
- O bloco "O que NÃO é" é um **cartão** (`bg-[#12121C] border … rounded-lg p-8`, `:83`) — hierarquia visual
  correta para a informação mais importante da página.

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Texto | `text.primary` / `text.secondary` | títulos e corpo |
| Cartão | `colors.cb` `#12121C` | bloco "O que não é" |
| Borda | `surface.border` `#2A2A3D` | cartão |
| Movimento | `motion.presets` | `ScrollReveal` |

**Fora de token (P2):** o cartão usa **`border-[#1C1C2E]`** (`:83`) — valor que **não** é o token de borda
(`#2A2A3D`) e que ficou de fora da migração do D-604; e `text-[#A0A0B8]`/`text-[#F5F5F7]` literais
(`:70,76,84`).

## 5. Estados obrigatórios

| Estado | Situação |
|---|---|
| 1. Carregando | **não se aplica** — conteúdo estático renderizado no servidor |
| 2. Vazio | **não se aplica** — conteúdo editorial fixo |
| 3. Erro de rede | **não se aplica** — sem fetch no cliente |
| 4. Não encontrado | **não se aplica** |
| 5. Sem permissão | **não se aplica** — página pública |
| 6. Dados parciais | **não se aplica** |
| 7. Offline | **existe por consequência** — página estática funciona offline se em cache (bom) |

Esta é a única sessão do programa em que **os 7 estados legitimamente não se aplicam** (com motivo, como o
template exige): a página é conteúdo editorial servido pronto.

## 6. Micro-interações e movimento

- `ScrollReveal` por seção (`:74`) — transform/opacidade, com `prefers-reduced-motion` respeitado pelo
  componente e pelo `MotionConfig` global (gate verde).
- Sem animação em texto corrido além da entrada (correto: animar parágrafo atrapalha leitura).

## 7. Acessibilidade AA

- `h1` institucional padronizado (D-603: `text-3xl sm:text-4xl … text-fg-primary mb-8`) → `h2` por seção ✓
  sem pular nível.
- Links internos com rótulo textual ✓ (não há ícone solto).
- Contraste: tokens AA sob o gate; o `#1C1C2E` do cartão é o ponto a conferir junto com a correção do §4.
- Página sem formulário e sem diálogo → sem armadilha de foco.

## 8. Copy e i18n

- Namespace **`about`** (33 chaves de texto por locale, com paridade; `metaTitle/Description`, `og*` ✓).
- **D-603** reduziu o excesso de travessão de 8 para 2 por locale (o restante é o separador do `metaTitle`)
  — o detector não acusa mais `em-dash-overuse` ✓.
- **Nota de arquitetura de conteúdo (P2):** `/about` lê **mensagens i18n**, enquanto `/methodology` e
  `/sources` leem **`institutional-content.ts`** — duas fontes de verdade para o mesmo bloco de páginas
  institucionais. Não é bug hoje, é risco de divergência amanhã (o `AGENTS.md` exige consistência de texto
  legal entre Termos, Privacidade e rodapé).
- **A CRIAR:** data de "última atualização" (as páginas de Privacidade e Termos já têm `lastUpdated`; a
  Sobre não — e ela afirma cobertura de categorias e roadmap, que mudam).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | coluna única, cartão sem `-mx-2` visualmente estourado; medida de leitura já confortável |
| 768 | `max-w-3xl` centralizado |
| 1024+ | idem, com mais respiro entre seções |

## 10. Métricas de sucesso

- **Leitura até o fim** (profundidade de scroll) e **cliques para `/methodology` e `/sources`** — é o
  caminho de construção de confiança.
- **Taxa de rejeição de quem chega por link externo** (imprensa/parceiros).
- **Conversões que passam por `/about`** (contribuição indireta para assinatura).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| P2 | `border-[#1C1C2E]` fora do token de borda (`#2A2A3D`) — sobrou da migração D-604 | `about/page.tsx:83` | eu | D-584/D-604 |
| P2 | Literais `#A0A0B8`/`#F5F5F7` onde há `text-fg-*` | `:70,76,84` | eu | D-584 |
| P2 | **Duas fontes de conteúdo** para páginas institucionais (mensagens × `institutional-content.ts`) | `about/page.tsx:31-39` × `methodology/page.tsx:30,60` | eu | risco legal |
| P2 | Sem `lastUpdated` (as páginas legais têm) | ausência | eu | — |
| — | **Positivo a preservar:** medida de leitura do D-603, bloco "O que NÃO é" como cartão destacado (honestidade editorial), `ScrollReveal` discreto, `h1` padronizado e metadata/OG completos | `:68-85,31-42` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- legal-sobre=/about
grep -n "1C1C2E\|max-w-\[3\|<h2\|ScrollReveal" "apps/web/src/app/[locale]/about/page.tsx"
npm run design:detect; npm run design:hex
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-legal-sobre/{1440,375}.png`.

# UI-UX — Legal: Termos de Uso (`/terms`)

> Sessão **21 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-legal-termos/{1440,375}.png`.

## 1. Identidade da sessão

- **Objetivo do usuário:** conhecer as **regras de uso** do serviço, o que a assinatura inclui, limites de
  responsabilidade e como a relação se encerra — antes de aceitar no cadastro.
- **Persona:** público; e o usuário em **cadastro**, que aceita os termos (o aceite é coletado no fluxo de
  registro — ver `18-auth.md`).
- **Rota:** `/terms` (server, 89 linhas) — a **página mais curta** do bloco legal.
- **Entradas:** rodapé ("Termos"), checkbox de aceite no cadastro, e-mail.
- **Saídas:** `/privacy`, `/pricing`, contato.
- **Fora de escopo:** Privacidade (19), **Planos legais** (23 — condições comerciais da oferta), Cookies
  (22/25).

## 2. Arquitetura de informação

Server component com **seções geradas de lista** (`<section key={n}>`, `terms/page.tsx:79`) e JSON-LD.

| # | Bloco | Evidência |
|---|---|---|
| 1 | `h1` + **`lastUpdated`** | `:76` |
| 2 | Seções numeradas (`h2` + parágrafos) | `:79-80` |
| 3 | Dados estruturados (JSON-LD) | `:58,71` |
| 4 | Rodapé institucional | global |

## 3. Layout, grid e densidade

- Coluna de leitura, seções curtas — o documento é enxuto (89 linhas de página, com o texto vindo de i18n).
- **Atenção de conteúdo (não de layout):** sendo a página mais curta do bloco legal, é a que mais depende de
  o texto cobrir o essencial (aceite, planos, cancelamento, propriedade intelectual, lei aplicável). A spec
  **não** valida o mérito jurídico — apenas registra a estrutura e a responsabilidade editorial.

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Texto | `text.primary` / `text.secondary` | títulos e corpo |
| Fundo | `colors.bg` | página |

**Fora de token (P2):** `text-[#A0A0B8]` no `lastUpdated` (`:76`) — usar `text-fg-secondary`.

## 5. Estados obrigatórios

| Estado | Situação |
|---|---|
| 1–5. Carregando / vazio / erro / 404 / permissão | **não se aplicam** — documento estático no servidor |
| 6. **Dados desatualizados** | **existe** — `lastUpdated` (`:76`); risco: alteração de preço/plano sem
revisão do texto (ver §11) |
| 7. Offline | benefício do estático |

## 6. Micro-interações e movimento

Sem animação (correto para documento legal). O aceite acontece **no cadastro** (`AuthForm`), não aqui —
a página é referência, não formulário.

## 7. Acessibilidade AA

- `h1` institucional padronizado (D-603) + `h2` por seção, sem pular nível ✓.
- Documento longo de texto corrido: a leitura depende de **contraste** e de **medida de linha** — a medida já
  foi corrigida no padrão institucional (D-603); conferir se os parágrafos desta página usam o mesmo limite
  (`max-w-[38rem]`), porque texto jurídico em linha longa é o pior caso de leitura.
- Sem tabela, formulário ou diálogo → sem armadilha de foco.
- Links internos com rótulo textual ✓.

## 8. Copy e i18n

- Namespace **`terms`**: `metaTitle/metaDescription`, `ogTitle/ogDescription`, `lastUpdated`, `h1` + seções.
- **Achado de arquitetura de conteúdo (P2):** `/terms` e `/privacy` leem **mensagens i18n**, enquanto
  `/about`, `/methodology` e `/sources` leem **`institutional-content.ts`**. O `AGENTS.md` exige
  consistência de texto legal entre Termos, Política e rodapé — hoje essa consistência depende de disciplina
  humana em **duas** fontes diferentes. Recomendação: uma fonte só para o bloco legal (a mesma decisão que o
  D-603 tomou para o FAQ).
- **A CRIAR:** data de vigência + versão do documento (além de `lastUpdated`) e o registro de qual versão o
  usuário aceitou no cadastro (rastreabilidade do aceite).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | coluna única, medida confortável |
| 768+ | coluna de leitura centralizada com respiro |

## 10. Métricas de sucesso

- **Leitura antes do aceite** (tempo na página no fluxo de cadastro) — sinal de consentimento informado.
- **Cliques para Privacidade** a partir dos Termos (documentos que se leem em par).
- **Revisões do documento por ano** e **versão aceita** registrada (governança).
- **Contestações/atendimentos** que citam os Termos.

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P2 (risco legal)** | **Duas fontes de verdade** para o texto legal: Termos/Privacidade em i18n × About/Metodologia/Fontes em `institutional-content.ts` — a consistência exigida pelo `AGENTS.md` fica dependente de disciplina | `terms/page.tsx:34-42` × `methodology/page.tsx:30,60` | Operador + eu | D-603 (precedente) |
| P2 | JSON-LD montado com **`JSON.stringify` cru** (`dangerouslySetInnerHTML`), enquanto catálogo, FAQ, planos e metodologia usam **`serializeJsonLd`** (escaping seguro) — a única página legal fora do padrão | `terms/page.tsx:71` × `lib/json-ld.ts`, `components/StructuredData.tsx` | eu | — |
| P2 | Texto de `lastUpdated` sem obrigação de revisão quando preço/plano muda (o planos legais é a sessão 23) | `:76` | Operador | — |
| P2 | Literal `#A0A0B8` no lugar de `text-fg-secondary` | `:76` | eu | D-584 |
| P2 | Sem registro/prova de **qual versão** dos termos o usuário aceitou no cadastro | ausência | Operador | — |
| — | **Positivo a preservar:** `lastUpdated` presente, `h1` padronizado (D-603), metadata + OG completos, JSON-LD presente (ainda que por caminho divergente) e estrutura de seções simples e escaneável | `:34-80` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- legal-termos=/terms
grep -n "lastUpdated\|JSON.stringify\|serializeJsonLd\|<h2\|max-w-\[" "apps/web/src/app/[locale]/terms/page.tsx"
grep -rn "serializeJsonLd" apps/web/src --include=*.tsx -l
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-legal-termos/{1440,375}.png`.

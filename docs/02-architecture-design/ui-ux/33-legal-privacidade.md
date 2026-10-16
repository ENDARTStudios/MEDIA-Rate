# UI-UX — Legal: Privacidade (`/privacy`)

> Sessão **20 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-legal-privacidade/{1440,375}.png`.

## 1. Identidade da sessão

- **Objetivo do usuário:** saber **o que** é coletado, **por quê**, **com quem** é compartilhado, **por
  quanto tempo** fica guardado e **como** exercer seus direitos (LGPD).
- **Persona:** público, incluindo titular de dados que quer exercer direito (acesso, correção, exclusão).
- **Rota:** `/privacy` (server, 142 linhas), indexável.
- **Entradas:** rodapé ("Privacidade"), banner de consentimento, formulário de cadastro.
- **Saídas:** `/user/data` (dados do titular, no produto), `/settings` (controles de LGPD), contato.
- **Fora de escopo:** Termos (21), **Cookies e Gerenciar Cookies** (22/25 — as superfícies de consentimento),
  **Direitos do Titular** (24, a página pública que ainda não existe).

## 2. Arquitetura de informação

Página server com **seções geradas de uma lista** (`<section key={n}>`, `privacy/page.tsx:51`) e três blocos
especiais:

| # | Bloco | Componente |
|---|---|---|
| 1 | `h1` + **`lastUpdated`** (data da última revisão) | `:48` |
| 2 | Seções numeradas de texto (`h2` + parágrafos) | `:51-52` |
| 3 | **Tabela de retenção** | `PipeTable source={t("sRetTable")}` (`:62`) |
| 4 | Seção de **IA** | `sAiH` / `sAiB` (`:66-67`) |
| 5 | Seção de **menores** | `sMinH` / `sMinB` (`:69-71`) |
| 6 | **Tabela de cookies** | `PipeTable source={t("sCookTable")}` (`:77`) |
| 7 | **Tabela de transferências internacionais** | `PipeTable source={t("sTrTable")}` (`:91`) |
| 8 | Função `PipeTable` (tabela a partir de string com `\|`) | definida em `:113-137` |

## 3. Layout, grid e densidade

- Coluna de leitura; as tabelas em `overflow-x-auto` (`:117`) para não quebrar no mobile.
- Densidade alta é **adequada**: é documento de referência, com seções curtas e escaneáveis por `h2`.
- **Ponto forte:** a tabela é `<table>` de verdade com `<thead>`/`<tbody>` (`:118-137`), então a leitura em
  tecnologia assistiva funciona por célula, não por texto corrido.

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Texto | `text.primary` / `text.secondary` | títulos e corpo |
| Borda da tabela | `surface.border` `#2A2A3D` | `:118,130` |
| Fundo do cabeçalho | `colors.cb` `#12121C` | `:120` |
| Acento do cabeçalho | `accent.indigo` `#818CF8` | `:120` |

**Fora de token (P2):** os quatro valores acima estão escritos como **literal** (`border-[#2A2A3D]`,
`bg-[#12121C]`, `text-[#818CF8]`, `text-[#A0A0B8]`) — são canônicos, portanto não violam o censo, mas
deveriam ser as classes semânticas.

## 5. Estados obrigatórios

| Estado | Situação |
|---|---|
| 1–5. Carregando / vazio / erro / 404 / permissão | **não se aplicam** — documento estático no servidor |
| 6. **Dados desatualizados** | **existe** — `lastUpdated` (`:48`) é o controle; a política cita tabelas de
retenção e de cookies que o produto pode mudar sem atualizar o texto ✗ (ver §11) |
| 7. Offline | benefício do estático |

## 6. Micro-interações e movimento

Não há animação nesta página (correto): documento legal com movimento distrai e atrapalha leitura.
Nada depende de `prefers-reduced-motion`.

## 7. Acessibilidade AA

- **Destaque (2º padrão de referência de tabela do repo):** `PipeTable` usa
  `<table>` + `<thead>` + **`<th scope="col">`** + `<tbody>` + `<td>` (`:118-122`) — o mesmo rigor de
  `PricingTable.tsx:37,43`. **São exatamente os dois exemplos que faltam no Admin** (19 `<th>` sem `scope`,
  D-613).
- Hierarquia: `h1` + `h2` por seção, sem pular nível ✓.
- Tabelas com texto pequeno (`text-xs`, `:118`) — o tamanho é aceitável para tabela densa, mas o contraste
  precisa ser conferido célula a célula (o `#A0A0B8` sobre `#05050A` passa; conferir no gate).
- Links de contato com rótulo textual ✓.

## 8. Copy e i18n

- Namespace **`privacy`**: `metaTitle/metaDescription`, `lastUpdated`, `sRetTable`/`sRetNote`,
  `sCookTable`, `sTrTable`, `sAiH/sAiB`, `sMinH/sMinB` + as seções numeradas.
- **Risco técnico do formato `PipeTable` (P2):** a tabela vive **dentro de uma string de tradução**
  (`célula|célula` com `\n` por linha). Um `|` a mais ou uma linha faltando em **um** idioma quebra a
  tabela só naquele locale — e nenhum gate valida isso hoje. Sugestão: mover a estrutura para código e
  deixar no i18n apenas o texto das células.
- **A CRIAR:** link explícito para o caminho de exercício de direitos (hoje existe `/settings` com
  `LgpdControls` e `/user/data`, mas a política não aponta para eles).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | tabelas rolam na horizontal (`overflow-x-auto` ✓); texto em coluna única |
| 768 | tabelas completas; seções com respiro |
| 1024+ | coluna de leitura com margem confortável |

## 10. Métricas de sucesso

- **Leitura das seções de retenção e cookies** (scroll até elas) — indica que a política é consultada, não
  só linkada.
- **Cliques para o exercício de direitos** (a criar) e **tempo de resposta** a pedidos.
- **Pedidos LGPD por canal** (suporte × produto) — mede se a página está defletindo pedidos.
- **Revisões da política por ano** (indicador de governança, não de UI).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| P2 | **Tabelas dentro de strings de i18n** — um erro de `\|` quebra a tabela em um idioma só, sem gate que detecte | `privacy/page.tsx:62,77,91,113-137` | eu | D-604 |
| P2 | Literais de token na tabela (`#2A2A3D`, `#12121C`, `#818CF8`, `#A0A0B8`) | `:118,120,132` | eu | D-584 |
| P2 | Política não aponta para o caminho real de direitos (`/settings` → `LgpdControls`, `/user/data`) | ausência de link | eu | sessão 24 |
| P2 | Texto de `lastUpdated` precisa ser atualizado quando a retenção mudar — hoje nada obriga | `:48` | Operador | — |
| — | **Não tocar:** `LgpdBanner` (D-582.10 reserva o arquivo ao Operador) | — | Operador | D-582.10 |
| — | **Positivo a preservar:** `PipeTable` semântica (`th scope="col"`), `lastUpdated`, seções de **IA** e **menores** (temas que muitas políticas ignoram), tabelas com rolagem e `h1`/`h2` corretos | `:48,51-137` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- legal-privacidade=/privacy
grep -n "PipeTable\|scope=\|lastUpdated\|<h2" "apps/web/src/app/[locale]/privacy/page.tsx"
npm run design:contrast
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-legal-privacidade/{1440,375}.png`.

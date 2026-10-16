# UI-UX — Legal: Cookies (A CRIAR)

> Sessão **22 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). **Não existe rota** — a inventariação de cookies hoje vive
> como **tabela dentro da Política de Privacidade** (`privacy/page.tsx:77`, `PipeTable source={t("sCookTable")}`).
> Evidência: `evidencias/ui-ux-legal-cookies/` (capturar `/privacy` até a tabela, como estado atual).

## 1. Identidade da sessão

- **Objetivo do usuário:** saber **quais cookies** o MEDIA Rate usa, para que servem, por quanto tempo e
  como recusar os opcionais — em uma página própria, achável e linkável (não um parágrafo perdido dentro da
  política).
- **Persona:** público, incluindo quem chega por auditoria/imprensa e quem quer conferir antes de consentir.
- **Rota proposta:** `/cookies` (publicamente indexável). Hoje: **AUSENTE** (tabela em `/privacy`).
- **Entradas:** rodapé, banner de consentimento ("Gerenciar"), Política de Privacidade.
- **Saídas:** `/privacy`, `/cookies/gerenciar` (sessão 25), `/terms`.
- **Fora de escopo:** Privacidade (20), Gerenciar Cookies (25).

## 2. Arquitetura de informação (proposta ancorada no que existe)

| # | Bloco | Base real |
|---|---|---|
| 1 | `h1` + `lastUpdated` | padrão do bloco legal (D-603/617) |
| 2 | **Tabela de cookies** (nome, finalidade, categoria, duração) | `PipeTable` + `sCookTable` (já existe em `/privacy` ✓) |
| 3 | **Categorias** — necessários / analytics / monitoramento | `use-consent-store.ts:26-33` (`analytics`, `monitoring`) |
| 4 | Como recusar / alterar depois | `ConsentBanner` (dialog "Gerenciar") + a página da sessão 25 |
| 5 | Cookies de terceiros (PostHog, Sentry) | `ConsentBanner` cita Analytics (PostHog) e Monitoramento (Sentry) ✓ |
| 6 | Base legal e contato | namespace `privacy`/`consent` |

## 3. Layout, grid e densidade

- Reaproveitar a página de Privacidade: coluna de leitura + `PipeTable` em `overflow-x-auto` (`:117`) — a
  tabela de cookies já está pronta e **acessível** (§7).
- Diferença desta página: um bloco de **ação** ("Gerenciar minhas preferências") no topo, para quem chegou
  com intenção de mudar algo.

## 4. Tokens em uso

Todos de [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Ao **extrair** a tabela de `/privacy` para cá, corrigir os
literais de token (`border-[#2A2A3D]`, `bg-[#12121C]`, `text-[#818CF8]`, `text-[#A0A0B8]`) para as classes
semânticas — pendência já registrada em `33-legal-privacidade.md` §4.

## 5. Estados obrigatórios

| Estado | Situação |
|---|---|
| 1–5. Carregando / vazio / erro / 404 / permissão | **não se aplicam** — documento estático |
| 6. **Dados desatualizados** | **existe e é o risco central** — a tabela afirma cookies e durações reais; **nada obriga** a atualizá-la quando um fornecedor muda. A spec exige `lastUpdated` **e** uma verificação periódica registrada |
| 7. Offline | benefício do estático |

Regra de produto: **a tabela tem de ser verificável contra o produto** (nome do cookie × o que o código
seta). Um inventário que não corresponde à realidade é pior que a ausência dele.

## 6. Micro-interações e movimento

Sem animação. O único movimento relevante é o **banner** aparecer (comportamento atual na primeira visita) e
o overflow do banner quando o dialog "Gerenciar" abre — regras do `ConsentBanner` (T474: **não é modal**, é
`role="region"` com rótulo, `:40-48`) ✓.

## 7. Acessibilidade AA

- Tabela: **`<table>` + `<thead>` + `<th scope="col">` + `<tbody>`** — já é o caso no `PipeTable`
  (`privacy/page.tsx:118-122`) ✓; ao mover para a página nova, **manter**.
- Hierarquia `h1` → `h2` por seção, sem pular nível (padrão D-603).
- O bloco de ação ("Gerenciar") precisa ser um **link/botão com rótulo textual** (não ícone de engrenagem).
- Contraste: texto de tabela em `text-xs` exige conferir 4,5:1 nas duas cores de célula.

## 8. Copy e i18n

- Reusar a string `privacy.sCookTable` (a tabela já existe traduzida nos 3 locales) e criar namespace
  **`cookies`** para o que é específico (título, introdução, CTA de gerenciar, `lastUpdated`).
- Cuidado já registrado (D-617): a tabela vive **dentro de uma string i18n** — um `|` a mais quebra a
  tabela em **um** idioma só. Ao criar a página, mover a **estrutura** para código e deixar no i18n apenas
  o texto das células.
- **A CRIAR:** descrição por categoria em linguagem simples ("analytics" e "monitoramento" são jargão).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | tabela rola na horizontal (`overflow-x-auto`); o CTA de gerenciar fica acima da tabela |
| 768+ | tabela completa; CTA no topo à direita |

## 10. Métricas de sucesso

- **Visitas a `/cookies`** e **cliques no gerenciador** a partir dela.
- **Divergência entre a tabela declarada e os cookies realmente setados** (verificação periódica; hoje não
  existe medição).
- **Bounces** na página (se alto, a tabela está ilegível ou o CTA não está claro).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | **Não existe página de Cookies** — a inventariação está enterrada em `/privacy`, o que prejudica o direito de informação e a achabilidade | `privacy/page.tsx:77` (tabela) e ausência de rota | eu | esta spec |
| **P1** | **Nada obriga a tabela a acompanhar o produto**: se um cookie/fornecedor mudar, o texto pode ficar falso em silêncio | ausência de verificação/gate | eu | — |
| P2 | Tabela dentro de string i18n (quebra por locale sem gate) | `privacy/page.tsx:62,77,91,113-137` | eu | D-617 |
| P2 | Literais de token ao mover a tabela | `privacy/page.tsx:118,120,132` | eu | D-584 |
| P2 | Categorias descritas por jargão ("analytics", "monitoramento") | `ConsentBanner.tsx:64`; `use-consent-store.ts:27` | eu | — |
| — | **Positivo a preservar e reusar:** `PipeTable` semântico, categorias reais do store (analytics/monitoramento, com **privacidade por padrão**: ambas `false` sem escolha — `use-consent-store.ts:21`), e o banner como `role="region"` nomeado em vez de modal falso | `use-consent-store.ts:21,26-33`; `ConsentBanner.tsx:40-48` | — | — |

## 12. Evidência e reprodução

```powershell
# estado atual: a tabela existe, a página não
npm run uiux:evidence -- legal-cookies=/privacy
grep -n "sCookTable\|PipeTable" "apps/web/src/app/[locale]/privacy/page.tsx"
grep -n "analytics\|monitoring\|PRIVACY BY DEFAULT" apps/web/src/stores/use-consent-store.ts
ls "apps/web/src/app/[locale]/cookies" 2>$null   # não existe
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-legal-cookies/` (capturar `/privacy` como
estado atual, e a futura `/cookies` quando criada).

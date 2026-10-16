# UI-UX — Admin (`/admin` + 7 subrotas)

> Sessão **10 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md).
>
> **Dono do código: outro agente.** Os arquivos de `/admin` e `components/admin/` estão em edição por
> outra frente (restrição registrada na sessão). Esta spec é **especificação e relatório** — as correções
> aqui são **report-only**, com evidência medida, para quem edita os arquivos executar.
>
> **Evidência principal:** `evidencias/auth-2026-10-15/` (axe completo, D-605) — relatório Playwright
> (`a11y-admin.json`), mensagens cruas (`a11y-admin-resumo.txt`) e resumo por rota
> (`a11y-admin-compacto.txt`). Capturas 1440/375 em `evidencias/ui-ux-admin*/` — **validar antes de usar**,
> ver §12.

## 1. Identidade da sessão

- **Objetivo do usuário:** operar a plataforma — diagnosticar problemas, gerir usuários e catálogo, ler
  métricas e auditoria, atender LGPD e subir assets.
- **Persona/estado de conta:** **admin** (papel ADMIN, sujeito a *step-up*/2FA em telas sensíveis). Não é
  uma sessão de produto: é ferramenta interna.
- **Rotas reais (8):** `/admin` (visão geral), `/admin/diagnostics`, `/admin/usuarios`, `/admin/catalogo`,
  `/admin/metricas`, `/admin/auditoria`, `/admin/lgpd`, `/admin/upload`.
- **Entradas:** link direto (não há entrada pública no header hoje), atalhos internos do shell.
- **Saídas:** `/admin/*` (navegação lateral) e "voltar" para o site.
- **Fora de escopo:** tudo que é público; a **auditoria de a11y do dashboard autenticado** (mesmo harness,
  outra superfície).

## 2. Arquitetura de informação

**Shell** (`components/admin/AdminShell.tsx`): `<nav aria-label="Área de administrador">` (L26-28 ✓) com 6
itens (`ITENS`, L13-19) + link de voltar (L35 ✓). Itens: Diagnóstico · Gestão de usuários · Catálogo ·
Métricas · Auditoria · LGPD.

| # | Tela | Papel presumido | `<th>` na tabela |
|---|---|---|---|
| 1 | `/admin` | visão geral / atalhos | — |
| 2 | `/admin/diagnostics` | saúde de serviços e checagens | 5 |
| 3 | `/admin/usuarios` | busca e gestão de contas | 5 |
| 4 | `/admin/catalogo` | curadoria de títulos | — |
| 5 | `/admin/metricas` | números de uso | — |
| 6 | `/admin/auditoria` | trilha de ações | 6 |
| 7 | `/admin/lgpd` | pedidos de titular | 3 |
| 8 | `/admin/upload` | envio de assets | — |

`h1` existe em runtime (ex.: "Gestão de usuários" medido em `/admin/usuarios`) mas **não** aparece como
literal em `<h1>` nos `page.tsx` — vem de componente/estado. Consequência prática: **a página não tem
heading no HTML servido** e o `h1` depende de JS (ver P1).

## 3. Layout, grid e densidade

- Shell com área de conteúdo única; tabelas densas (5–6 colunas) — tela de trabalho, não de leitura.
- Densidade alta é **apropriada** aqui, mas exige: linha com altura estável, números com `tabular-nums` e
  cabeçalho de tabela fixo em rolagem longa (**a confirmar** se existe).
- Em 375 os arquivos capturados mostram que a tela continua utilizável apenas com rolagem horizontal —
  o admin é desktop-first, o que é aceitável, mas **não pode quebrar** (ver §9).

## 4. Tokens em uso

| Papel | Deveria ser | O que está lá (medido) |
|---|---|---|
| Texto secundário | `text-fg-secondary` `#A0A0B8` | **`#6b7280`** (Tailwind `gray-500`) |
| Superfície de linha/cartão | `bg-surface-card` `#12121C` | **`#1f2937`** (Tailwind `gray-800`) |
| Texto de sucesso/positivo | `score.high` `#34D399` | **`#16a34a`** (Tailwind `green-600`) |
| Borda | `border-surface-border` `#2A2A3D` | misto (há `gray-*` e tokens) |

Os três valores foram **medidos pelo axe** com o contraste exato (D-605): `#16a34a` sobre `#1f2937` =
**4,45:1** e `#6b7280` sobre `#05050a` = **4,2:1**, sobre `#1f2937` = **3,03:1** — todos reprovam AA
(4,5:1). É o `B2` da auditoria ("segundo design system no admin") com número em mãos: a paleta **default do
Tailwind** convive com os tokens.

## 5. Estados obrigatórios

| Estado | Hoje | Falta |
|---|---|---|
| 1. Carregando | a confirmar por tela (sem padrão único) | **P1**: um padrão de skeleton de tabela para as 4 telas tabulares |
| 2. Vazio | a confirmar (ex.: auditoria sem eventos, LGPD sem pedidos) | **P1**: vazio com explicação (não uma tabela sem linhas) |
| 3. Erro de rede | a confirmar | **P1**: erro com retry (padrão M16/D-603) |
| 4. Não encontrado | n/a | — |
| 5. **Sem permissão** | **existe, mas é instável** — a decisão manda para `/login` sem chamar a API (ver §11 P1) | **P0/P1**: distinguir "não é admin" (403 com explicação) de "sessão expirou" (login) e de "precisa step-up" (tela de verificação) |
| 6. Dados parciais/desatualizados | a confirmar | carimbo de "atualizado em" nas métricas e diagnósticos |
| 7. Offline | ausente | P2 |

**O admin não tem "visitante"**: o estado 5 é o mais importante da sessão e hoje é o mais frágil.

## 6. Micro-interações e movimento

- Esperado: nada além de transições de hover de linha e estados de botão. Ferramenta interna não precisa
  de coreografia; qualquer animação deve usar `motion.duration.fast`.
- Ações destrutivas (banir, excluir, reprocessar) **devem** ter confirmação — o repo já tem
  `ui/confirm-dialog.tsx`; a auditoria registra 5 fluxos com `prompt`/`confirm` nativos no admin (M8–M14).

## 7. Acessibilidade AA (medido pelo axe, D-605)

**Resultado do harness `test:auth`:** 6 passaram / 5 falharam — e as falhas são violações reais:

| Rota | Regra | Nós | Contraste medido |
|---|---|---|---|
| `/admin/usuarios` | `color-contrast` (serious) | 8 | `#16a34a`/`#1f2937` = **4,45:1**; `#6b7280`/`#05050a` = 4,2:1 |
| `/admin/catalogo` | `color-contrast` | 2 | `#6b7280`/`#1f2937` = **3,03:1** |
| `/admin/lgpd` | `color-contrast` | 3 | idem |
| `/admin/diagnostics` | `color-contrast` | 2 | `#16a34a`/`#1f2937` = 4,45:1 |
| `/admin/metricas` | **`definition-list`** | — | `<dl>` com filhos inválidos (estrutura) |

Passaram: `/admin`, `/admin/auditoria`, `/admin/upload`, o teste de tema/contraste do admin e o baseline
do dashboard.

**Estrutura de tabela (medido agora, no código):** **15 `<th>` em 4 telas e `scope` em ZERO delas** —
`auditoria` (6), `diagnostics` (5), `usuarios` (5), `lgpd` (3) ✗. O padrão correto **já existe no repo**
na tabela pública de planos (`PricingTable.tsx:37,43` usa `<th scope="col">`): é reuso, não invenção.

**Outros pontos:** o `nav` do shell não marca o item ativo (`aria-current` ausente ✗ — o Rankings faz
certo em `TopPageClient.tsx:113`); os rótulos do menu são **texto fixo em português** (§8); foco visível
herda `focus.ring`, mas a densidade exige conferir ordem de tabulação em tabela larga.

## 8. Copy e i18n

- **P1 — o shell tem texto hardcoded em pt-BR:** `ITENS` (`AdminShell.tsx:13-19`) usa literais
  `"Diagnóstico"`, `"Gestão de usuários"`, `"Catálogo"`, `"Métricas"`, `"Auditoria"`, `"LGPD"`. Como o
  produto é trilíngue, o admin aparece em português mesmo em EN/ES. (É o mesmo tipo de vazamento que achei
  no checkout — ver `17-assinaturas.md` §11 e a pendência de **gate**: o `test/i18n-leak.spec.ts` varre só
  o catálogo de mensagens.)
- **A CRIAR:** namespace `admin` com paridade nos 3 locales, incluindo rótulos de tabela, ações e
  mensagens de erro/permissão.
- Tom: objetivo e operacional; sem copy de marketing.

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | tabelas exigem rolagem horizontal (aceitável para ferramenta interna), mas ações por linha precisam continuar alcançáveis e o `nav` precisa colapsar |
| 768 | tabela com menos respiro; algumas colunas secundárias podem ser ocultadas |
| 1024+ | layout completo (alvo real da sessão) |

## 10. Métricas de sucesso

- **Tempo para diagnosticar um incidente** (a razão de existir de `/admin/diagnostics`).
- **Ações por sessão de admin** e **erros de ação** (hoje não instrumentados por tipo).
- **Pedidos LGPD atendidos dentro do prazo** (métrica de conformidade, não de UI).
- **Cobertura de auditoria:** % de ações administrativas que geram evento em `/admin/auditoria`.

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono |
|---|---|---|---|
| **P0** | **Acesso admin é não determinístico** com sessão válida: a **mesma** rota alterna entre renderizar e mandar para `/login` (medido: 1/8 renderizou numa passada, 6/8 em outra, minutos depois ✗), e **nenhuma chamada a `/api/v1/admin` acontece** quando redireciona — a decisão é local, não é o RBAC da API. Consequência direta: **`test:auth` não é reprodutível** enquanto isso existir | probes de 2026-10-15 (`uiux:auth-env` + Playwright) + run do D-605 (6 passou/5 falhou) | outro agente (diagnóstico) |
| **P1** | **15 `<th>` sem `scope`** em 4 telas de tabela | `admin/{auditoria,diagnostics,usuarios,lgpd}/page.tsx`; referência: `PricingTable.tsx:37,43` | outro agente |
| **P1** | **Contraste AA reprovando em 4 telas** com paleta default do Tailwind (`green-600`, `gray-500`, `gray-800`) — 15 nós no total | `evidencias/auth-2026-10-15/a11y-admin-compacto.txt` | outro agente |
| **P1** | **`<dl>` inválido em `/admin/metricas`** (`definition-list`) | idem | outro agente |
| **P1** | **Rótulos do shell hardcoded em pt-BR** — agora **medido pelo censo** `npm run i18n:source`: **28 achados** em `/admin/**` + `AdminShell` (metricas 9, usuarios 6, auditoria 4, catalogo 3, upload 3, diagnostics 2, shell 1) | `AdminShell.tsx:13-19` + `D-620` | outro agente |
| **P1** | Sem `aria-current` no item ativo do `nav` | `AdminShell.tsx:26-44` | outro agente |
| **P1** | 5 fluxos com `prompt`/`confirm` nativos em vez do `confirm-dialog` do repo (M8–M14) | auditoria canônica | outro agente |
| P2 | Sem padrão único de carregando/vazio/erro nas telas tabulares | ausência | outro agente |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | outro agente | ✔
| — | **Positivo a preservar:** `nav` com `aria-label`, `data-testid` em nav/links (bom para o harness), tema escuro correto mesmo com SO em modo claro (teste do D-582.1 passou), e o baseline visual do dashboard criado no D-605 | `AdminShell.tsx:26-44`; `test:auth` | — |

## 12. Evidência e reprodução

```powershell
# 1) evidência principal (completa e válida): axe nas 8 telas + baseline do dashboard (D-605)
Get-Content docs/02-architecture-design/evidencias/auth-2026-10-15/a11y-admin-compacto.txt

# 2) reproduzir o harness (exige o ambiente descartável)
npm run uiux:auth-env -- --start
$env:API_PROXY_TARGET="http://localhost:4000"; npm run dev --workspace apps/web
$env:E2E_API_BASE="http://localhost:4000"; npm run test:auth --workspace apps/web

# 3) contagem de <th> sem scope (medido nesta spec)
Select-String -Path "apps/web/src/app/[locale]/admin/*/page.tsx" -Pattern '<th' | Group-Object Path
```

**Capturas:** `evidencias/ui-ux-admin*/` — o capturador agora **repete a navegação** quando a rota
redireciona e **avisa** quando não conseguiu (o guard de admin é instável, §11 P0). **As capturas só valem
para as rotas que renderizaram**: confirmei `/admin/catalogo` renderizando (título "Catálogo (0)") e as
demais redirecionando na mesma janela de tempo. Ou seja: para a auditoria de admin, **a fonte de verdade é
o relatório do axe (item 1)**, não as imagens.

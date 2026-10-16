# UI-UX — Perfil (`/profile` · `/user/[id]`)

> Sessão **15 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-perfil/{1440,375}.png`.

## 1. Identidade da sessão

- **Objetivo do usuário:** ver seu **perfil de gosto** (o que consome, como avalia) e — no caso público —
  conhecer o perfil de outra pessoa.
- **Persona/estado de conta:** duas superfícies distintas:
  - `/profile` — **próprio**, com `ProtectedPage` (`profile/page.tsx:3,27`) — uma das 5 rotas que hidratam a
    sessão (D-610);
  - `/user/[id]` — **público**, `PublicProfileContent userId={id}` (`user/[id]/page.tsx:36`), compartilhável.
- **Entradas:** chip de usuário no header, link de perfil em listas/comentários, link direto público.
- **Saídas:** ficha das obras; listas; watchlist.
- **Fora de escopo:** configurações de conta (16), dashboard (5).

## 2. Arquitetura de informação

`ProfileContent.tsx:38` monta o perfil próprio a partir da **watchlist** (`useWatchlistStore`, `:45`) —
decisão registrada no próprio código ("`/user/stats` (70) em vez da watchlist (18). Deriva agora das
entradas", `:78`), ou seja: **as estatísticas vêm das interações**, não de um contador próprio.

| # | Bloco | Componente |
|---|---|---|
| 1 | `h1` com o nome do usuário | `ProfileContent.tsx:112` |
| 2 | Cabeçalho do perfil (nome, plano, desde quando) | `ProfileContent.tsx` |
| 3 | **Perfil de gosto** (distribuição por tipo/gênero) | `h2` (`:188`) + `tasteEmpty` (`:193`) |
| 4 | **Badges/conquistas** | `badges` (`:71`), `h2` (`:211`), lista (`:215`) |
| 5 | Seções adicionais de estatística | `h2` (`:228`) |
| 6 | Perfil público (mesma base, sem dados privados) | `PublicProfileContent.tsx` |

## 3. Layout, grid e densidade

- Coluna central `max-w-4xl` com seções empilhadas, cada uma com `h2` próprio.
- Badges em grade de pílulas; gráficos de gosto seguem o padrão de `RadarGraphic`/`HistogramBars` (mesma
  família visual do dashboard — e a mesma dívida de alternativa textual, ver §7).
- Estados vazios curtos e centralizados (`tasteEmpty`, `emptyMessage`).

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Texto | `text.primary` / `text.secondary` | títulos e corpo |
| Superfície | `bg-surface-card` | cartões de seção |
| Score/gosto | `scoreColor()` + `CATEGORY_TOKENS` | gráficos e badges |
| Foco | `focus.ring` | links e badges interativos |

**Fora de token (P2):** `text-[#A0A0B8]` (`ProfileContent.tsx:101,193`) e `text-[#F5F5F7]`
(`:112,188,211,228`) — valores canônicos escritos como literal; deveriam ser `text-fg-secondary` /
`text-fg-primary`.

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | **existe** — `isLoading && total === 0` com texto centralizado | `ProfileContent.tsx:99-101` | **P2**: skeleton nas formas das seções |
| 2. Vazio | **existe e é específico** — `emptyMessage` (perfil sem dados) e `tasteEmpty` (sem gosto calculável) | `:154,193` | CTA para marcar títulos |
| 3. Erro de rede | **a confirmar** — não vi branch de erro no conteúdo próprio | `ProfileContent.tsx` | **P1**: erro com retry (padrão M16/D-603) |
| 4. Não encontrado | **a confirmar** no público: `/user/[id]` com id inexistente deveria ser **404 honesto** (o padrão de Listas/`/media`), não um perfil vazio | `user/[id]/page.tsx:36` | **P1** se não existir |
| 5. Sem permissão | **existe** no próprio (ProtectedPage → login) | `profile/page.tsx:27` | — |
| 6. Dados parciais | **existe** — perfil derivado de watchlist pode ter pouco dado (daí `tasteEmpty`) | `:78,193` | explicar o mínimo necessário para o gosto aparecer |
| 7. Offline | **AUSENTE** | — | P2 |

## 6. Micro-interações e movimento

- Entrada das seções: `motion.presets.entry` com `stagger` curto; gráficos podem animar **traço** na
  primeira pintura (nunca `width`/`height`).
- Badges: revelação com escala leve ao entrar na viewport (uma vez, não em cada rolagem).
- Reduced motion: gate verde; manter sem `initial={{opacity:0}}`.

## 7. Acessibilidade AA

- Hierarquia: `h1` (nome) → `h2` por seção (`:188,211,228`) ✓ — sem pular nível.
- **P1:** os gráficos de gosto precisam de **alternativa textual** (tabela ou `aria-label` com os valores).
  É a mesma pendência do dashboard (`14-dashboard.md` §7) e da sessão MEDIA Score.
- Badges precisam de rótulo textual além do ícone (`aria-hidden` no ícone + texto).
- Perfil público: garantir que **não** exponha dado privado (e-mail, plano detalhado) e que o `alt`/`title`
  das imagens não vaze informação de conta.
- Contraste: pares de token sob o gate; os literais da §4 são os pontos a corrigir.

## 8. Copy e i18n

- Namespace **`profile`** (títulos de seção, `emptyMessage`, `tasteEmpty`, `badges`) + `common` (`loading`).
- Sem texto hardcoded identificado nesta sessão ✓.
- **A CRIAR:** rótulo acessível dos gráficos e a mensagem do 404 público (se confirmado o P1 da §5).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | seções empilham; badges em 2 colunas; gráfico rola se necessário |
| 768 | badges em 3 colunas |
| 1024+ | `max-w-4xl` centralizado com gráficos lado a lado |

## 10. Métricas de sucesso

- **Visitas ao perfil próprio** e **compartilhamentos** do perfil público (é a superfície social do produto).
- **Perfis públicos visitados por sessão** e **cliques em obra** a partir do perfil (conversão real).
- **% de perfis com gosto calculável** (`tasteEmpty` é um indicador de dados insuficientes).
- **Distribuição de badges** (badge que ninguém ganha é badge mal desenhada).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | Erro de rede **sem retry** confirmado no conteúdo próprio (não há branch de erro) | `ProfileContent.tsx` | eu | D-603 |
| **P1 — CORRIGIDO (D-628)** | Já tratava "não encontrado", mas tratava **qualquer** erro como tal (um 500 dizia que o perfil não existe). Agora separa 404 (mensagem honesta + catálogo) de falha de rede (**retry**). ~~404 do perfil público não confirmado — id inexistente pode renderizar perfil vazio em vez de "não encontrado" | `user/[id]/page.tsx:36` | eu | padrão de Listas (`23-listas.md`) |
| **P1 — verificado OK (D-628)** | O gráfico de gosto é o `RadarGraphic`, que tem `role="img"` + `aria-label` (`:34-35`). Diagnóstico anterior estava errado | `overview/RadarGraphic.tsx:34` | — | feito |
| P2 | Literais `#A0A0B8` / `#F5F5F7` onde há token semântico | `ProfileContent.tsx:101,112,188,193,211,228` | eu | D-584 |
| P2 | Carregando é texto, não skeleton | `:99-101` | eu | — |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| — | **Positivo a preservar:** `ProtectedPage` no próprio, dois estados vazios **distintos** (sem dados × sem gosto calculável), estatística derivada de dados reais (não de contador), hierarquia `h1`→`h2` correta e perfil público reaproveitando o mesmo conteúdo | `profile/page.tsx:27`; `ProfileContent.tsx:71-101,154,188-228` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:auth-env -- --start
$env:API_PROXY_TARGET="http://localhost:4000"; npm run dev --workspace apps/web
npm run uiux:evidence -- --state "$env:TEMP\mr-uiux-auth\state.json" perfil=/profile
# perfil público: capturar /user/<id> de um usuário com dados
npm run uiux:auth-env -- --stop --purge

grep -n "isLoading\|error\|tasteEmpty\|emptyMessage\|badges\|<h2" apps/web/src/components/ProfileContent.tsx
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-perfil/{1440,375}.png`.

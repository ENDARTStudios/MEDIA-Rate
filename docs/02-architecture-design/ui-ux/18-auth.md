# UI-UX — Login/Cadastrar (`/login` · `/register` · `/welcome` · `/verificar-email`)

> Sessão **9 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Evidência: `evidencias/ui-ux-auth/{1440,375}.png`.

## 1. Identidade da sessão

- **Objetivo do usuário:** entrar, criar conta, confirmar e-mail e concluir o primeiro acesso — sem
  fricção e sem dúvida sobre o que vai acontecer.
- **Persona/estado de conta:** anônimo; e o caso especial do **usuário que chega de um e-mail**
  (verificação) ou de um deep link de checkout.
- **Rotas reais (4):**
  - `/login` e `/register` — **server**: metadata + `<AuthBladeCard initialView>` (`login/page.tsx:4`,
    `register/page.tsx:4`); o card é o componente D-595/D-596 (faixa inclinada);
  - `/welcome` — server, `h1` "Bem-vindo ao MEDIA Rate!" (pós-cadastro);
  - `/verificar-email` — server com casco SSR + ilha cliente (D-603).
- **Entradas:** header ("Entrar"/"Cadastrar"), CTAs da home, deep link de e-mail, redirect de rota
  protegida, retorno do OAuth.
- **Saídas:** `/welcome` → `/dashboard`; `/verificar-email` → `/login`; `/login` → `callbackUrl`.
- **Fora de escopo:** recuperação de senha (não há rota hoje — ver §11), configurações de conta (16).

## 2. Arquitetura de informação

`AuthBladeCard` mantém **dois painéis** (login e cadastro) na mesma célula e troca por animação de faixa;
o painel inativo fica `inert` + `aria-hidden` (`AuthBladeCard.tsx:91-92`) — model correto: o foco e o
leitor de tela ignoram o painel escondido.

| # | Bloco | Componente |
|---|---|---|
| 1 | Logo/link de volta | `login/page.tsx:5` (`LazyLogo`), `register/page.tsx:5` (`Logo`) |
| 2 | Painel com `h2` "Entrar" / "Cadastrar" + subtítulo | `AuthBladeCard.tsx:104,128` |
| 3 | Formulário (e-mail, senha, submit) | `AuthForm.tsx:31` (`LoginForm`), `:141` (`RegisterForm`) |
| 4 | Erros de validação anunciados | `AuthForm.tsx:91-92` (`sr-only` + `aria-live` + `role="status"`) |
| 5 | OAuth (Google/Apple) | `SocialButtons.tsx` |
| 6 | Troca login ↔ cadastro (faixa) | `AuthBladeCard` (DURACAO_MS 620, `:49`) |
| 7 | Confirmação de e-mail (casco + estado) | `verificar-email/page.tsx` + `VerifyEmailClient.tsx` |

## 3. Layout, grid e densidade

- Cartão centralizado `max-w-3xl` com painel de formulário `max-w-sm` — uma decisão por tela.
- Medida de leitura curta (rótulos e um campo por linha) — sem parágrafos longos.
- Altura mínima do painel ~540 px (`min-h-[540px]` no card) para a troca de painel não pular o layout.

## 4. Tokens em uso

| Papel | Token | Onde |
|---|---|---|
| Superfície | `bg-surface-card` (tinta da faixa) | painéis |
| Texto | `text-fg-primary` (títulos, `:104,128`), `text-fg-secondary` | rótulos |
| Acento | `accent.indigo` | link e foco |
| Faixa inclinada | `--rake` (7°) + `--sweep` + `color-mix(in oklab, var(--accent-indigo) 7%, transparent)` | `globals.css` |
| Foco | `focus.ring` | campos e botões |

`AuthForm` e o card usam tokens (nenhum hex novo identificado nesta sessão após a migração D-604).

## 5. Estados obrigatórios

| Estado | Hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando | **existe** — `isSubmitting` desabilita o botão | `AuthForm.tsx:39,152` | spinner/`aria-busy` (P2) |
| 2. Vazio | **não se aplica** | — | — |
| 3. Erro de credencial/registro | **existe** — `toast.error(result.error \|\| t("loginError"))` + `sr-only` com erros de campo | `AuthForm.tsx:49,91-92,171,213` | mensagem inline persistente (toast some) |
| 4. Não encontrado | **não se aplica** | — | — |
| 5. Sem permissão | **existe** — `/verificar-email` sem token válido mostra "link inválido ou expirou" + reenvio | `VerifyEmailClient.tsx` (D-603) | — |
| 6. Dados parciais | **existe** — OAuth pode estar indisponível/integrating | `SocialButtons`, chaves `socialComingSoon`/`socialIntegrating` | — |
| 7. Offline | **AUSENTE** | — | P2 |
| — | **Rate limit (429):** **AUSENTE no formulário** — não há tratamento de `RateLimitedError`; o usuário recebe erro genérico | grep sem resultado em `AuthForm.tsx` | **P1**: reusar `ui/rate-limited.tsx` (já existe, com `retryAfterSeconds`) |

**SSR verificado:** o HTML servido de `/login` e `/register` traz **8 inputs e 8 labels** — o formulário
funciona sem JS ✓ (o que quebrava no `/verificar-email` foi corrigido no D-603).

## 6. Micro-interações e movimento

- **Faixa do card** (D-595/D-596): `skewX(var(--rake)) translateX(var(--sweep))` com **transformação
  inversa** no conteúdo interno (`.band_inner`) e `overflow: hidden` cortando o título na diagonal;
  a troca de painel acontece na metade da duração (620 ms) e o estado de "varrendo" limpa em +40 ms
  (`AuthBladeCard.tsx:49,82-83`).
- **Reduced motion:** com `prefers-reduced-motion: reduce` (lido em `AuthBladeCard.tsx:59`) a troca é
  **instantânea, sem faixa** — decisão correta (não anima por 620 ms para quem pediu menos movimento).
- Formulário: sem animação de entrada; foco vai para o primeiro campo inválido (a confirmar).

## 7. Acessibilidade AA

- **P1 — falta `h1`:** `/login` e `/register` **não têm heading de nível 1** (medido no HTML servido:
  nenhum `<h1>`), e o card começa em **`h2`** (`AuthBladeCard.tsx:104,128`) → a página não tem título
  navegável (regra `page-has-heading-one` do axe). Correção: promover o título do painel ativo a `h1`
  (ou `h1` visualmente oculto).
- **Destaques positivos:** `inert` + `aria-hidden` no painel inativo (`:91-92`); erros de validação em
  `sr-only` + `aria-live="polite"` + `role="status"` (`AuthForm.tsx:91-92,213`); `aria-invalid` nos campos
  (`:101`); `<Field>` com `label` associado (`:97`); `aria-label` nos botões sociais.
- Foco visível em campos e botões (herda `focus.ring`); ordem de tabulação dentro do painel ativo
  (garantida pelo `inert` do inativo ✓).
- Contraste: pares de token sob o gate; o aviso de erro do `/verificar-email` usa verde/vermelho de token.

## 8. Copy e i18n

- Namespace **`auth`**: `loginTitle` ("Entrar"), `registerTitle` ("Cadastrar"), `loginSubtitle`,
  `registerSubtitle`, `emailLabel`/`emailPlaceholder`, `passwordLabel`/`passwordPlaceholder`, `loginError`,
  `registerError`, `verify*`, `social*`, `consentAnd` (coberto por `test/i18n-leak.spec.ts`, D-604).
- **P2 — placeholder de senha é `⬢⬢⬢⬢⬢⬢`** (`auth.passwordPlaceholder`): parece **valor já preenchido** e
  não ajuda quem usa leitor de tela. Trocar por instrução ("mínimo 8 caracteres").
- Sem texto hardcoded nos componentes de auth (o vazamento encontrado nesta rodada está no **checkout** —
  ver `17-assinaturas.md` §11).

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | card ocupa a largura; faixa com `--sweep-rest: 84%` (mobile) e a troca de painel continua por toque no link inferior |
| 768 | card `max-w-3xl` centralizado |
| 1024+ | `--sweep-rest: 54%` (desktop) e painel de formulário na metade |

## 10. Métricas de sucesso

- **Cadastro concluído / visita a `/register`** e **login concluído / visita a `/login`**.
- **Taxa de erro por tipo** (credencial, validação, rate limit) — hoje não instrumentada por tipo.
- **Abandono no `/verificar-email`** (quem não clica no link) e **reenvios por usuário**.
- **Uso de OAuth** versus senha (mede se vale manter o fluxo de senha em primeiro plano).
- **Tempo até o primeiro conteúdo útil** após o cadastro (`/welcome` → ação).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | `/login` e `/register` **sem `h1`** (card começa em `h2`) | HTML servido (0 `<h1>`) + `AuthBladeCard.tsx:104,128` | eu | AA |
| **P1** | **Rate limit sem tratamento** no formulário (429 → erro genérico) | ausência em `AuthForm.tsx`; `ui/rate-limited.tsx` já existe com `retryAfterSeconds` | eu | D-603 (padrão) |
| P1 | Erro de credencial só em toast (some sozinho); falta mensagem inline persistente | `AuthForm.tsx:49,171` | eu | AA/UX |
| P2 | Placeholder de senha `⬢⬢⬢⬢⬢⬢` parece valor preenchido | `auth.passwordPlaceholder` | eu | i18n |
| **P2 — CONCLUÍDO (D-629)** |  Sem estado offline | ausência | eu | — | ✔
| P2 | Feedback de submissão sem spinner/`aria-busy` | `AuthForm.tsx:39,152` | eu | — |
| — | **A CRIAR (produto):** não existe rota de **recuperação de senha** ("esqueci minha senha") — o login não pode ser a única porta para quem perdeu a senha | rotas de `[locale]` sem `forgot-password`/`reset` | Operador | — |
| — | **Positivo a preservar:** `inert`+`aria-hidden` no painel inativo, `sr-only`+`aria-live` nos erros de validação, `aria-invalid`, formulário **SSR**, faixa com transformação inversa + reduced motion instantâneo, casco SSR do `/verificar-email` (D-603) | `AuthBladeCard.tsx:49,59,82-92,104`; `AuthForm.tsx:91-101,213`; `verificar-email/page.tsx` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- auth=/login          # também: register=/register welcome=/welcome
# o card não exige sessão; /verificar-email entra no mesmo conjunto público

# prova do P1 de heading (nenhum <h1> no HTML servido):
(Invoke-WebRequest "http://localhost:3000/pt-BR/login" -UseBasicParsing).Content -match '<h1'
grep -n "<h2\|<h3\|inert" apps/web/src/components/AuthBladeCard.tsx
grep -n "RateLimited\|aria-live\|aria-invalid" apps/web/src/components/AuthForm.tsx
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-auth/1440.png` · `375.png`
(a captura atual é da rota `/login`; `/register`, `/welcome` e `/verificar-email` entram no mesmo diretório
quando recapturados com `auth=` no comando acima).

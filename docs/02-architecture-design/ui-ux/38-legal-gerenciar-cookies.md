# UI-UX — Legal: Gerenciar Cookies (A CRIAR como página)

> Sessão **25 de 25** (a última). Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). **A gestão existe, mas só dentro do banner.** Evidência:
> `evidencias/ui-ux-legal-gerenciar-cookies/` (capturar a primeira visita com o banner aberto e o dialog
> "Gerenciar").

## 1. Identidade da sessão

- **Objetivo do usuário:** **mudar** o que autorizou — a qualquer momento, depois de já ter decidido — e
  entender o efeito de cada escolha.
- **Persona:** quem recusou e se arrependeu, quem aceitou e quer reduzir, e quem só quer conferir.
- **Rota proposta:** `/cookies/gerenciar` (ou um dialog aberto por link persistente). Hoje: **AUSENTE como
  rota** — existe apenas como **dialog dentro do `ConsentBanner`** (`ConsentBanner.tsx:12`).
- **Entradas:** rodapé (link permanente), `/cookies` (sessão 22), banner na primeira visita.
- **Saídas:** `/cookies` (inventário), `/privacy`.
- **Fora de escopo:** a tabela de cookies (sessão 22), o `LgpdBanner` (arquivo reservado ao Operador por
  D-582.10).

## 2. Arquitetura de informação (reuso do que já funciona)

| # | Bloco | Base real |
|---|---|---|
| 1 | `h1` "Gerenciar cookies" + explicação em uma frase | A CRIAR |
| 2 | **Necessários** (sempre ativos, sem toggle) | implícito no produto (a categoria obrigatória existe no banner) |
| 3 | **Analytics (PostHog)** com toggle | `ConsentBanner.tsx:64` + `use-consent-store.ts:27` |
| 4 | **Monitoramento (Sentry)** com toggle | `ConsentBanner.tsx` (mesma estrutura) + store |
| 5 | **Salvar preferências** / "Aceitar todos" / "Recusar" | `setConsent` (`ConsentBanner.tsx:32-35`) |
| 6 | Ligação para o inventário completo | `/cookies` (sessão 22) |
| 7 | Registro da decisão (o que fica guardado e por quanto tempo) | A CRIAR (ver §11) |

**Propriedade técnica importante (já implementada):** as categorias ficam **também em cookie** para que
middleware/providers as leiam **sem localStorage** (`use-consent-store.ts:17`) — qualquer nova superfície
deve escrever pelo **mesmo** store, nunca por caminho próprio.

## 3. Layout, grid e densidade

- Página simples: três linhas (necessários · analytics · monitoramento) com explicação curta por linha e um
  botão de salvar fixo ao final — ou o **mesmo dialog** do banner, aberto por rota, mantendo **um só**
  componente de toggles (evita divergência de regra entre duas telas).
- Mobile: toggles em linha inteira, alvo ≥ 44 px, botão de salvar em largura total.

## 4. Tokens em uso

Todos de [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Estado ligado/desligado usa o token de acento + rótulo
textual ("Ativado"/"Desativado") — **nunca só cor** (é uma escolha de privacidade: precisa ser inequívoca).

## 5. Estados obrigatórios

| Estado | Hoje | Falta |
|---|---|---|
| 1. Carregando | n/a (estado local, sem fetch) | — |
| 2. **Vazio / sem decisão anterior** | **existe** no banner (primeira visita) — privacidade por padrão: analytics e monitoramento **false** sem escolha (`use-consent-store.ts:21`) | na página: mostrar o padrão atual de forma explícita |
| 3. Erro | n/a (gravação local) | — |
| 4. Não encontrado | n/a | — |
| 5. Sem permissão | n/a | — |
| 6. **Dados parcialmente migrados** | **existe** — migração de consentimento **v1 granular → v2** preservando categorias (D-531) | a página deve refletir a decisão migrada sem pedir de novo |
| 7. Offline | funciona (decisão local; só o envio de eventos falha) | informar isso ao usuário |

## 6. Micro-interações e movimento

- Salvar: confirmação **visível e anunciada** (`aria-live`) — o usuário precisa saber que a escolha valeu.
- Sem animação de "piscar" ao alternar (evita leitura errada do estado).
- Reduced motion: nada aqui depende de animação.

## 7. Acessibilidade AA

- **Decisão já tomada e correta (T474):** no banner, **não** usar `aria-modal="true"` — ele é `role="region"`
  com `aria-label` (`ConsentBanner.tsx:40-48`), porque **não** bloqueia a navegação. A página/dialog novo
  deve preservar essa escolha: se for página, `role` nenhum especial; se for dialog sobreposto, aí sim
  `role="dialog"` + `aria-modal` + foco preso.
- Toggles como **checkbox** com `label` associado (o banner já usa `checked`/`onChange` — conferir a
  associação do rótulo).
- Estado inicial precisa ser **lido corretamente** por leitor de tela ("Analytics, desativado").
- Alvo de toque ≥ 44 px; contraste do rótulo ≥ 4,5:1.

## 8. Copy e i18n

- Namespaces: **`consent`** (já existente: título do banner, `analytics`, `monitoring`, ações) — a página
  nova acrescenta o que for específico de "gerenciar depois".
- **A CRIAR:** texto que diga **o que deixa de acontecer** ao desligar cada categoria ("sem analytics, não
  medimos uso; o produto continua funcionando") — é a informação que faz a escolha ser informada.
- Tom: neutro e sem induzimento (nada de "mantenha ativado para nos ajudar").

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | toggles em largura total; botão salvar fixo no fim |
| 768+ | três linhas compactas com o botão à direita |

## 10. Métricas de sucesso

- **Alterações de preferência após a primeira decisão** — hoje **impossíveis** (P1): a métrica é a própria
  comprovação do problema.
- **Proporção aceitar/recusar** na primeira visita (insumo de produto e de privacidade).
- **Recusas de analytics** e impacto na leitura de dados (aceitar menor volume de dados, honestamente).
- **Reversões** (recusou → aceitou) — mede confiança na explicação.

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | **Depois de decidir, não há como mudar de ideia.** A única superfície de gestão é o dialog **dentro** do `ConsentBanner`, que só aparece enquanto `decided` for falso; não existe rota nem link permanente (o rodapé tem "Seus dados", mas não "Cookies"/"Gerenciar") | `ConsentBanner.tsx:12,16-18,32-35`; rodapé | eu | esta spec |
| **P1** | **Sem link permanente no rodapé** para cookies/gerenciar — o direito de revogar consentimento fica sem porta de entrada | rodapé (seção Legal) | eu | — |
| P2 | **Sem registro/prova da decisão de consentimento** (data, versão do texto, escolhas) além do próprio cookie — útil para defesa e para auditoria | `use-consent-store.ts` (cookie v2) | Operador + eu | — |
| P2 | Mensagem por categoria não explica o **efeito** de desligar | `ConsentBanner.tsx:64` | eu | — |
| P2 | Associação `label`↔`checkbox` no banner a confirmar | `ConsentBanner.tsx:60-70` | eu | AA |
| — | **Não tocar:** `LgpdBanner.tsx` (D-582.10 reserva ao Operador) e o comportamento do banner na primeira visita | — | Operador | D-582.10 |
| — | **Positivo a preservar (é a melhor base do bloco legal):** **privacidade por padrão** (analytics e monitoramento `false` sem escolha, `use-consent-store.ts:21`), categorias em **cookie** para leitura no servidor (`:17`), **migração v1→v2** preservando escolhas (D-531) e a decisão consciente de **não** fingir modal (T474, `ConsentBanner.tsx:40-48`) | `use-consent-store.ts:17,21,26-33`; `ConsentBanner.tsx:32-48` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:evidence -- legal-gerenciar-cookies=/privacy   # estado atual: precisa abrir o banner
grep -n "decided\|setConsent\|role=\|aria-label\|analytics\|monitoring" apps/web/src/components/ConsentBanner.tsx
grep -n "PRIVACY BY DEFAULT\|v1\|v2\|ConsentV2" apps/web/src/stores/use-consent-store.ts
Select-String -Path apps/web/src/messages/pt-BR.json -Pattern '"cookies"|"manageCookies"'   # A CRIAR
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-legal-gerenciar-cookies/` (primeira visita com
banner + dialog "Gerenciar"; e a futura rota, quando criada).

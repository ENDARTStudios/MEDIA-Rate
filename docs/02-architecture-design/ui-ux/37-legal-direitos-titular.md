# UI-UX — Legal: Direitos do Titular (A CRIAR)

> Sessão **24 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). **Não existe página pública.** O que existe é a **máquina no
> produto**: `/user/data` + `LgpdControls` em `/settings`. Evidência:
> `evidencias/ui-ux-legal-direitos-titular/` (capturar `/settings` e `/user/data` como estado atual).

## 1. Identidade da sessão

- **Objetivo do usuário:** exercer um direito de titular (LGPD) sabendo **o que** pode pedir, **como** pedir,
  **em quanto tempo** recebe resposta e **para quem** reclamar se não receber.
- **Persona:** titular de dados — **inclusive quem não tem conta** (ex.: alguém que aparece em uma base de
  terceiro, ou que escreveu para o suporte), caso em que o autoatendimento não serve.
- **Rota proposta:** `/direitos-do-titular` (indexável). Hoje: **AUSENTE**.
- **Entradas:** `/privacy` (a política cita direitos), rodapé ("Seus dados" hoje aponta para `/user/data`,
  que é a ferramenta do produto — não a explicação), e-mails.
- **Saídas:** `/user/data` (exportar), `/settings` (excluir conta), canal de contato, ANPD.
- **Fora de escopo:** Privacidade (20), Segurança (23), Cookies (22/25).

## 2. Arquitetura de informação (ancorada na máquina que já existe)

| # | Bloco | Base real |
|---|---|---|
| 1 | `h1` + `lastUpdated` | padrão legal (D-603) |
| 2 | **Quais direitos** (confirmação, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento, revogação de consentimento) | lista da LGPD; a política já cita direitos por seção (`privacy/page.tsx:51`) |
| 3 | **Autoatendimento** — acesso e portabilidade | `LgpdControls.explorar()`: `GET /api/v1/user/data` gera **arquivo para download** (`LgpdControls.tsx:25-33`) |
| 4 | **Eliminação de conta** | `DELETE /api/v1/user/data` → **202** com **confirmação em dois passos** (`LgpdControls.tsx:5-6,43`) |
| 5 | **Como pedir o que não é autoatendimento** (correção de dado que não é seu, titular sem conta) | **A CRIAR**: canal + formulário/e-mail |
| 6 | **Prazos** (resposta e confirmação) | **A CRIAR**: declarar o prazo legal e o compromisso prático |
| 7 | **Encarregado (DPO)** e contato | **A CRIAR** (a política precisa do mesmo dado) |
| 8 | **Reclamação à ANPD** | **A CRIAR**: link oficial e quando usar |

## 3. Layout, grid e densidade

- Coluna de leitura com uma **tabela de direitos** (`direito → como exercer → prazo`), usando o padrão
  `PipeTable`/`PricingTable` (`<th scope="col">`).
- Dois caminhos visivelmente separados: **"tenho conta"** (autoatendimento, leva a `/user/data` e
  `/settings`) × **"não tenho conta / outro pedido"** (canal humano).

## 4. Tokens em uso

Todos de [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Ação destrutiva (eliminação) usa o padrão de **aviso**
do produto (borda de alerta + texto), nunca só cor.

## 5. Estados obrigatórios

| Estado | Situação |
|---|---|
| 1–5. Carregando / vazio / erro / 404 / permissão | **não se aplicam** na página (estática) |
| 5 (produto) | **existe** em `/settings`: `LgpdControls` mostra `busy`, `confirmDelete`, `deleted` e erro ✓ |
| 6. **Dados desatualizados** | **existe** — prazos e canal mudam; exige `lastUpdated` |
| 7. Offline | benefício do estático |

## 6. Micro-interações e movimento

Sem animação na página. **No produto** (já implementado): exclusão em dois passos — o primeiro clique abre a
confirmação, o segundo executa ✓ (padrão correto para ação irreversível e referência para o resto do
programa, cf. `M8–M14` do admin).

## 7. Acessibilidade AA

- Tabela de direitos com `<th scope="col">`; `h1`→`h2` sem pular nível.
- Links externos (ANPD) com rótulo e indicação de saída (`rel="noopener"`, texto claro).
- O canal de contato precisa ser **texto copiável** (não só link `mailto`), para quem digita à mão.
- Estados de `LgpdControls` já anunciam (`busy`/`deleted`) — **conferir** `aria-live` no retorno da exclusão
  (P2 se ausente).

## 8. Copy e i18n

- Namespace **`rights`** (A CRIAR, com paridade nos 3 locales) + reuso de `settings.cancel*` e
  `settings.lockedFeatures`.
- Linguagem: explicar o direito em uma frase leiga **e** citar o artigo/nome formal entre parênteses (o
  titular e o jurídico precisam dos dois).
- **A CRIAR:** prazo de resposta, explicação de que exclusão é irreversível, e o que **não** é apagado por
  obrigação legal (ex.: registros fiscais de compra) — este último é um ponto que costuma gerar desconfiança
  se omitido.

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | tabela rola na horizontal; caminhos ("tenho conta" × "não tenho") empilham |
| 768+ | tabela completa; os dois caminhos lado a lado |

## 10. Métricas de sucesso

- **Pedidos de titular por canal** (autoatendimento × humano) e **tempo de resposta**.
- **Conclusão do fluxo de exclusão** após iniciar (mede fricção desnecessária no caminho legítimo).
- **Reclamações na ANPD** (métrica de resultado, deve ser zero).
- **Visitas à página** (indica que o direito está achável — hoje não existe).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | **Não existe página de Direitos do Titular.** A política cita direitos, mas não há superfície que explique como exercê-los, em quanto tempo e para quem reclamar | ausência de rota; `privacy/page.tsx:51` | eu | esta spec |
| **P1** | **Titular sem conta não tem caminho**: todo o autoatendimento passa por `/user/data` e `/settings`, que exigem sessão | `LgpdControls.tsx:25,43` | eu | esta spec (§2.5) |
| **P1 — resolvido (D-624)** | Prazo e canal do encarregado **declarados**: a página cita o prazo da LGPD e publica o canal do DPO (`+privacidade`), o de pedidos (`+direitos`) e o de suporte (`+suporte`) | `rightsPage.deadlineBody`/`dpoBody`; `direitos-do-titular/page.tsx` | eu | feito |
| P2 | `aria-live` no retorno da exclusão a confirmar | `LgpdControls.tsx:19,43` | eu | AA |
| P2 | O rodapé diz "Seus dados" apontando para `/user/data` (ferramenta) — sem link para a explicação dos direitos (a página nova) | rodapé (Legal) | eu | — |
| — | **Positivo a preservar (referência de produto):** exportação real com arquivo para download, exclusão em **dois passos** com `DELETE` → 202, estados de `busy`/`deleted` e a store de consentimento lida pelo middleware | `LgpdControls.tsx:5-6,14-43`; `use-consent-store.ts:17` | — | — |

## 12. Evidência e reprodução

```powershell
npm run uiux:auth-env -- --start
$env:API_PROXY_TARGET="http://localhost:4000"; npm run dev --workspace apps/web
npm run uiux:evidence -- --state "$env:TEMP\mr-uiux-auth\state.json" configuracoes=/settings
npm run uiux:auth-env -- --stop --purge

grep -n "user/data\|confirmDelete\|202\|exportar\|excluir" apps/web/src/components/settings/LgpdControls.tsx
Test-Path "apps/web/src/app/[locale]/direitos-do-titular"   # False → página A CRIAR
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-legal-direitos-titular/` (capturar `/settings`
com os controles de LGPD visíveis como estado atual).

# UI-UX — Legal: Segurança (A CRIAR)

> Sessão **23 de 25**. Template em [`01-TEMPLATE.md`](./01-TEMPLATE.md); valores em
> [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). **Não existe rota.** Evidência: `evidencias/ui-ux-legal-seguranca/`.

## 1. Identidade da sessão

- **Objetivo do usuário:** saber **como o MEDIA Rate protege** conta e dados, e **como reportar** uma
  vulnerabilidade — antes de confiar dados pessoais e pagamento.
- **Persona:** público; e o pesquisador de segurança que procura uma política de divulgação responsável.
- **Rota proposta:** `/seguranca` (indexável). Hoje: **AUSENTE**.
- **Entradas:** rodapé, `/privacy`, e-mail institucional.
- **Saídas:** canal de reporte, `/privacy`, `/terms`.
- **Fora de escopo:** Privacidade (20), Termos (21), Cookies (22).

## 2. Arquitetura de informação (tudo ancorado no que o produto **realmente** faz)

A spec exige que a página **declare apenas o que existe e é verificável** — nada de selo decorativo.

| # | Bloco | Base real verificada |
|---|---|---|
| 1 | `h1` + `lastUpdated` | padrão do bloco legal (D-603) |
| 2 | **Proteção de tráfego** | HTTPS; `Strict-Transport-Security` pela plataforma; `Content-Security-Policy` (`next.config.ts:107`) |
| 3 | **Cabeçalhos de proteção** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` (`next.config.ts:98-101`) |
| 4 | **Conta e acesso** | sessão em cookie `HttpOnly`; CSRF nas ações (`getCsrfToken`); **step-up/2FA** para área administrativa (módulo `AdminStepup`) |
| 5 | **Dados** | isolamento por linha no banco (RLS), backups com **PITR** verificados por teste de restauração |
| 6 | **Monitoramento e detecção** | Sentry (erros), verificação de segredos/estática no CI (Gitleaks, CodeQL) |
| 7 | **Divulgação responsável** | `SECURITY.md` existe no repositório ✓ — a página deve espelhar o canal e o compromisso de prazo |
| 8 | **O que NÃO afirmamos** | nenhuma certificação (ISO/SOC 2) é alegada, porque não há |

## 3. Layout, grid e densidade

- Coluna de leitura, seções curtas com `h2`, linguagem simples (público não técnico) + uma subseção técnica
  para pesquisadores.
- **Sem** selos, badges de "100% seguro" ou cadeados decorativos: é a página onde a honestidade vale mais.

## 4. Tokens em uso

Todos de [`02-FUNDAMENTOS.md`](./02-FUNDAMENTOS.md). Ícone de "ok" pode usar `score.high` (verde) — nunca
vermelho/âmbar para "risco" sem explicação textual.

## 5. Estados obrigatórios

| Estado | Situação |
|---|---|
| 1–5. Carregando / vazio / erro / 404 / permissão | **não se aplicam** — documento estático |
| 6. **Dados desatualizados** | **existe e é crítico** — a página descreve controles que mudam; exige `lastUpdated` **e** revisão obrigatória quando um controle muda (o mesmo risco da tabela de cookies) |
| 7. Offline | benefício do estático |

## 6. Micro-interações e movimento

Nenhuma. Página de confiança não deve ter nada que pareça marketing animado.

## 7. Acessibilidade AA

- `h1` + `h2` sem pular nível (padrão D-603); texto corrido com medida ≤ `max-w-[38rem]` (D-603).
- Canal de reporte como **link com rótulo textual** (não só ícone) e com o endereço visível em texto (para
  quem copia à mão).
- Se houver tabela de controles, usar `<th scope="col">` — o padrão existe em duas páginas do repo
  (`PricingTable`, `PipeTable`).
- Sem formulário nesta página (o reporte é por e-mail/canal) → sem armadilha de foco.

## 8. Copy e i18n

- Namespace **`security`** (A CRIAR, com paridade nos 3 locales): título, introdução, seções, canal de
  reporte, `lastUpdated`.
- **Regra de veracidade (a mais importante desta sessão):** não afirmar controle que não existe nem
  certificação que não foi obtida. Se um controle é parcial, dizer que é parcial.
- Tom: direto, sem jargão desnecessário; para a parte técnica, precisão.

## 9. Responsivo e plataformas

| Largura | O que muda |
|---|---|
| 375 | coluna única; endereço de contato quebra linha sem cortar |
| 768+ | coluna de leitura centralizada |

## 10. Métricas de sucesso

- **Visitas a `/seguranca`** (baixas em volume, altas em intenção).
- **Relatos de vulnerabilidade recebidos** e **tempo até a primeira resposta** (a métrica que importa).
- **Ausência de incidentes de exposição** (métrica de resultado, não de página).

## 11. Pendências e achados

| Sev. | Achado | Evidência | Dono | Decisão |
|---|---|---|---|---|
| **P1** | **Não existe página de Segurança** — produto que pede dados pessoais e pagamento não oferece superfície pública que explique proteção e canal de reporte | ausência de rota; `SECURITY.md` existe só no repositório | eu | esta spec |
| **P1** | **`security.txt` ausente** (RFC 9116) — o padrão para publicar o canal de reporte de forma automatizável (`.well-known/security.txt`) | `apps/web/public/.well-known/security.txt` ausente | eu | — |
| P2 | Sem compromisso público de prazo de resposta a relatos (o `SECURITY.md` pode ter; a página deve declarar) | `SECURITY.md` (a conferir no texto) | eu | — |
| P2 | Nada obriga a revisão da página quando um controle muda | ausência | eu | mesma classe da tabela de cookies |
| — | **Positivo a preservar e declarar:** CSP e os 4 cabeçalhos de proteção (`next.config.ts:98-107`), cookie de sessão `HttpOnly`, CSRF nas ações, **step-up/2FA** no admin, RLS no banco, backups com PITR verificados por teste de restauração e monitoramento (Sentry) + varredura de segredos no CI | `next.config.ts:98-107`; `AdminStepup`; sessão de PITR (D-604) | — | — |

## 12. Evidência e reprodução

```powershell
# o que já existe e pode ser declarado com honestidade
Select-String -Path apps/web/next.config.ts -Pattern "X-Frame|nosniff|Referrer-Policy|Permissions-Policy|Content-Security"
Test-Path SECURITY.md                                     # True
Test-Path apps/web/public/.well-known/security.txt        # False → P1
Test-Path "apps/web/src/app/[locale]/seguranca"           # False → página A CRIAR
```

**Capturas:** `docs/02-architecture-design/evidencias/ui-ux-legal-seguranca/` (após criar a página).

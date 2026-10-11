# Biblioteca — overflow horizontal mobile (390x844): correção (T185/UG-14)

**Data:** 2026-10-11 · **Fase:** F05-frontend · **Tarefa:** T185-library-density-mobile-overflow
**PR:** #524 · **Classificação:** `LAYOUT_OVERFLOW_FIX_CONFIRMADO_NO_CI`

> Sanitização: os logs citados contêm apenas geometria (viewport/colunas/overflow/dims)
> e títulos de fixture sintética — nenhum dado real, credencial ou PII.

## 1. Sintoma

O E2E determinístico `apps/web/e2e/library-density.spec.ts:149` ("mobile 390x844 —
>= 2 colunas e sem overflow") falhava nos 2 browsers com `overflowX=true`
(`scrollWidth > clientWidth` no `[data-testid="biblioteca-grid"]`).

## 2. Causa raiz (medida, não inferida)

Linha `[density]` do run `38151400528` (job E2E Full, T184), viewport 390x844:
`columns:3, overflowX:true, dims:{width:111}` — o breakpoint **`xs: 360px`**
(`apps/web/tailwind.config.ts`) ativava `xs:grid-cols-3`, espremendo ~111px por card.
O rodapé de cada item (glyph + rótulo de status + tipo + botão Remover, largura
mínima ≈150px) não cabe em 111px → estouro horizontal do grid.
Desktop 1280x800: 6 colunas de 193px, sem overflow (não regredido).

## 3. Correção (frontend-only)

- `apps/web/src/components/biblioteca/BibliotecaClient.tsx`:
  - grid: base **2 colunas** (removido o degrau `xs:grid-cols-3`; degraus agora
    começam em `sm`/640px) → 390px volta a 2 colunas (~173px por card, densidade
    legível e sem cards apertados);
  - rodapé do item: `flex-wrap` + `data-testid="biblioteca-item-footer"` (quebra
    linha sob pressão em vez de estourar; em 2 colunas permanece em linha única).
- **Nenhuma asserção de teste foi alterada**; nenhum skip/fixme/retry/timeout.

## 4. Antes → depois (mesma medição, no CI)

| Viewport | Antes (run `38151400528`) | Depois (run `38158220006`) |
|---|---|---|
| 390x844 | columns=3 · overflowX=**true** · card 111px | columns=**2** · overflowX=**false** · card **173px** |
| 1280x800 | columns=6 · overflowX=false · card 193px | columns=6 · overflowX=false · card 193px (**inalterado**) |

- Run do PR: **38158220006** · job E2E Full: **114525513868** · conclusão: **success** (3m19s).
- O job E2E Full completo (jornada crítica 3x + densidade) voltou a ficar verde —
  sinal de CI restaurado.

## 5. TDD

- **Novo** `apps/web/test/library-density.spec.tsx` (contrato de classes que sustenta a
  correção): **3/3 vermelhos antes** do fix (degrau `xs:` presente; rodapé sem
  `flex-wrap`/testid) → **3/3 verdes depois**.
- `apps/web/test/biblioteca.spec.tsx` 12/12; suíte web completa **82 arquivos / 554
  testes** verdes; `tsc` web 0; `eslint` 0; `prettier` limpo.
- **Limitação registrada:** a reprodução local do E2E com API+DB não foi possível
  (Docker daemon indisponível na máquina); a evidência utilizada é a do CI (red no
  ciclo anterior e green neste PR), com a correção guardada por teste componente
  determinístico.

## 6. Docs alteradas

`docs/03-development-process/TESTING.md` (seção de regressão da densidade mobile) ·
`worklog.md` · `.claude/exchange_log.jsonl` (local) · este relatório.

## 7. Escopo/auditoria

- Diff: 3 arquivos de código/teste (commit 1) + docs (commit 2). Backend/schema/auth/
  billing/infra/workflows de segurança/PRs #515/#518/#522/spec untracked do T176/.env
  e `.env.example` **intocados**.
- Contaminação 123ce28e ausente. Smoke pós-merge: 7/7 (registrado no STATUS).
- Nenhum valor de segredo/PII impresso em qualquer etapa.

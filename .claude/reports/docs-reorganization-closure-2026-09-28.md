# Encerramento — Projeto 2: Reorganizacao de Documentacao (2026-09-28)

**Status:** ENCERRADO. **Base:** `main` = `73c8a4e2`. **Escopo:** `docs/` + 1 guarda de CI. **Impacto em produto/seguranca/producao: nenhum.**

## 1. Fases e PRs
| Fase | PR | Merge | Conteudo |
|---|---|---|---|
| 1 | #307 | — | 8 pilares + 20 esqueletos (aditiva; zero quebra) |
| 2 | #308 | `c5bfafe4` | 37 movimentos + 26 refs remapeadas + 1 link `../` |
| 3 | #310 | `6e2c34c3` | 6 fusoes (nota de origem) + 9 stubs de 3 linhas |
| 4 | #311 | `5432b359` | 28 movimentos + 121 refs + 2 duplicatas fundidas |
| 4b + linkcheck | #314 | `73c8a4e2` | 6 diretorios em bloco + 78 refs + guarda offline no CI |

## 2. Contagens
- **71 movimentos** (37 + 28 + 6 diretorios) — todos via `git mv` (historico preservado).
- **225 referencias** reescritas (26 + 121 + 78) — todas **byte-safe** (roundtrip Latin-1 28591), preservando o encoding misto de `DECISOES.md`/`worklog.md`.
- **9 stubs de governanca** criados na Fase 3 + 10 ponteiros remanescentes por design na raiz de `docs/`.

## 3. Guarda permanente (o ganho duradouro)
`scripts/ci/linkcheck.mjs` (offline, sem rede) + `linkcheck.self-test.mjs` (**11/11**), rodando no job `docs-gate`
a cada PR. Valida links relativos e ancoras em todos os `.md`; ignora code fences, URLs externas e falsos positivos
de prosa (ex.: `[UTF8Encoding]($false)`). **Ja provou valor:** capturou **41 links quebrados herdados** das fases 2/4
(ex.: `docs/README.md`, `docs/03-development-process/TESTING.md`) — todos corrigidos. Resultado final no CI: **0 quebrados**.

## 4. Licoes permanentes (registradas em `docs/STYLE_GUIDE.md` + `DECISOES.md`)
**L1 — Print-width em reescrita de referencias (#311).** Alongar uma linha (ex.: `docs/E2E.md` -> `docs/06-devops-deployment/E2E.md`)
estourou o print-width do prettier em 4 specs e2e -> `Lint & Audit` vermelho.
**Regra:** antes de qualquer push que reescreva referencias, rodar **hygiene direcionada** — `npx eslint --fix` + `npx prettier --check`
exatamente nos arquivos alterados (o lint repo-wide segue sendo autoridade do CI).

**L2 — Ordem de steps vs `actions/checkout` (#314).** Steps que leem arquivos do repo foram inseridos **antes** do checkout
-> workspace vazio -> `Cannot find module .../linkcheck.self-test.mjs`.
**Regra:** step que usa arquivos do repo **deve vir depois do `actions/checkout`**; validar com `yaml.parse` **e conferir a ORDEM dos
steps**, nao apenas a sintaxe. *(O log correto saiu via `gh api repos/<owner>/<repo>/actions/jobs/<id>/logs` — o `gh run view --log` voltou vazio.)*

## 5. Arvore final de `docs/`
8 pilares (`01-product-discovery` … `08-knowledge-management`) + `README.md` (indice) + **10 stubs/ponteiros por design**
(`SECURITY`, `SEO_AEO_AIO_GEO`, `OBSERVABILITY`, `PADROES_DESENVOLVIMENTO`, `BOAS_PRATICAS_DEPLOY`, `RUNBOOK_PRODUCAO`,
`DEPLOY_CLOUDFLARE`, `conformidade-v13`, `INTEGRATIONS`, `ITERATION`). Diretorios contextuais preservados e realocados
em bloco: `05/legal/`, `06/runbooks/`, `04/api/`, `07/{auditoria,screenshots,lighthouse-reports}/`.

## 6. Declaracao final
- Projeto 2 **formalmente ENCERRADO**; nenhum conteudo foi perdido ou alterado em movimento/fusao.
- **O status de Beta NAO muda:** GO tecnico estrutural mantido; **convites suspensos** pelo programa BETA-GAP
  (**1/18** concluido — BETA-GAP-09). Proxima acao: **T110** (robustecer o spec de medicao de layout do BETA-GAP-13/14).

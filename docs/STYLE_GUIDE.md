
## Licoes permanentes — reorganizacao de docs (Projeto 2, 2026-09-28)

**L1 — Higiene pre-push em reescrita de referencias (incidente #311).** Mover arquivo altera o comprimento das linhas;
referencias mais longas podem estourar o **print-width** do prettier (ocorreu em 4 specs e2e -> `Lint & Audit` vermelho).
**Regra:** antes do push, rodar `npx eslint --fix` **e** `npx prettier --check` **exatamente nos arquivos alterados**.
O lint repo-wide continua sendo autoridade do CI.

**L2 — Ordem de steps de CI vs `actions/checkout` (incidente #314).** Step que le arquivos do repo inserido ANTES do
checkout roda em workspace vazio (`Cannot find module ...`).
**Regra:** todo step que depende de arquivos do repo deve vir **depois** do `actions/checkout`; validar o YAML com
`yaml.parse` **e conferir a ordem dos steps**. Para logs de job, usar `gh api .../actions/jobs/<id>/logs` quando
`gh run view --log` voltar vazio.

**L3 — Edicao byte-safe de arquivos historicos.** `DECISOES.md`/`worklog.md` tem encoding misto: usar roundtrip
**Latin-1 (28591)** em `ReadAllBytes/WriteAllBytes` — nunca `ReadAllText`+`WriteAllText` (gera mojibake/diff fantasma).
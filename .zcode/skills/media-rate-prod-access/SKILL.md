---
name: media-rate-prod-access
description: >
  Acesso SOMENTE LEITURA à produção do MEDIA Rate: receita completa do railway ssh
  (script Node via base64 em /app, bootstrap RLS, apenas agregados), guard de disco do
  Postgres (D-574), smoke canônico e o que exige o Operador (aprovar deploy, rotação,
  purge). Use ao verificar estado de dados em produção, contas, sessões, auditoria,
  tamanho do banco ou saúde do site.
---

# MEDIA Rate — Acesso a produção (read-only)

Regras duras: **proibido** mutação (INSERT/UPDATE/DELETE/pg_ctl), alterar
Railway/Vercel/secrets, aprovar o deploy `waiting`, imprimir PII/valores/e-mails reais
(só domínios de teste). Sondagens = **agregados** (count/groupBy) — o Operator decide
qualquer escrita.

## Receita railway ssh (validada T184)

- Projeto/ambiente: `--service "MEDIA Rate" --environment production`.
- Container: `WORKDIR /app` (node v20, `node_modules/`, `dist/`, `prisma/`); **o
  `/tmp` não enxerga `node_modules`** — rode o script de `/app` e limpe depois.
- Envie o script por **base64** (evita quoting; nada de `$`/aspas no caminho):

```bash
B64=$(base64 -w0 mnt/query.cjs)
MSYS_NO_PATHCONV=1 railway ssh --service "MEDIA Rate" --environment production -- \
  sh -c "echo $B64 | base64 -d > /app/query.cjs; node /app/query.cjs; rm -f /app/query.cjs"
```

- Script modelo (sem `$`, sem aspas simples; só agregados):

```js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const rls = require("./dist/common/rls-context.js");            // bootstrap RLS (obrigatório)
  await rls.bootstrapRlsSeed(prisma);
  const totalGeral = await prisma.usuario.count();                // sanity: >0 = RLS ok
  const teste = await prisma.usuario.count({ where: { email: { endsWith: "@mediarate.test" } } });
  console.log(JSON.stringify({ totalGeral, teste }));
  process.exit(0);
})().catch((e) => { console.error("ERR:" + String(e && e.message || e).slice(0, 200)); process.exit(1); });
```

- `/app` é efêmero (deploy redeploya e limpa) — sempre recrie o script por execução.
- Guard de disco: `pg_database_size` (D-574: volume 5GB; alerta em ~85%).

## Smoke canônico

6 páginas web + `/health` da API Railway, com **User-Agent de browser** (curl puro
leva 429). Rota do catálogo: `/catalog` (nunca `/catalogo`). Detalhes e o loop pronto
em `.zcode/skills/media-rate-ci-ops/SKILL.md` (§ Merge e smoke).

## O que NUNCA é do agente (Operador)

Aprovar o deploy `waiting` no environment Production · rotação de chaves · purge de
histórico · mudança de visibilidade do repo · habilitar/desabilitar features de
plataforma · responder templates de decisão em `PENDENCIAS_OPERADOR.md`.

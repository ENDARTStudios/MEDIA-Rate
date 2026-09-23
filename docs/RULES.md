# RULES — Regras invioláveis do projeto

Digest executável. Fontes primárias: `AGENTS.md` (raiz), `DECISOES.md`,
`docs/BOAS_PRATICAS_SECRETS.md`. Violar qualquer regra aqui = PR rejeitado.

## Repositório e CI

1. **Nenhum merge em `main` sem CI verde** (D-457/T459). Push direto com bypass é
   proibido; exceção só em incidente, registrada em `DECISOES.md`.
2. **npm (package-lock), nunca pnpm.** Testes: `vitest` com `NODE_ENV=test`
   (web: rodar de `apps/web`; api: de `apps/api`).
3. **PRs só-de-docs** são gateados pelo `docs-gate` (leve, required); jobs pesados
   pulam docs-only (D-382/D-457).
4. **PR que altera `apps/api/prisma/migrations/**` ou `schema.prisma`** exige
   label `migration-review` + seção `## Rollback` + linha `Migration:` — check
   `Migration Safety (B1)` é **required** (D-532/D-535; contrato em
   `docs/b1-prod-guards.md`).
5. **Strays que não se commitam**: `.od-skills/`, protótipos `*.html`,
   `*.sketch.json`, `apps/web/scripts/_*.mjs`, `.claude/` (exceto o que já é
   trackeado com `-f`).

## Código

6. **i18n nas 3 línguas com paridade** (`apps/web/src/messages/{pt-BR,en-US,es-ES}.json`)
   — validar JSON após editar; guard de chaves ausentes roda no CI; guard D-210
   reprova BOM/mojibake.
7. **Máquina de estados de consumo (D-528/D-529)**: `CONCLUIDO → ABANDONADO` é
   proibido em API, UI e E2E. Fonte única: `apps/api/src/common/estados-consumo.ts`.
8. **Nunca dois loggers de request** (D-531): logger único = nestjs-pino
   (`AppLoggerModule`); nada de `logger:` no FastifyAdapter.
9. **Params que mapeiam colunas `@db.Uuid`** usam `UuidParamPipe` → 404 pré-Prisma
   (nunca 500 por P2023).
10. **Mocks de Prisma refletem tipos reais** (D-447: `bigint`→`BigInt`, `bytea`→
    `Buffer`); endpoint novo exige teste que serializa a resposta (`JSON.stringify`).
11. **TDD nos gaps apontados pelo review** (padrão do projeto: vermelho→verde com
    evidência, ex.: T028 `param-uuid-404.spec` 6 vermelhos → 8 verdes).

## Segredos e dados

12. **Segredos (`sk_`, `whsec_`, senhas DB, credenciais de teste) NUNCA** em
    chat/log/commit/evidência; só em `.env` (gitignored) / secret manager. O
    docs-gate é fail-closed no arquivo inteiro de PRs que tocam docs.
13. **`tenant_id` é infraestrutura** — nunca exposto em resposta (T289).
14. **Logs redigem sensíveis** (authorization/cookie/x-csrf-token/password/…);
    PII de auth mascarada (T049). Nunca logar DATABASE_URL.

## Operação

15. **`main` é produção** (D-527). Confirmar produção após merge de mudança visível
    (smoke padrão: `docs/QA_TESTING.md`).
16. **NUNCA** executar `migrate-production.yml` sem o caminho de rede decidido
    (P013); migrations em produção são do entrypoint do Railway no boot.
17. **Rollback** = `git revert` do merge commit. Force push/reset em `main`: proibido.
18. **Texto legal** (Termos/Privacidade/rodapé): só com o gate legal (T464) e
    consistência entre Termos, Política e rodapé.
19. **Graft-first** (AGENTS.md): navegar pelo grafo antes de ler/editar; sem grafo
    (índice vazio), cair para grep/read ANTES de editar.
20. **Consentimento analytics**: nada de PostHog sem consentimento `analytics` (T432).

# Clear-text-logging no seed de origem (CodeQL `js/clear-text-logging`) — correção (T193)

**Data:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T193-codeql-runtime-clear-text-logging-fix
**Classificação:** `CLEAR_TEXT_LOGGING_MITIGADO_COM_REDATOR_E_TDD` — nenhum alerta foi interagido.

## 1. Sintoma (origem)

Alerta **HIGH `js/clear-text-logging`** em `apps/api/prisma/seed-origem.ts` (triagem T189).

## 2. Causa raiz (vetor real)

O `fetchTmdb` monta a URL com **`api_key=<valor>` na query** e lançava
`TMDB <status>: <path>` — a mensagem carregava a URL inteira **com a chave**. O
`console.error(e)` do script imprimia mensagem **e stack**. Nem o `redact` do Pino
(propriedades do log HTTP) nem o `sanitizarPii` (D-543, objetos) cobrem **mensagens
soltas** — exatamente a lacuna.

## 3. Correção (escopo cirúrgico)

| Arquivo | Papel |
|---|---|
| `apps/api/src/common/log-redactor.ts` (novo, puro) | Nível **string**: pares sensíveis (`password/senha/secret/token/api_key/apikey/client_secret/admin_token/session_secret/database_url`) → `[REDACTED]`; `Authorization`/`Cookie` (lookahead `(?!Bearer)` p/ não consumir o Bearer já redigido); `Bearer <token>`; credenciais de URL → `scheme://[REDACTED]@host` (preserva host); e-mail via `mascararEmail` (D-543; nunca re-mascara marca/URL); trunca 500. Nível **objeto**: recursivo ciclo-safe (≤6) com chaves sensíveis → `[REDACTED]`; `resumoSeguro`; `redigirErro` = **nome + mensagem, nunca stack** |
| `apps/api/prisma/seed-origem.ts` | erro do fetch nasce redigido (defesa em profundidade); `executar()` com `console.error` sanitizado; guarda `isDirectRun` + export de `main`/`fetchTmdb`/`executar` (padrão D-275; testável sem DB) |

Comportamento funcional do seed preservado (mesmas chamadas TMDB/updateMany; log de
progresso continua com a contagem).

## 4. TDD (vermelho → verde; sem banco real/rede)

- **RED:** 2 specs falhando (módulo ausente + seed sem export/guarda).
- **2 lacunas achadas pelo próprio TDD:** (a) `Authorization: Bearer` tinha o valor
  duplamente processado (Bearer consumido pela regra de header) → lookahead
  `(?!Bearer\b)`; (b) com host com ponto, a regra de **e-mail re-mascarava a URL já
  redigida** (`//[REDACTED]@db.exemplo.invalid`) → guarda p/ nunca mascarar
  descendentes de marca/URL (`[`, `/`).
- **GREEN:** `log-redactor.spec.ts` (matriz string/objeto/erro) + `seed-origem-logging.spec.ts`
  (fetch/Prisma/console mockados: 401, falha de rede, caminho feliz com contagem segura,
  defesa em profundidade do `fetchTmdb`) — **20/20 verdes**; suíte API completa
  **1277/1277**; `tsc` 0; `eslint` 0; `prettier` limpo.
- A prova do vetor é explícita no spec: a URL capturada pelo mock-contém a
  chave-fixture na query **enquanto nenhum log a contém**.

## 5. Escopo/auditoria

Diff restrito a: `log-redactor.ts`, `seed-origem.ts`, 2 specs, doc
`SECURITY_CODEQL_RUNTIME.md` (§2c + história), este relatório e worklog. **Sem**
deps/workflows/GitHub settings/schema/auth/billing/incidente/expressões T191–T192.
Nenhum alerta interagido. Contaminação 123ce28e ausente.

## 6. Follow-up

- Se o CodeQL mantiver o alerta (redator custom não reconhecido — precedente #151/#86),
  registrar e escalar; **nunca** suppress/dismiss (decisão do Operador).
- Última regra da fila: **T194** (`js/incomplete-sanitization` no `cache.service.ts`).

## 7. Confirmações

Nenhum valor de segredo/PII impresso; nenhuma dep/infra/produção/segredo alterados;
smoke pós-merge 7/7 (STATUS).

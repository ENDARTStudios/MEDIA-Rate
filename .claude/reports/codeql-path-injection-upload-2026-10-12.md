# Path-injection no upload (CodeQL `js/path-injection`) — correção (T192)

**Data:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T192-codeql-runtime-path-injection-fix
**Classificação:** `PATH_INJECTION_MITIGADO_COM_GUARD_E_TDD` — nenhum alerta foi interagido.

## 1. Sintoma (origem)

Alerta **HIGH `js/path-injection`** reportado em `upload.controller.ts` (triagem T189) — a
ponta pública é o `GET /uploads/media/:midiaId/:filename` (`UploadsController.servir`), que
compõe caminho via `UploadService.caminhoArquivo` e lê com `readFile`.

## 2. Causa raiz (mecanismo real)

Filesystem local (`uploads/media/<midiaId>/<filename>`). O código já sanitizava
(`midiaId.replace(/[^a-zA-Z0-9-]/g, "")` + regex estrita no filename gerado por nós), mas o
**CodeQL não reconhece esses padrões custom como sanitizers** de path → taint `@Param` →
`path.join` → `readFile` (mesma classe do #151/SSRF).

## 3. Correção (escopo cirúrgico)

| Arquivo | Papel |
|---|---|
| `apps/api/src/common/path-guard.ts` (novo) | `segmentoSeguro` (rejeita vazio; `.`/`..`/`..` embutido; separadores `/`\|`\`; drive/absoluto; `~`; controle/NUL; **decodificação até 2 níveis** para `%2e%2e`, `..%2f`, `..%252f`), `garantirContencao` (`resolve` + `startsWith(base + sep)`) e `caminhoContidoNaBase`; erros sanitizados (só o motivo, nunca o valor) |
| `apps/api/src/modules/upload/upload.service.ts` | `salvar`/`salvarVariantes`/`remover`/`caminhoArquivo` montam caminho **somente** via guard (contenção em `uploads/media`); `caminhoArquivo` mantém regex estrito do nome gerado (UUID+variant+ext) e devolve `null` → 404 para qualquer entrada rejeitada; log só com rótulo curto |

Sem mudanças em `http.utils.ts`/`url-guard.ts`/`ip-guard.ts` (T191 preservado).

## 4. TDD (vermelho → verde; sem produção/bucket)

- **RED:** `path-guard.spec.ts` + `upload-service-path-guard.spec.ts` falhando (módulo/branches),
  incluindo o caso-lacuna que o próprio TDD revelou: o segmento `"."` sozinho escapava do
  `includes("..")` — corrigido no guard.
- **GREEN:** 3 specs novas (guard puro; service com fs real **apenas** em `uploads/media`
  gitignored + cleanup; controller com 404 sem tocar disco) + regressão `upload.spec.ts` —
  **76/76 verdes**; suíte API completa verde; `tsc` 0; `eslint` 0 (ajuste para
  `no-control-regex` com varredura por codePoint); `prettier` limpo.
- Legítimos preservados: filename com espaços/acentos; UUID e variantes `-w320/640/960`;
  extensões jpg/png/gif/webp; `Content-Type` e `nosniff` inalterados.

## 5. Escopo/auditoria

Diff restrito a: `path-guard.ts`, `upload.service.ts`, 3 specs novas, doc
`SECURITY_CODEQL_RUNTIME.md`, este relatório e worklog. **Sem** deps/workflows/GitHub
settings/schema/auth/billing/incidente/expressões T191. Nenhum alerta interagido.
Contaminação 123ce28e ausente.

## 6. Follow-up

- Se o CodeQL mantiver o alerta (guard custom não reconhecido — precedente do #151),
  registrar e escalar; **nunca** suppress/dismiss (decisão do Operador).
- Próximas regras: T193 (`js/clear-text-logging` no seed) e T194
  (`js/incomplete-sanitization` no cache.service).

## 7. Confirmações

Nenhum valor de segredo/PII/caminho sensível impresso; nenhuma dep/infra/produção/segredo
alterados; smoke pós-merge 7/7 (STATUS).

# Incomplete-sanitization no cache.service (CodeQL `js/incomplete-sanitization`) — correção (T194)

**Data:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T194-codeql-runtime-incomplete-sanitization-fix
**Classificação:** `INCOMPLETE_SANITIZATION_MITIGADO_COM_MATCHER_ANCORADO_E_TDD` — nenhum alerta foi interagido.

## 1. Sintoma (origem)

Alertas **HIGH `js/incomplete-sanitization`** (triagem T189), todos o mesmo idiom:

| Alerta | Local |
|---|---|
| #94 | `apps/api/src/common/cache.service.ts:108` |
| #95 | `apps/api/test/cache.e2e.spec.ts:36` (FakeRedis) |
| #96 | `apps/api/test/cache.service.spec.ts:27` (FakeRedis) |
| #97 | `apps/api/test/media-admin-crud.e2e.spec.ts:61` (FakeRedis) |

## 2. Causa raiz (vetor real)

O fallback de memória do `CacheService.delPattern` filtrava chaves com
`k.includes(pattern.replace("*", ""))`:

- **replace parcial** — só o **primeiro** `*` era removido: `"a:*:b*"` virava `"a::b*"`
  (o `*` residual sobrevivia à "sanitização");
- **match sem âncora** — `includes` casa o prefixo em qualquer posição da chave.

Consequências funcionais (divergência memória ≠ Redis KEYS):

1. padrões com múltiplos wildcards **não removiam nada** da memória (o Redis casaria);
2. **namespace escape** no fallback: `delPattern("midias:*")` apagava `x:midias:1`
   da memória mesmo com o Redis preservando a chave.

## 3. Correção (escopo cirúrgico)

| Arquivo | Papel |
|---|---|
| `apps/api/src/common/cache-key-guard.ts` (novo, puro) | `validarPattern`: fail-closed (ausente/vazio/não-string, > 256, controle NUL/`\n`/`\r`/tab/DEL, metacaracteres não suportados `? [ ] \` — único wildcard é `*`; erro **nunca** inclui o valor). `combinaPattern`: glob `*`-only **ancorado** (prefixo/sufixo/literais em ordem, busca mais-à-esquerda), sem `replace` parcial e sem regex construída |
| `apps/api/src/common/cache.service.ts` | `delPattern` valida **antes** de tocar memória/Redis (inválido lança sem efeitos colaterais) e filtra com o matcher ancorado; `keys`/`del`, TTL, invalidação e degradação inalterados |
| `apps/api/test/cache.service.spec.ts` · `cache.e2e.spec.ts` · `media-admin-crud.e2e.spec.ts` | FakeRedis dos 3 specs passa a usar o mesmo matcher (remove o idiom replicado — #95/#96/#97) e fica fiel ao glob do Redis |

## 4. TDD (vermelho → verde; sem Redis real/rede/DB)

- **RED:** 2 specs novos falhando — helper ausente + proveito dos 3 vetores contra o
  código atual: namespace escape (`x:midias:1` removida), multi-wildcard (`a:*:b*` sem
  efeito na memória) e ausência de fail-closed (pattern com `\n` chegava ao `redis.keys`).
- **Oracle independente:** o spec do service usa um FakeRedis com regex própria (glob
  `*`-only) — o teste não depende do guard que está sendo validado.
- **GREEN:** `cache-key-guard.spec.ts` (matriz de validação + 29 casos de matching) e
  `cache-service-sanitization.spec.ts` (escape, multi-wildcard, fail-closed sem efeitos
  colaterais, erro sem vazar o valor, degradação, `invalidateOnWrite`, logs sem valor) —
  **46/46**; specs de cache/e2e afetados **74/74**; suíte API completa **1323/1323**;
  `tsc` 0; `eslint` 0; `prettier` limpo.
- Casos de fidelidade cobertos no matcher: `midias:` casa `*` vazio (como Redis),
  case-sensitive, literais adjacentes (`a**b`), sobreposição (`ab*ab`), literal ausente
  (`a*b*c` × `ac` = false).

## 5. Escopo/auditoria

Diff restrito a: `cache-key-guard.ts` (novo), `cache.service.ts`, 3 specs com FakeRedis,
2 specs novos, doc `SECURITY_CODEQL_RUNTIME.md` (§2d + status + histórico), este relatório
e worklog. **Sem** deps/workflows/GitHub settings/incidente/produção/segredos; sem tocar
T191–T193 (url/ip/path-guard, log-redactor, seed, upload, http.utils). Nenhum alerta
interagido. Contaminação 123ce28e ausente.

## 6. Follow-up

- O sink do alerta (#94) foi **removido** (não há mais replace parcial) — expectativa de
  fechamento na próxima análise; se persistir, registrar e escalar (nunca suppress).
- Fila runtime CodeQL **esgotada** (4/4 mitigadas). Restam higiene de testes/e2e/scripts
  (opcional) e a triagem humana dos alertas #151/#86/#85.

## 7. Confirmações

Nenhum valor de segredo/PII impresso; nenhuma dep/infra/produção/segredo alterados;
smoke pós-merge 7/7 (STATUS).

# Substring como validação de URL em specs de teste (CodeQL `#89`–`#92`) — correção (T196-A)

**Data:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T196-A-codeql-test-substring-sanitization-fix
**Classificação:** `TEST_SUBSTRING_SANITIZATION_MITIGADO_SEM_ENFRAQUECER_ASSERCOES` — nenhum alerta foi interagido.

## 1. Sumário

Os 4 alertas `js/incomplete-url-substring-sanitization` que restavam em **código de teste**
(replicando no teste o anti-padrão removido do runtime na T196-C) foram corrigidos para
**comparação de hostname parseado** — preservando a intenção original de cada asserção/roteamento
de mock e sem enfraquecer nada. Zero mudança de produção; zero interação com alertas.

| # | Arquivo (real) | Linhas |
|---|---|---|
| #89 | `apps/api/test/audit-igdb-ids.spec.ts` | 139/141 (bloco do `resolverIdIgdb`) |
| #90 | `apps/api/test/audit-igdb-ids.spec.ts` | 154/156 (re-mapeamento por nome) |
| #91 | `apps/api/test/audit-igdb-ids.spec.ts` | 405/407 (`stubIgdb`) |
| #92 | **`apps/web/test/game-posters-integrity.spec.ts`** | 26 (+38, mesmo padrão) |

> Nota: o packet T196-A citava `apps/api/test/game-posters-integrity.spec.ts` para o #92; o
> arquivo real é **`apps/web/test/game-posters-integrity.spec.ts`** (teste puro — dentro do
> escopo permitido de `apps/api/test` ou `apps/web/test`).

## 2. Intenção original (preservada)

- **#89/#90/#91** — `mockFetch` roteia a resposta pelo host chamado:
  `if (url.includes("id.twitch.tv")) → token` e `if (url.includes("api.igdb.com")) → IGDB`.
  Intenção: escolher **qual** resposta mockar conforme o serviço; não é allowlist de segurança.
- **#92** — asserções de integridade do catálogo: "0 games com pôster do domínio de filme
  (TMDb)" e "pôsteres de games vêm dos domínios de games (steam/wikimedia)".

Observação: os `body.includes("search")` / `body.includes('where slug = …')` do mesmo arquivo
são inspeção do **corpo GraphQL** da query (não URL) e **não** foram tocados.

## 3. Mudança aplicada

Helper local em cada spec (test-only; sem tocar produção):

```ts
function hostDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
```

- `audit-igdb-ids.spec.ts` — **6 substituições**: `url.includes("id.twitch.tv")` →
  `hostDe(url) === "id.twitch.tv"` (3×) e `url.includes("api.igdb.com")` →
  `hostDe(url) === "api.igdb.com"` (3×).
- `game-posters-integrity.spec.ts` — **2 substituições**: `m.posterUrl.includes("image.tmdb.org")`
  → `hostDe(m.posterUrl) === "image.tmdb.org"`; e `GAME_DOMAINS.some((d) => url.includes(d))` →
  `GAME_DOMAINS.some((d) => hostDe(url) === d)`.

**Por que não enfraquece (e sim fortalece):** o `includes` casaria `evil.example/?u=api.igdb.com`
(host enganoso) e um pôster cujo path contivesse o domínio; a comparação de hostname **rejeita**
esses casos. A intenção (rotear pelo serviço; validar o domínio do ativo) fica **mais precisa**.

Proibições respeitadas: sem `skip`/`fixme`/`expect.soft`, sem retry/sleep/timeout inflado, sem
remoção de casos, sem troca de asserção forte por fraca.

## 4. Evidência (sem rede externa; URLs sintéticas)

- `apps/api/test/audit-igdb-ids.spec.ts` — **25/25**;
- `apps/web/test/game-posters-integrity.spec.ts` — **7/7** (inclusive o teste "game posters come
  from game domains", que passa com hostname exato);
- suíte API completa — **1375/1375** (162 arquivos);
- `tsc` API **0** e web **0**; `eslint` 0; `prettier` limpo.

## 5. Confirmações

Nenhum alerta interagido (verificação apenas por GET pós-merge); nenhum código de produção
alterado (diff = 2 specs); nenhum segredo/PII impresso; `#151`, `#93/#98/#149`, Trivy, deps,
incidente, GitHub settings e produção intocados. Contaminação `123ce28e` ausente; PR com
required verdes e smoke 7/7 (STATUS).

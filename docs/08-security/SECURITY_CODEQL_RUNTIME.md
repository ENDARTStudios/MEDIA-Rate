# Política — Correções de achados CodeQL de RUNTIME

**Origem:** T189 (triagem) + T191 (primeira correção — SSRF). Complementa
`SECURITY_ALERTS_TRIAGE.md` (como triar, o que registrar, quando escalar) e `SECURITY_CI.md`.

## 1. Fila herdada da triagem (T189)

| Regra | Arquivo | Status |
|---|---|---|
| `js/request-forgery` (SSRF) — **critical** | `apps/api/src/modules/media-score/adapters/http.utils.ts` | **MITIGADO (T191)** — §2 |
| `js/path-injection` — high | `apps/api/src/modules/upload/upload.controller.ts` (sink em `UploadService.caminhoArquivo`) | **MITIGADO (T192)** — §2b |
| `js/clear-text-logging` — high | `apps/api/prisma/seed-origem.ts` | **MITIGADO (T193)** — §2c |
| `js/incomplete-sanitization` — high | `apps/api/src/common/cache.service.ts` (+ fakes de teste) | **MITIGADO (T194)** — §2d |
| higiene não-runtime (8 alertas) | vários | **TRIADO (T195)** · **#88 MITIGADO (T196-C)** (§2e) · **#89-#92 MITIGADOS (T196-A)** · **#93/#98/#149 MITIGADOS (T196-b)** — **fila não-runtime ENCERRADA** (só #151, humano) |

## 2. Caso 1 — SSRF em `http.utils` (T191): desenho da mitigação

- **`apps/api/src/common/url-guard.ts`** — allowlist **explícita** de hosts outbound
  (constantes no código; nunca domínio amplo), somente **HTTPS**, **sem userinfo**,
  **IP literal sempre bloqueado** (inclui formas que o parser WHATWG normaliza, ex.:
  `2130706433` → `127.0.0.1` e `[::1]`), subdomínio permitido **sem “sufixo armadilha”**
  (`x.host-permitido` sim; `host-permitido.evil.example` não), e validação do **IP
  resolvido** com **fail-closed** (erro/vazio ⇒ bloqueia) — mitigação básica de
  **DNS rebinding**.
- **`apps/api/src/common/ip-guard.ts`** — classificação pura de IPs v4/v6: loopback,
  privados (10/8, 172.16/12, 192.168/16), link-local/metadata (169.254/16), CGNAT,
  documentação/reservados/multicast, ULA/link-local IPv6, 6to4, teredo, NAT64 e
  IPv4-mapeado (com recursão no embutido).
- **`http.utils.ts`** — todo outbound passa pelas guardas; **redirects são manuais**
  (máx. 3 saltos, **cada hop revalidado**; POST **não** segue redirect); **erros
  sanitizados** (origem + path, **sem query** — que pode conter chave de API; a URL
  completa nunca entra em erro/log); timeout mantido (8s padrão).
- **Adicionar host novo:** editar `HOSTS_EXTERNOS_PERMITIDOS` (entrada explícita e
  específica) + teste de regressão. Ex.: o guard real detectou o host legítimo do
  OpenCritic via RapidAPI (`opencritic-api.p.rapidapi.com`) ausente da primeira
  varredura — adicionado com teste.

## 2b. Caso 2 — path-injection no upload (T192): desenho da mitigação

- **`apps/api/src/common/path-guard.ts`** — `segmentoSeguro` rejeita: vazio, `.`/`..`/qualquer
  `..` embutido, separadores (`/` `\`), absoluto/drive (`C:`), `~`, caracteres de controle
  (inclui NUL) e **formas codificadas** (decodifica até 2 níveis — pega `%2e%2e`, `..%2f`,
  `..%252f`); `garantirContencao` usa `path.resolve` + `startsWith(base + path.sep)`;
  `caminhoContidoNaBase` compõe com validação por segmento.
- **`upload.service.ts`** — `salvar`, `salvarVariantes`, `remover` e `caminhoArquivo` montam
  caminhos **somente** via guard (contenção em `uploads/media`); `caminhoArquivo` mantém o
  regex estrito do nome gerado por nós (UUID + variante + ext) e devolve `null` (→ 404) para
  qualquer entrada rejeitada; logs usam rótulo curto, nunca o valor bruto.
- **Nota CodeQL:** assim como no SSRF (#151), a regra pode não reconhecer guard custom como
  sanitizer — se o alerta persistir, registrar e escalar (nunca suppress).

## 2c. Caso 3 — clear-text-logging no seed de origem (T193): desenho da mitigação

- **Vetor real:** o `fetchTmdb` monta a URL com `api_key=<valor>` na query e a
  mensagem de erro (`TMDB <status>: <path>`) carregava a URL inteira até o
  `console.error(e)` do script — o Pino (redact de propriedades do HTTP) e o
  `sanitizarPii` (D-543, objetos) não cobrem mensagens soltas.
- **`apps/api/src/common/log-redactor.ts`** (novo, puro): nível **string** — pares
  nome-valor sensíveis (`password|senha|secret|token|api[_-]?key|apikey|client_secret|
  admin_token|session_secret|database_url`) → `[REDACTED]`, headers
  `Authorization`/`Cookie` (com lookahead p/ não consumir `Bearer` já redigido),
  `Bearer <token>`, credenciais em URL (`scheme://[REDACTED]@host`, preserva host),
  e-mail via `mascararEmail` (D-543; nunca re-mascara o que já é marca/URL) e
  truncamento em 500 chars; nível **objeto** — cópia recursiva (ciclo-safe,
  profundidade ≤ 6) com chaves sensíveis → `[REDACTED]`; `resumoSeguro` para JSON
  de log; `redigirErro` devolve **nome + mensagem** redigidos — **nunca o stack**.
- **`prisma/seed-origem.ts`**: o erro do fetch já nasce redigido (defesa em
  profundidade) e o script ganhou `executar()` com `console.error` sanitizado +
  guarda `isDirectRun` (exporta `main`/`fetchTmdb`/`executar` para teste) — padrão
  dos scripts de provisionamento (D-275).

## 2d. Caso 4 — incomplete-sanitization no cache (T194): desenho da mitigação

- **Vetor real:** o fallback de memória do `CacheService.delPattern` filtrava chaves com
  `k.includes(pattern.replace("*", ""))` — replace **parcial** (só o primeiro `*`) e match
  **sem âncora**: padrões com múltiplos wildcards não casavam nada na memória (divergência
  do Redis KEYS, que casaria) e `delPattern("midias:*")` apagava `x:midias:1` — namespace
  escape no fallback distorcia a invalidação (memória ≠ Redis).
- **`apps/api/src/common/cache-key-guard.ts`** (novo, puro):
  - `validarPattern` — fail-closed **antes** de tocar memória/Redis: rejeita ausente/vazio/
    não-string, comprimento > 256 (`MAX_PATTERN`), caracteres de controle (NUL, `\n`, `\r`,
    tab, DEL) e metacaracteres que o glob do Redis trataria de outra forma (`?`, `[`, `]`,
    `\` — único wildcard suportado é `*`); mensagem de erro **nunca** inclui o valor.
  - `combinaPattern` — casamento glob `*`-only **ancorado** (prefixo, sufixo e literais
    intermediários em ordem; busca mais-à-esquerda; sem `replace` parcial e sem regex
    construída) — espelha o Redis KEYS para o subconjunto de padrões do serviço.
- **`cache.service.ts`** — `delPattern` valida o padrão (inválido lança **sem efeitos
  colaterais**: memória intacta e `redis.keys` não chamado) e filtra a memória com o
  matcher ancorado; TTL, invalidação, `keys`/`del` e a degradação para memória inalterados.
- **Fakes dos testes** (`cache.service.spec`, `cache.e2e.spec`, `media-admin-crud.e2e.spec`)
  passaram a usar o mesmo matcher — o idiom `replace("*","")+includes` replicado nos
  FakeRedis era a mesma regra (alertas #95/#96/#97) e divergia do Redis real.
- **Nota CodeQL:** o sink (replace parcial) foi **removido** — diferentemente do T191–T193
  (guardas mantendo o padrão original), aqui não há `replace` de string parcial no código;
  se a próxima análise ainda não fechar o alerta (#94), registrar e escalar (nunca suppress).

## 2e. Caso 5 — incomplete-url-substring-sanitization em `normalizar-imagem` (T196-C)

- **Vetor real:** a normalização de URL de imagem do IGDB (D-262) decidia por
  `url.includes("images.igdb.com")` + `url.replace("t_thumb", "t_cover_big")` — **substring como
  allowlist**: `images.igdb.com.evil.com`, `evil.com/?u=images.igdb.com/t_thumb`, userinfo, porta
  arbitrária, `javascript:`/`data:`/`file:` e relativas passavam e eram transformadas (o `replace`
  ainda podia tocar query/hash, não só o path).
- **`apps/api/src/common/image-url-guard.ts`** (novo, puro): `hostDeImagemPermitido` — apenas URL
  **absoluta https**, sem **userinfo**, sem **porta explícita**, com `hostname` **parseado**
  (`new URL`) comparado **exatamente** (case-insensitive) contra allowlist explícita
  (`images.igdb.com`); `normalizarUrlImagem` troca `t_thumb` → `t_cover_big` **somente no
  pathname** (primeira ocorrência) e devolve a string **intacta** em qualquer outro caso.
- **`normalizar-imagem.ts`** delega ao guard; contrato preservado (`falsy → null`; não lança;
  demais URLs intactas) e callers (`discover.service.ts:216`, `media.controller.ts:504/964`)
  inalterados. Contexto `IMAGE_DISPLAY_URL_TRANSFORM` — **sem sink de rede/exec**.
- **Nota:** https-only é consistente com `url-guard.ts` (T191); http legado, se existir, apenas
  perde o upgrade de tamanho (cosmético).

## 3. Regras para as próximas correções (T195+)

Fila de runtime **esgotada em T194** — as 4 regras herdadas da triagem estão mitigadas
(§2–§2d); as análises pós-merge fecharam #85/#86/#94–#97. **Triagem não-runtime em T195**
(read-only) achou **1 runtime de display** — o **#88**, agora **MITIGADO em T196-C** (§2e).
**Fila não-runtime ENCERRADA em T196-b** — #93/#98 (e2e `i18n-leak`) e #149 (script de prêmios)
mitigados. Resta apenas o **#151** (único runtime open), que permanece **triagem humana do
Operador**. Relatórios: `reports/codeql-nonruntime-triage-2026-10-12.md`,
`reports/codeql-incomplete-url-substring-normalizar-imagem-2026-10-12.md`,
`reports/codeql-test-substring-sanitization-2026-10-12.md` e
`reports/codeql-e2e-script-sanitization-2026-10-12.md`.

- **Uma regra por task/PR**, com **TDD** (teste vermelho primeiro), diff mínimo e review;
- **Nunca interagir com o alerta** do CodeQL (sem dismiss/resolve/comment) — o alerta
  fecha pela próxima análise com o código corrigido;
- Não alterar deps/workflows/GitHub settings/produção; **sem rede externa nos testes**
  (mocks/injeção);
- Se o alerta **persistir** após o fix, registrar evidência e **escalar** (não suprimir);
- Achados em testes/e2e/scripts entram como higiene opcional, priorizados por risco real.

## 4. Histórico

- **2026-10-11 (T191):** SSRF CRITICAL mitigado (allowlist + validação de URL/IP/DNS +
  redirect guard + erros sanitizados). Suíte API 1191/1191 na validação; o guard pegou
  um host legítimo esquecido (RapidAPI/OpenCritic) — corrigido com teste.
  Relatório: `.claude/reports/codeql-ssrf-http-utils-2026-10-12.md`.
- **2026-10-11 (T192):** path-injection HIGH mitigado (path-guard + contenção em
  `uploads/media`; filesystem real apenas em tmp/gitignored nos testes). Relatório:
  `.claude/reports/codeql-path-injection-upload-2026-10-12.md`.
- **2026-10-11 (T193):** clear-text-logging HIGH mitigado (log-redactor + seed
  sanitizado; testes com fetch/Prisma/console mockados, sem banco real). Relatório:
  `.claude/reports/codeql-clear-text-logging-seed-2026-10-12.md`.
- **2026-10-11 (T194):** incomplete-sanitization HIGH mitigado (cache-key-guard +
  `delPattern` ancorado/fail-closed; fakes idênticos nos 3 specs). Suíte API
  **1323/1323**. Relatório:
  `.claude/reports/codeql-incomplete-sanitization-cache-2026-10-12.md`.
- **2026-10-11 (T195):** triagem read-only dos alertas CodeQL **não-runtime** (128 open =
  9 CodeQL + 119 Trivy): #88 runtime de display **escalado** (`normalizar-imagem.ts`);
  #89–#92 `SAFE_TEST_FIX`; #93/#98/#149 `E2E_SCRIPT_FIX`; #151 excluído (conhecido).
  Nenhum alerta interagido; nenhum código alterado. Relatório:
  `docs/08-security/reports/codeql-nonruntime-triage-2026-10-12.md`.
- **2026-10-11 (T196-C):** incomplete-url-substring-sanitization HIGH (**#88**)
  mitigado — `image-url-guard.ts` (https + hostname parseado exato + troca só no
  pathname); 11 casos de bypass provados no RED; suíte API **1375/1375**. Relatório:
  `docs/08-security/reports/codeql-incomplete-url-substring-normalizar-imagem-2026-10-12.md`.
- **2026-10-11 (T196-A):** `js/incomplete-url-substring-sanitization` nos **specs de teste
  (#89–#92)** mitigado — roteamento de mock e asserções de domínio passaram a comparar
  **hostname parseado** (`new URL().hostname`), mais estrito que `includes`; intenção dos testes
  preservada, sem skip/soft, sem remover casos. `audit-igdb-ids.spec` 25/25;
  `game-posters-integrity.spec` 7/7; suíte API **1375/1375**; tsc/eslint/prettier limpos.
  Relatório: `docs/08-security/reports/codeql-test-substring-sanitization-2026-10-12.md`.
- **2026-10-11 (T196-b):** `js/bad-tag-filter`/`js/incomplete-multi-character-sanitization`
  (**#93/#98**, e2e `i18n-leak`) e `js/identity-replacement` (**#149**, script de prêmios)
  mitigados — `semScripts` reescrito como **varredura determinística de tokens** (sem regex de
  tag, sem `replace` de multichar; fail-safe; helper puro em `apps/web/e2e/utils/sem-scripts.ts`
  com 10 casos) e no-op `replace(/^tt/,"tt")` **removido** (identidade provada). Suíte web
  **564/564**; suíte API **1375/1375**; tsc web 0; eslint/prettier limpos. **Fila não-runtime
  encerrada.** Relatório: `docs/08-security/reports/codeql-e2e-script-sanitization-2026-10-12.md`.

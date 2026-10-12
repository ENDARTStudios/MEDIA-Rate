# Incomplete-url-substring-sanitization em `normalizar-imagem` (CodeQL `#88`) — correção (T196-C)

**Data:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T196-C-codeql-runtime-incomplete-url-substring-normalizar-imagem
**Classificação:** `INCOMPLETE_URL_SUBSTRING_SANITIZATION_MITIGADO_COM_HOSTNAME_EXATO_E_TDD` — nenhum alerta foi interagido.

## 1. Sintoma (origem)

Alerta **HIGH `js/incomplete-url-substring-sanitization`** (**#88**) em
`apps/api/src/common/normalizar-imagem.ts:8` — identificado e escalado na triagem **T195**
(`RUNTIME_ESCALATION_SE_HOUVER`), por ser **código de produção** (contexto:
`IMAGE_DISPLAY_URL_TRANSFORM`, D-262).

## 2. Causa raiz (vetor real)

A decisão de transformar usava **substring como allowlist**:

```text
if (url.includes("images.igdb.com")) return url.replace("t_thumb", "t_cover_big");
```

Consequências (11 casos provados pelo TDD no RED — §5):

- `https://images.igdb.com.evil.com/…` (subdomínio enganoso) era transformado;
- `https://evil.com/https://images.igdb.com/t_thumb` e `…/?u=images.igdb.com/t_thumb`
  (domínio só no path/query) eram transformados;
- **userinfo** (`user:pass@`), **porta arbitrária** (`:8080`) e esquemas
  `javascript:` / `data:` / `file:` eram transformados;
- URLs **relativas** (`//images.igdb.com/…`, `images.igdb.com/…`) eram transformadas como se
  tivessem o host;
- o `replace` de string podia tocar **query/hash**, não apenas o pathname.

## 3. Contrato atual (preservado)

| Entrada | Saída |
|---|---|
| `null` / `undefined` / `""` | `null` |
| URL IGDB https legítima com `t_thumb` no path | `t_cover_big` no pathname |
| qualquer outra string | **a própria string, intacta** (sem lançar) |

Callers (inalterados): `discover.service.ts:216` (`poster_url`), `media.controller.ts:504`
(`imagem_url`) e `media.controller.ts:964` (`imagem_url`) — serialização de display.
**Nenhum sink de rede/filesystem/exec/shell/HTML**: verificado por varredura no arquivo e nos
callers (não é SSRF, não é download, não é redirect).

## 4. Correção (escopo cirúrgico)

| Arquivo | Papel |
|---|---|
| `apps/api/src/common/image-url-guard.ts` (novo, puro) | `HOSTS_IMAGEM_PERMITIDOS` = `{images.igdb.com}` (explícita, sem curinga). `hostDeImagemPermitido` — aceita só URL **absoluta https**, **sem userinfo**, **sem porta explícita**, com `hostname` **parseado** (`new URL`) comparado **exatamente** (case-insensitive). `normalizarUrlImagem` — troca `t_thumb` → `t_cover_big` **somente no pathname** (primeira ocorrência) e devolve a string **intacta** em qualquer outro caso |
| `apps/api/src/common/normalizar-imagem.ts` | Delega ao guard; contrato público preservado (falsy → null; sem lançar; demais intactas) |

**Decisão documentada (https-only):** consistente com `url-guard.ts` (T191) e com a origem real
do dado (a ingestão do IGDB usa https). Se houver dado legado em `http`, ele apenas deixa de ter o
upgrade de tamanho — efeito **cosmético**, sem risco de segurança.

## 5. TDD (vermelho → verde; sem rede)

- **RED (prova do vetor):** 11 falhas assertivas no contrato antigo — subdomínio enganoso,
  domínio no path, domínio na query, userinfo, porta não padrão, `javascript:`, `data:`, `file:`,
  relativa protocol-relative, sem esquema, `http`.
- **GREEN:** `test/image-url-guard.spec.ts` (matriz de allowlist com 21 casos +
  transformação/pathname/query/hash/multi-ocorrência + 12 URLs intocáveis) e
  `test/normalizar-imagem.spec.ts` (contrato + 11 casos fail-closed + não lançar) —
  **55/55**; suíte API completa **1375/1375** (162 arquivos); `tsc` 0; `eslint` 0;
  `prettier` limpo. Sem chamadas de rede (apenas strings sintéticas).

## 6. Riscos residuais

- `https-only`: dado legado em `http` perde o upgrade de tamanho (cosmético; ver §4).
- A transformação re-serializa a URL via `URL.toString()` **apenas quando há troca real** no
  pathname (host maiúsculo passa a minúsculo — mesma origem); IGDB URLs típicas ficam idênticas.
- Se o CodeQL mantiver o #88 por limitação da regra em reconhecer o guard custom: registrar e
  escalar (precedente #151) — **nunca** suppress/dismiss.

## 7. Confirmações

Nenhum alerta interagido (somente leitura na triagem T195 da qual este fix deriva); nenhum
segredo/PII/valor de API impresso; nenhum arquivo de deps/schema/workflow/infra/env alterado;
diff restrito a `image-url-guard.ts`, `normalizar-imagem.ts` e os 2 specs. Contaminação
`123ce28e` ausente; PR com required verdes e smoke 7/7 (STATUS).

# Alerta CodeQL #151 — `js/request-forgery` mantido **OPEN** com mitigação documentada (T211)

**Data:** 2026-10-13 · **Fase:** F08-tests-security · **Tarefa:** T211 · **Base:** `564b22df` (`origin/main`)
**Classificação:** **`ALERTA_151 = OPEN_MITIGATED_DOCUMENTED`**
**Escopo:** docs-only/read-only — apenas **GET** de metadados sanitizados. **Nenhuma** interação com o
alerta (sem dismiss/comment/update/resolve/reopen/assign) e **nenhuma** alteração de código, deps,
backups, purge, produção, GitHub settings ou GO.

> **Sanitização:** apenas metadados (número, estado, regra, severidade, arquivo, linhas, tool,
> timestamps, URL). Nenhuma `description`, `details`, snippet, payload, segredo, PII, token, cookie,
> sessão, IP real ou user-agent real foi impresso.

---

## 1. Metadados do alerta (GET sanitizado)

| Campo | Valor |
|---|---|
| Número | **151** |
| Estado | **`open`** (`dismissed_at: null`, `dismissed_reason: null`) |
| Regra | `js/request-forgery` |
| Severidade | `error` (crítico no painel) |
| Ferramenta | CodeQL |
| Arquivo | `apps/api/src/modules/media-score/adapters/http.utils.ts` |
| Linhas | 68–77 |
| Criado | 2026-10-11T19:30:50Z |
| Atualizado | 2026-10-11T19:40:42Z |
| URL | `https://github.com/ENDARTStudios/MEDIA-Rate/security/code-scanning/151` |

**Contagem de alertas CodeQL abertos: `1`** — o `#151` é o **único** alerta CodeQL de runtime
aberto no repositório (os demais alertas abertos são do scanner de imagem, natureza distinta).

**Estado do painel:** **OPEN e inalterado** — coerente com a decisão do Operador de **manter open
com evidência de mitigação** (não dismiss automático). Nenhuma interação foi feita.

---

## 2. Por que o alerta permanece aberto (limitação da regra)

A regra `js/request-forgery` acompanha o taint da URL de request até o **sink de rede**. A
mitigação implementada em T191 é uma **allowlist/barreira custom** (`url-guard` + `ip-guard`) —
a análise estática **não a reconhece como sanitizer eficaz**, pois não é um sanitizador de
biblioteca conhecido (`encodeURIComponent`, `new URL` de host fixo etc.). Resultado: o taint
"sobrevive" à análise e o alerta **permanece open**, ainda que o **runtime esteja mitigado**.
Esse é o mesmo comportamento já observado e documentado em outros achados CodeQL deste repo
(ex.: a nota do `path-injection`, `SECURITY_CODEQL_RUNTIME.md` §2b).

> Manter o alerta open **não** é dívida não tratada: é o estado correto para uma mitigação
> defensiva que a regra não modela. **A decisão de dismiss é humana** — jamais automática pelo agente.

---

## 3. Mitigação real (runtime) — evidência consolidada

### 3.1 Guardas (código)

- **`apps/api/src/common/url-guard.ts`** — allowlist **explícita** de hosts outbound (constantes no
  código, **nunca** domínio amplo), **somente HTTPS**, **sem userinfo**, **IP literal sempre
  bloqueado** (inclui formas normalizadas pelo parser WHATWG, ex.: decimal de loopback e `[::1]`),
  subdomínio permitido **sem “sufixo armadilha”**, e validação do **IP resolvido** com
  **fail-closed** (erro/vazio ⇒ bloqueia) — mitigação básica de **DNS rebinding**.
- **`apps/api/src/common/ip-guard.ts`** — classificação **pura** de IPs v4/v6: loopback, privados
  (10/8, 172.16/12, 192.168/16), link-local/metadata (169.254/16), CGNAT, documentação/reservados/
  multicast, ULA/link-local IPv6, 6to4, teredo, NAT64 e IPv4-mapeado (com recursão no embutido).
- **`http.utils.ts`** — **todo** outbound passa pelas guardas; **redirects manuais** (máx. 3 saltos,
  **cada hop revalidado**; POST **não** segue redirect); **erros sanitizados** (origem + path,
  **sem query** — que pode conter chave de API; a URL completa nunca entra em erro/log); timeout
  mantido (8 s padrão).

### 3.2 Testes (sem rede externa)

| Spec | Casos | Foco |
|---|---|---|
| `apps/api/test/url-guard.spec.ts` | 7 | allowlist, https-only, userinfo, IP literal, “sufixo armadilha”, IP resolvido/fail-closed |
| `apps/api/test/http-utils-ssrf.spec.ts` | 10 | SSRF no sink: redirect por hop, POST sem redirect, erros sanitizados |
| `apps/api/test/https-redirect.e2e.spec.ts` | 4 | comportamento de redirect http→https (e2e) |

(Os casos de classificação de IP do `ip-guard` são exercidos dentro desses specs — não há spec
dedicada; `image-url-guard.spec.ts` e `media-score-job.spec.ts` também importam as guardas.)

### 3.3 Correção e histórico

- **PR #528** — `fix(security): mitigar SSRF em http.utils dos adapters de media-score (T191)` —
  **MERGED** (`cf993017`, 2026-10-11T19:37:58Z).
- **T191** — primeira correção de runtime; o guard detectou um host legítimo ausente na 1ª varredura
  (RapidAPI/OpenCritic), adicionado com teste. Relatório local:
  `.claude/reports/codeql-ssrf-http-utils-2026-10-12.md`.
- **Política:** `docs/08-security/SECURITY_CODEQL_RUNTIME.md` §2 (desenho da mitigação) e §3
  (regras: nunca interagir com o alerta; se persistir, registrar e **escalar**, nunca suprimir).

---

## 4. Risco residual aceito

- **O alerta permanece visível como OPEN** no painel de code scanning — aceito: o **runtime está
  mitigado** (allowlist + validação de IP/DNS + redirect manual + erros sanitizados) e a decisão é
  **manter open com evidência**, não dismiss automático.
- **Falsos negativos do taint:** a limitação da regra é conhecida e não implica exposição real.
- **Cobertura futura:** qualquer **novo host outbound** exige edição explícita de
  `HOSTS_EXTERNOS_PERMITIDOS` **+ teste de regressão** (§2 do doc de runtime).

---

## 5. Monitoramento

- **Não suprimir / não comentar / não atualizar** o alerta (regra dura do projeto).
- **Revisão periódica** se a regra CodeQL ou a ferramenta mudar (uma futura melhoria da regra
  pode fechá-lo sozinha — como já ocorreu com #85/#86/#94–#97).
- Se o `#151` **deixar de estar open** sem ação do agente (nova análise), registrar o novo estado
  e escalar (sem interagir).

---

## 6. Confirmação de escopo

- **Nenhum** alerta foi interagido nesta tarefa (somente `GET` de metadados).
- **Nenhuma** alteração de código (`http.utils.ts`, `url-guard.ts`, `ip-guard.ts`, testes) — os
  artefatos citados já estavam em `main`.
- **Nenhum** toque em deps, workflows, GitHub settings, produção, backups, purge ou GO.
- **Diff restrito a docs** (relatório + `SECURITY_CODEQL_RUNTIME.md` + `GO_READINESS_CHECKLIST.md` +
  `PENDENCIAS_OPERADOR.md` + `worklog.md`).
- **GO para convites: continua SUSPENSO.**

---

## 7. Referências (sanitizadas)

`docs/08-security/SECURITY_CODEQL_RUNTIME.md` · `docs/08-security/SECURITY_ALERTS_TRIAGE.md` ·
`docs/06-devops-deployment/GO_READINESS_CHECKLIST.md` · `docs/08-security/reports/codeql-nonruntime-triage-2026-10-12.md` ·
PR #528 (`cf993017`) · relatório local `.claude/reports/codeql-ssrf-http-utils-2026-10-12.md`.

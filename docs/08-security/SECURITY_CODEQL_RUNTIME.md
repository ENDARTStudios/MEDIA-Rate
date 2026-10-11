# Política — Correções de achados CodeQL de RUNTIME

**Origem:** T189 (triagem) + T191 (primeira correção — SSRF). Complementa
`SECURITY_ALERTS_TRIAGE.md` (como triar, o que registrar, quando escalar) e `SECURITY_CI.md`.

## 1. Fila herdada da triagem (T189)

| Regra | Arquivo | Status |
|---|---|---|
| `js/request-forgery` (SSRF) — **critical** | `apps/api/src/modules/media-score/adapters/http.utils.ts` | **MITIGADO (T191)** — §2 |
| `js/path-injection` — high | `apps/api/src/modules/upload/upload.controller.ts` | pendente (T192) |
| `js/clear-text-logging` — high | `apps/api/prisma/seed-origem.ts` | pendente (T193) |
| `js/incomplete-sanitization` — high | `apps/api/src/common/cache.service.ts` | pendente (T194) |
| higiene testes/e2e/scripts (10 alertas) | vários | opcional (T195+) |

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

## 3. Regras para as próximas correções (T192–T194)

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

# SECURITY_REVIEW — Gates de segurança e processo

Aprofundamentos: `docs/SECURITY.md` (política) · `docs/SECURITY_TRIAGE.md`
(triagem de issues automáticas) · `docs/BOAS_PRATICAS_SECRETS.md`.

## Gates no CI (o que trava merge)

| Gate | O que faz |
|---|---|
| `Docs Gate` (required) | scan de padrões de segredo (sk_/whsec_/AKIA/PEM) **fail-closed no arquivo inteiro** + markdown sanity |
| `Migration Safety (B1)` (required, D-532/D-535) | PR com migration/schema exige label + rollback + declaração |
| `Semgrep (SAST)` | análise estática de código |
| `CodeQL v4` (security.yml, D-534) | code scanning (repo público) |
| `Trivy fs` (security.yml) | CVEs de dependência do lockfile; SARIF enviado ao GitHub |
| `Trivy image` (security.yml) | scan de imagem — **modo relatório** (CVEs do sistema base sem fix não bloqueiam; promover a bloqueante é follow-up do Operador) |
| `audit:ci` (security.yml) | `npm audit` **governado** com allowlist (exceção única: advisory dev-only `deepmerge-ts`→prisma CLI, P009/D-462); revisão trimestral da allowlist (próxima 2026-12) |
| `RLS Isolation (T290/299/301)` | Postgres real em CI: casos A≠B provam isolamento owner-only |
| `ZAP Baseline (DAST)` | roda contra o preview do PR |
| `Stryker Mutation` | qualidade dos testes que guardam as regras |

## Controles de aplicação (verificar em review)

- **AuthN**: cookies httpOnly + CSRF double-submit (tempo constante) + lockout
  progressivo + verificação de e-mail obrigatória.
- **AuthZ**: RLS owner-only em toda query de usuário; `RolesGuard`/`PlanGuard`;
  `tenant_id` nunca na resposta (T289).
- **Entrada**: Zod em body/query; `UuidParamPipe` 404 pré-Prisma; rate limit por rota.
- **Saída/logs**: redaction (authorization/cookie/x-csrf-token/password/…);
  PII de auth mascarada (T049/D-543); `sendDefaultPii:false` no Sentry.
- **Audit**: cadeia SHA-256 (`verificarIntegridade()`) em auth e watchlist.
- **STRIDE**: toda TAREFA do protocolo carrega análise STRIDE no payload — o review
  confere se o implementado corresponde ao prometido.

## Processo de triagem (issues automáticas)

Sentry/ZAP/CodeQL abrem issues automáticas → triar em `docs/SECURITY_TRIAGE.md`
(classes conhecidas: advisories de terceiros fora do nosso código = risco aceito
monitorado, ex.: #144-146). Toda triagem com data e decisão (fix/aceite/defer).

## Regras duras

1. Segredo em commit = PR rejeitado + **rotação** (o vazamento já aconteceu).
2. Vulnerabilidade de runtime com fix disponível = patch no próximo PR de segurança.
3. Achado crítico em auditoria → SECURITY_FINDING + BLOCKED no protocolo (tarefa
   para na frente do achado até o Operador decidir).
4. Nunca depurar com dados reais de usuário sem mascaramento.

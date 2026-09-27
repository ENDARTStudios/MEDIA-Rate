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


---

> **Fundido de:** `SECURITY.md` (Fase 3, T112 - conteudo preservado na integra abaixo)

# Política de Segurança — MEDIA Rate

## Reportando Vulnerabilidades

Se você descobrir uma vulnerabilidade de segurança no MEDIA Rate, pedimos que a reporte de forma responsável.

**NÃO abra uma issue pública no GitHub.**

Em vez disso, envie um email para `security@mediarate.app` com:

- Descrição detalhada da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Sugestão de correção (se houver)

Responderemos em até 48 horas com a confirmação do recebimento e um plano de ação.

## Escopo

O programa de divulgação responsável cobre:

| Escopo | Descrição |
|---|---|
| `apps/api/` | Backend Fastify + Prisma + PostgreSQL |
| `apps/web/` | Frontend Next.js 16 App Router |
| `packages/domain/` | Tipos e validações compartilhadas |
| `docs/` | Documentação do projeto |

## Fora do Escopo

- Vulnerabilidades em dependências de terceiros já reportadas publicamente
- Ataques de engenharia social
- Ataques de força bruta em ambientes de desenvolvimento local
- Vulnerabilidades teóricas sem prova de conceito

## Práticas de Segurança do Projeto

1. **Segredos**: Chaves de API, tokens e senhas NUNCA são commitados. Use `.env` (excluído pelo `.gitignore`).
2. **Dependências**: `npm run audit:ci` (gate governado) roda no CI e **bloqueia high/critical** de dependências. Qualquer exceção exige allowlist explícita com motivo e revisão em `package.json#config.auditAllowlist` — ver `docs/SECURITY_TRIAGE.md`.
3. **Autenticação**: Senhas usam argon2id (custo ≥ 12). Sessões via cookie httpOnly.
4. **Validação**: Todos os endpoints de escrita usam validação Zod. Payloads não validados são rejeitados.
5. **CSP**: Content Security Policy restritiva aplicada via middleware.
6. **Dependabot**: Atualizações automáticas de segurança configuradas em `.github/dependabot.yml`.
7. **Scanners**: SAST via CodeQL e varredura de dependências/imagem via Trivy (`.github/workflows/security.yml`). O scan de imagem é **informativo** (SARIF); o bloqueio de runtime é do `audit:ci`. Detalhes e triagem em `docs/SECURITY_TRIAGE.md`.

## Versões Suportadas

| Versão | Suporte |
|---|---|
| `main` (latest) | ✅ Suporte completo |
| `beta` | ✅ Correções críticas |
| `< 1.0` | ❌ Não suportado |

## Reconhecimento

Pesquisadores que reportarem vulnerabilidades válidas serão creditados nesta página (com consentimento).

---

*Última atualização: 2026-07-25*


---

> **Fundido de:** `docs/SECURITY.md` (Fase 3, T112 - conteudo preservado na integra abaixo)

# Segurança — MEDIA Rate

Documentação de segurança operacional do MEDIA Rate: varredura contínua
(DAST), interpretação de relatórios e SLA de resposta. Alinhada com
`docs/05-security-compliance/INCIDENT_RESPONSE.md` (níveis P1–P4).

## DAST — OWASP ZAP (T219, 8.6)

### Frequência e canais

| Canal | Quando | Alvo | Falha em |
|---|---|---|---|
| PR (`ci.yml`) | a cada pull request | preview do PR | qualquer achado (fail_action) |
| **Semanal (`dast-weekly.yml`)** | **segunda-feira 03:00 UTC** + `workflow_dispatch` | `DAST_TARGET_URL` (ou `DAST_FALLBACK_TARGET` documentado) | **novo achado high/critical → issue automática** |

- **Alvo configurável**: `vars.DAST_TARGET_URL` no repositório. Se ausente,
  usa `vars.DAST_FALLBACK_TARGET` (URL de staging/produção documentada).
  Se **nenhum** estiver definido, o workflow **falha com mensagem clara** —
  nunca escaneia um alvo errado silenciosamente.
- **Issues automáticas**: achados high/critical abrem issue `security`/`dast`
  com template (alvo, data, evidência do relatório, recomendação). Achados
  medium/low → apenas log (sem ruído).
- **Sem segredos**: o workflow roda apenas com `GITHUB_TOKEN` + vars.
  Nenhuma credencial aparece em issues ou logs.

### Como interpretar o relatório

1. Abra o artefato `zap-weekly-report` (30 dias de retenção) do run do
   workflow — o `zap-report.json` contém cada alerta com: `alert`,
   `risk` (Informational/Low/Medium/High/Critical), `url`, `evidence` e
   `solution`.
2. **Confirme a explorabilidade**: um alerta High do ZAP nem sempre é
   explorável no contexto da aplicação (ex.: headers ausentes em respostas
   JSON de API não são embutíveis).
3. **False positive**: adicione a regra em `test/dast/zap-rules.conf`
   (formato: `scan_id regex nome`) com comentário do motivo, e feche a
   issue correspondente com a referência do PR.

### SLA de resposta para achados (alinhado a INCIDENT_RESPONSE.md)

| Nível | Exemplo | Triagem | Mitigação |
|---|---|---|---|
| **P1 — Crítico** (explorável, dados comprometidos) | RCE, vazamento de dados | **≤ 1 dia útil** | **≤ 3 dias** |
| **P2 — Alto** (funcionalidade principal) | Auth bypass, SQLi confirmado | **≤ 3 dias** | **≤ 7 dias** |
| **P3 — Médio** (funcionalidade secundária) | Headers ausentes exploráveis | ≤ 7 dias | ≤ 30 dias |
| **P4 — Baixo** (cosmético) | Info leakage sem impacto | sem SLA | próxima janela |

Todo achado **confirmado** High/Critical deve gerar um incidente no fluxo de
`docs/05-security-compliance/INCIDENT_RESPONSE.md` (P1/P2) e um PR de correção referenciando a
issue do DAST.

### Execução manual local

```bash
# API rodando em http://localhost:4000
bash test/dast/zap-baseline.sh
# ou contra um alvo específico:
bash test/dast/zap-baseline.sh https://preview-123.media-rate.example.com
```

O script usa a imagem oficial `ghcr.io/zaproxy/zaproxy` (Docker) e as
regras versionadas em `test/dast/zap-rules.conf`.

## Outros controles

- **SAST**: CodeQL (`security.yml`, semanal) + Trivy.
- **Dependências**: `npm audit` no `security.yml`.
- **Logs/métricas**: `docs/OBSERVABILITY.md` (Loki, Prometheus, alertas).
- **Uploads**: validação por magic bytes (`docs/` do T216); ClamAV pendente.

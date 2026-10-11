---
name: media-rate-security-ops
description: >
  Disciplina de segurança operacional do MEDIA Rate: nunca imprimir valores de
  segredo/PII; relatórios sanitizados; políticas de Gitleaks (gate bloqueador do tree),
  CodeQL (triagem de alertas, limitação de guard custom, nunca dismiss pelo agente) e
  Docs Gate; estado do incidente INC-2026-10-11 (D-577/D-578) e templates de decisão
  do Operador. Use em qualquer tarefa de segurança, incidente, hardening, triagem de
  alertas ou escrita de relatórios de segurança deste repositório.
---

# MEDIA Rate — Security Ops

Complementa `.agents/skills/media-rate-conventions/SKILL.md` (política) e
`docs/08-security/{SECURITY_ALERTS_TRIAGE,SECURITY_CI,SECURITY_CODEQL_RUNTIME}.md` (canônico).

## Regra zero

**Nunca** imprimir/colar valores: chaves (`sk_`-prefixos, `whsec`-prefixos), tokens,
cookies, `DATABASE_URL`, `ADMIN_TOKEN`, senhas, hash de senha, PII real.
Sondagens usam **contagens/booleanos/nomes** (ex.: `grep -c`, `-l`, `jq 'length'`,
`grep -q ... && echo MATCH || echo NO_MATCH`). PII aceitável: apenas domínios de teste
(`@mediarate.test`).

## Gate bloqueador de segredos = Gitleaks (D-578)

- Job `Gitleaks (segredos — tree atual)`: v**8.30.1 pinado com checksum**, `--no-git`
  (só tree atual; histórico NÃO é gate), `--redact`, `--config .gitleaks.toml`.
- Allowlist (`.gitleaks.toml`): exclusões estruturais + fixtures sintéticos
  justificados + regexes precisos. **Proibido** allowlist amplo.
- Rodar local (mesma semântica do CI): baixar o binário oficial pinado e
  `gitleaks detect --source . --no-git --redact --config .gitleaks.toml --report-format json --report-path mnt/... --exit-code 1`.
  Prova do gate: fixture sintética com formato real deve falhar (exit 1); o exemplo
  documental da AWS (`AKIA…EXAMPLE`) não dispara.
- Docs Gate (sempre roda em PRs) escaneia ARQUIVOS ALTERADOS com:
  `sk_live_[A-Za-z0-9]` · `sk_test_[A-Za-z0-9]` · `whsec_[A-Za-z0-9]` ·
  `AKIA[0-9A-Z]{16}` · `BEGIN [A-Z ]*PRIVATE KEY` — nunca escrever esses formatos
  completos em docs/relatórios; prefixo + backtick/space é seguro.

## CodeQL — política de alertas (T189/T191/T192)

- Triagem = **metadados sanitizados apenas** (`number/state/rule_id/severity/file_path/
  datas`); nunca descrição/snippet. Sempre `per_page` explícito.
- **NUNCA interagir** (dismiss/resolve/comment) — decisão humana do Operador.
- **Limitação conhecida:** a regra não reconhece guards/allowlists custom como
  sanitizers → alertas persistem após mitigação real (casos #151 SSRF em
  `http.utils.ts` e #86 path-injection no upload). Precedente: merge permitido com
  required verdes + mitigação provada + alerta registrado como **follow-up**; jamais
  suppress. Fila: T193 (`js/clear-text-logging` no seed), T194
  (`js/incomplete-sanitization` no cache.service).
- Trivy = modo **relatório** (D-534); ruído estrutural (imagem/base/lockfile) é
  governado pela allowlist do `audit:ci` (`package.json → config.auditAllowlist` +
  `auditAllowlistPkg`) e pela trilha de deps.

## Plataforma (estado verificado 2026-10-11)

Repo **PÚBLICO** · secret scanning **ATIVO (0 alertas)** · **push protection ATIVO** ·
dependabot security updates habilitado · code scanning ativo (~134 abertos, contagem).
Verificação read-only: `gh api repos/ENDARTStudios/MEDIA-Rate -q '.security_and_analysis'`.

## Incidente INC-2026-10-11 (D-577/D-578) — estado

Mitigado, **não encerrado** (aguarda decisão do Operador: `ENCERRAR_RISCO_RESIDUAL_ACEITO`
| `MANTER_ABERTO_MONITORAMENTO` | `AUTORIZAR_PLANO_PURGE` + `PURGE_HISTORICO`).
Rotacionadas: TMDB/IGDB/Twitch/ComicVine + Stripe (live/webhook). Contas
`@mediarate.test` em produção neutralizadas (senhas invalidadas, sessões revogadas,
ADMIN revogado). Relatórios sanitizados em `.claude/reports/secret-*.md` e
`incident-*.md`. Templates em `PENDENCIAS_OPERADOR.md`
(`INCIDENTE_ENCERRAMENTO_VERIFICACAO_T188`, `DECISAO_OPERADOR_DEPS_*`).

## Relatórios e higiene

- `.claude/` é gitignored: relatório versionado entra por **plumbing**
  (`git hash-object -w --path` + `git update-index --add --cacheinfo`); **proibido
  `git add -f`** (causa raiz do D-577).
- `.claude/exchange_log.jsonl` local: somente append de 1 linha JSON sanitizada
  (`valores_impressos:"nenhum"`); nunca versionado, nunca em evidência.
- Nunca declarar "incidente encerrado", "GO liberado" ou BETA-GAP DONE sem REVIEW —
  GO de convites permanece SUSPENSO.

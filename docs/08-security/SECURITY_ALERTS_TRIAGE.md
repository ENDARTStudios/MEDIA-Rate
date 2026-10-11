# Política — Triagem de alertas de code scanning

**Origem:** T189 (2026-10-11) · complementa `SECURITY_CI.md` (Gitleaks/Trivy/CodeQL) e
`GITHUB_SECURITY_SETTINGS.md` (recursos de plataforma).

## 1. Como consultar (read-only, sempre)

Sempre use `per_page` explícito (o default da API é 30 e já causou subcontagem):

```bash
gh api "repos/{owner}/{repo}/code-scanning/alerts?state=open&per_page=100" --paginate \
  --jq '.[] | {number, state, rule_id: .rule.id,
               severity: (.rule.security_severity_level // "n/a"),
               file: .most_recent_instance.location.path, tool: .tool.name,
               created_at, updated_at}'
```

Contagens por estado: repetir com `state=dismissed`/`fixed` (também `--paginate`).

## 2. O que PODE ser registrado (metadados sanitizados)

`number`, `state`, `rule.id`, severidade (`security_severity_level`), `file_path`, datas,
`tool.name` e **contagens agregadas** (por severidade/regra/caminho/ferramenta).

## 3. O que NUNCA pode ser impresso

- Descrição/mensagem do alerta, corpo do payload, snippets de código ou linhas-fonte;
- Segredos, tokens, cookies, PII ou qualquer valor sensível;
- Conteúdo de `most_recent_instance` além de `location.path`.

## 4. O que NÃO fazer sem autorização explícita

- Interagir com alertas (dismiss/reopen/resolve/comment/assign/update/bulk);
- Corrigir múltiplas regras de uma vez (“lote cego”);
- Classificar como falso positivo **sem evidência** (na dúvida: `INFO_INSUFICIENTE`).

## 5. Quando ESCALAR (sem corrigir no mesmo ciclo)

- **critical/high open com impacto de runtime** → escalar e recomendar tarefa de correção dedicada;
- Alertas em **superfícies sensíveis**: auth, sessão, cookie, CSRF, rate limit, upload/IO, billing,
  Stripe, webhook, schema/migration, infra, secrets ou workflows de segurança → tratar como
  `SECURITY_SENSITIVE_SURFACE` **mesmo em medium/low**.

## 6. Expectativas por ferramenta

- **CodeQL** — achados em código-fonte; alertas `critical/high` de runtime entram na fila de
  correção dedicada (TDD + review, uma regra por vez).
- **Trivy** — modo **relatório** (D-534): lockfile/deps → trilha de deps (allowlist governada +
  PRs de atualização); base-image/npm-internal → upstream (follow-up de infra/rebuild), não é
  código do produto.
- **Gitleaks** — gate **bloqueador** de segredos no tree atual (`SECURITY_CI.md`).

## 7. Template de tarefa de correção (por regra)

1. Reproduzir/entender o alerta com metadados sanitizados (sem colar snippet no relatório);
2. Escrever teste vermelho que exercita o comportamento seguro esperado;
3. Correção mínima + verde; rodar suíte relevante;
4. Documentar decisão (corrigir, mitigar ou aceitar com justificativa datada);
5. PR com review — nunca interagir com o alerta sem autorização explícita.

## 8. Histórico

- **2026-10-11 (T189):** primeira triagem completa — 134 open (Trivy 119 / CodeQL 15; 1 crítico SSRF
  + 4 high de runtime escalados para tarefa dedicada). Contagem anterior de “30” era page-size.
  Relatório: `.claude/reports/code-scanning-alerts-triage-2026-10-12.md`.

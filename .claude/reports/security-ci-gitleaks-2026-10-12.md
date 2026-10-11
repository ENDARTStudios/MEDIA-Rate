# Security CI — Gitleaks como padrão + SARIF condicional (T186)

**Data de execução:** 2026-10-11 · **Fase:** F08-tests-security · **Tarefa:** T186-security-ci-gitleaks-standard
**Decisão:** D-578 · **Classificação:** `CI_SECURITY_WORKFLOW_PERMISSION_AND_CODE_SCANNING_ENABLEMENT_ISSUE_NOT_NEW_SECRET_EXPOSURE`

> **Sanitização:** nenhum valor de segredo/token/PII foi impresso. A varredura local do
> Gitleaks operou com `--redact`; inspeções de falsos-positivos usaram apenas metadados
> (regra/arquivo/linha) de arquivos **públicos** do repositório.

## 1. Sumário executivo

1. O run `38151955200` (Security, pós-merge do T184) falhou por **permissão/code scanning/
   SARIF** no contexto de repositório **privado à época** — `Resource not accessible by
   integration` e `Path does not exist: trivy-results.sarif`. **Não** há achado novo de segredo.
2. O repositório voltou a ser **PÚBLICO** (decisão do Operador). Verificado via API:
   **secret scanning ATIVO** (0 alertas) e **code scanning ATIVO** (30 alertas pré-existentes).
3. **Gitleaks v8.30.1** (pinado + checksum) passou a ser o gate **BLOQUEADOR** de segredos
   do tree atual no CI, independente de GHAS/Secret Protection — validado localmente:
   3 falsos-positivos triados → **0 achados** após allowlist curada; o gate **falha (exit 1)**
   com fixture sintética de formato real.
4. Uploads SARIF do workflow tornaram-se **condicionais e não fatais**; scans reais mantêm a
   política (Trivy modo relatório — D-534; CodeQL publica na aba Security; `audit:ci` bloqueador).
5. `PII_NO_LOG = NAO` registrado; purge segue pendente de confirmação/aceite (D-578).

## 2. Decisões do Operador recebidas (registradas em D-578)

`PII_NO_LOG = NAO` · `VISIBILIDADE_REPO = PUBLICO` · `GITHUB_SECRET_PROTECTION = ATIVADO`
(verificado) · `SCANNER_PADRAO_DE_SEGREDOS = GITLEAKS` ·
`CODE_SCANNING_SARIF = OPCIONAL_NAO_BLOQUEANTE_QUANDO_INDISPONIVEL` ·
`PURGE_HISTORICO = RECOMENDADO_NAO_APLICAVEL_APOS_ROTACAO_AGUARDA_CONFIRMACAO_EXPLICITA_OU_ACEITE_DE_RISCO`.

## 3. Evidência sanitizada do run 38151955200

- `Security` em `f13e84b9` — conclusão `failure`; jobs falhos: `scan` e `Trivy Image Scan`.
- Sondas booleanas nos logs de falha: `Resource not accessible by integration` = **MATCH**;
  `Path does not exist` = **MATCH**; (a frase "code scanning is not enabled" não apareceu nos
  logs de falha deste run — a indisponibilidade ficou evidenciada pelos dois matches acima).

## 4. Causa raiz

1. **Permissões do workflow:** já estavam corretas (`contents: read` + `security-events: write`)
   — não era a causa.
2. **Code scanning indisponível no contexto privado:** o upload SARIF/`analyze` exige Code
   Scanning, que em repositório **privado** requer GHAS — daí `Resource not accessible`.
3. **SARIF ausente no upload do fs:** o passo de upload executava com `if: always()` mesmo sem
   arquivo gerado (o scan anterior falhou/não produziu saída no contexto do run).
4. **Secret Protection ≠ Code Scanning:** a ativação de Secret Protection não habilita o
   Code Scanning/SARIF; são recursos distintos (documentado em `GITHUB_SECURITY_SETTINGS.md`).

## 5. Mudanças no workflow (`security.yml`)

- **Job novo `gitleaks`** (BLOQUEADOR): instala a **v8.30.1 pinada com verificação de checksum**
  do release oficial; roda `detect --source . --no-git --redact --config .gitleaks.toml
  --report-format sarif --report-path gitleaks.sarif --exit-code 1`; upload SARIF condicional
  (`hashFiles != ''`) e `continue-on-error`.
- **Uploads Trivy** (fs e imagem): `if: always() && hashFiles(...) != ''` + `continue-on-error`
  (o scan em si permanece sem `continue-on-error`).
- **CodeQL `analyze`:** `continue-on-error: true` com comentário — a publicação é dependente de
  plataforma; achados vão para a aba Security; falha de plataforma não derruba o workflow.
- **Permissões:** mantidas mínimas e corretas (sem `pull-requests` — o workflow não lê PRs).

## 6. Política Gitleaks (validada)

- Tree atual (`--no-git`); **histórico não é gate** (INC-2026-10-11 mitigado por rotação;
  inventário no relatório do T183). `--redact` sempre. Versão pinada + checksum.
- `.gitleaks.toml` — allowlist restrita:
  - **Estruturais:** `node_modules`, `.next`, `dist`, `coverage`, `.turbo`, `.git`, `mnt`,
    `.claude` (relatórios curados sanitizados), diretórios de artefatos/relatórios de teste,
    `.env`/`.env.local` reais (nunca versionados — os `.env.example` **continuam escaneados**).
  - **Fixtures sintéticos justificados:** `apps/api/test/sentry-redact.spec.ts` (testa redação).
  - **Regexes precisos (falsos-positivos verificados):** `SenhaForte123`
    (`admin-rbac.spec.ts:149` — senha de fixture do teste do DTO de registro);
    `lgpd-consent-v1` (`LgpdBanner.tsx:8` — constante de chave de consentimento; o heurístico
    "generic-api-key" pegou a palavra KEY).
- **Validação local (v8.30.1):** antes da curadoria = 3 achados (todos falsos-positivos acima);
  depois = **0 achados**; **gate sintético** com credencial de formato real (fora do repo) =
  **exit 1** comprovado. O exemplo documental da AWS (chave "EXAMPLE") não dispara as regras
  padrão — por isso o teste usou um formato real.

## 7. Política Trivy

Modo **relatório** conforme D-534 (imagem/base é upstream) — não alterado. O arquivo SARIF é
gerado explicitamente pelos scans; o upload passou a ser condicional à existência do arquivo.
Promoção a bloqueante permanece decisão do Operador.

## 8. Verificação de repositório público

`gh api repos/ENDARTStudios/MEDIA-Rate` → `visibility=public`, `private=false` (2026-10-11).
PR #516 confirmada MERGED; PR #515 (e #518/#522 da automação) abertas — **não tocadas** nesta
tarefa (triagem futura sugerida como T187).

## 9. Verificação Secret Protection / Code Scanning (read-only)

- `secret-scanning/alerts` → **disponível** (lista; **0 alertas** na verificação) — Secret
  Protection **ativo** (confirma a decisão do Operador).
- `code-scanning/alerts` → **disponível** (**30 alertas pré-existentes** — triagem/conveniência
  futura; não fazem parte deste escopo).
- Nada foi habilitado/alterado via API nesta tarefa (somente leitura).

## 10. Testes/validação

- Gitleaks local: 0 achados no tree (com config); gate sintético exit 1.
- Script de instalação do CI reproduzido **localmente** (download + `sha256sum -c` → CHECKSUM_OK).
- Suíte: `provision-test-users.spec.ts` + `auth-test-accounts.spec.ts` **14/14**; `tsc` 0;
  `eslint` 0. Prettier não cobre `.toml` (parser inexistente) — sem implicação.
- `actionlint`: **não instalado** no ambiente local (validação estrutural do YAML delegada ao
  GitHub Actions no PR + revisão cuidadosa).

## 11. Riscos residuais

1. Histórico público retém o blob do incidente (mitigado por rotação; purge aguarda decisão).
2. 30 alertas de code scanning pré-existentes (triagem opcional).
3. Gitleaks não substitui os demais gates: `audit:ci` segue bloqueador de dependências.
4. PRs de dependências abertas (#515/#518/#522) seguem sem triagem.

## 12. Decisões ainda pendentes do Operador

1. Confirmar formalmente o encerramento (ou aceite de risco) do INC-2026-10-11 (D-578) —
   inclui a decisão de purge.
2. Triagem das PRs de dependências (#515/#518/#522 — T187 sugerida).
3. Backups/alertas Postgres (decisão antiga, inalterada).

## 13. Confirmação de sanitização

Nenhum valor de segredo, token, cookie, hash ou PII foi impresso neste relatório, nos logs de
comandos ou no STATUS. A varredura operou com `--redact`; os relatórios locais do Gitleaks
ficaram fora do versionamento (`mnt/`), e o fixture sintético de teste foi criado fora do
repositório. Nenhum histórico foi reescrito; schema/auth/billing/infra/segredos não foram
alterados; PR #515 não foi tocada.

**Mecânica:** este relatório (sob `.claude/`, ignorado) é adicionado ao índice via
`git update-index` (plumbing) — sem `git add -f`.

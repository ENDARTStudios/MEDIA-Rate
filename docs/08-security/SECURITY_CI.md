# Segurança de CI — Gitleaks (padrão), Trivy e SARIF condicional

**Decisão:** D-578 (2026-10-11) · **Workflow:** `.github/workflows/security.yml` · **Config:** `.gitleaks.toml`

## 1. Papéis de cada ferramenta

| Ferramenta | Papel | Bloqueia o workflow? |
|---|---|---|
| **Gitleaks** | **Padrão do projeto** para segredos no **tree atual** | **SIM** — finding real falha o job (`--exit-code 1`) |
| Trivy (fs + imagem) | Vulnerabilidades de dependências/imagem | Não — modo relatório (política D-534; achados na aba Security) |
| CodeQL | SAST (achados na aba Security) | Não — publicação dependente de plataforma (upload SARIF) |
| `npm run audit:ci` | Gate governado de dependências (allowlist D-462) | **SIM** |
| Upload SARIF (Code Scanning) | Publicação de resultados | Não — **condicional e não fatal** quando code scanning/GHAS/permissão indisponível |

## 2. Gitleaks — política

- Escaneia **apenas o tree atual** (`--no-git`); o **histórico não é gate** — o incidente
  INC-2026-10-11 foi mitigado por rotação e o inventário do histórico vive em relatório
  separado (`.claude/reports/secret-exposure-sweep-2026-10-11.md`).
- Sempre com `--redact` (o valor encontrado nunca é impresso).
- Versão **pinada com checksum** (v8.30.1) — **não depende** de GHAS/Secret Protection.
- Allowlist (`.gitleaks.toml`) restrita a: exclusões **estruturais** (node_modules,
  build, logs/report locais) e **fixtures sintéticos verificados** com justificativa.
  Proibido allowlist amplo que possa esconder credencial real.

### Comando local (equivalente ao CI)

```bash
gitleaks detect --source . --no-git --redact --config .gitleaks.toml \
  --report-format sarif --report-path gitleaks.sarif --exit-code 1
```

### Validação do gate (how-to)

Para provar que o gate FALHA com segredo de formato real, crie um arquivo **fora do
repositório** (ou ignorado) com uma credencial sintética de formato válido e rode o
detect apontando para ele com uma config mínima (sem allowlist). O exit code deve ser 1.

## 3. Trivy

- O scan **gera explicitamente** `trivy-results.sarif` (fs) e `trivy-image-results.sarif`
  (imagem).
- O **upload SARIF** só roda se o arquivo existir (`hashFiles(...) != ''`) e é
  `continue-on-error: true` (falha de plataforma não derruba o workflow).
- O **scan em si nunca** leva `continue-on-error`; severidade/exit seguem a política do
  repositório (modo relatório — D-534; promoção a bloqueante é decisão do Operador).

## 4. Como interpretar erros comuns

| Erro no log | Significado | Ação |
|---|---|---|
| `Resource not accessible by integration` | Token/plano sem acesso à API de code scanning (upload SARIF) | Upload é não-fatal por design; habilitar code scanning e/ou conferir permissões |
| `code scanning is not enabled` | Code Scanning não habilitado no repositório/plano | Em repositório público é gratuito — habilitar; em privado exige GHAS/Code Security |
| `Path does not exist: trivy-results.sarif` | O upload tentou enviar um SARIF que não foi gerado | Upload agora é condicional (`hashFiles`); investigar o scan se ausente |

**Secret Protection ≠ Code Scanning:** o primeiro cobre segredos (secret scanning/push
protection); o segundo publica resultados SAST (SARIF). Os dois podem estar em estados
diferentes — ver `docs/06-devops-deployment/GITHUB_SECURITY_SETTINGS.md`.

## 5. Histórico

- **2026-10-11 (T186/D-578):** Gitleaks adotado como padrão bloqueador; uploads SARIF
  condicionais/não-fatais; diagnóstico do run `38151955200` (falha de permissão/code
  scanning em repositório privado à época — **não** achado novo de segredo).

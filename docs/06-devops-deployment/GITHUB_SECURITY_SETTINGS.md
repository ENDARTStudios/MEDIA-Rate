# GitHub — Configurações de Segurança do Repositório (status + passos manuais)

Estado verificado via API (`gh`) em **2026-10-11**.

| Recurso | Estado | Evidência sanitizada |
|---|---|---|
| Visibilidade | **PÚBLICO** (decisão do Operador) | `gh api repos/...` → `visibility=public`, `private=false` |
| Secret scanning / Push Protection | **ATIVO** | `GET .../secret-scanning/alerts` → **disponível** (0 alertas na verificação) |
| Code scanning (CodeQL/SARIF) | **ATIVO** | `GET .../code-scanning/alerts` → **disponível** (30 alertas pré-existentes na verificação) |
| Dependabot | ativo (automação de PRs) | PRs #515/#518/#522 abertas pela automação |

**Gitleaks (padrão do projeto):** complementa a plataforma e **não depende** de Secret
Protection/GHAS — é o gate **bloqueador** de segredos no CI para o tree atual
(ver `docs/08-security/SECURITY_CI.md`, decisão D-578).

## Distinções (para não confundir os recursos)

- **GitHub Secret Protection / Secret scanning:** detecta segredos; **pode estar ativo
  sem code scanning**.
- **GitHub Advanced Security / Code Scanning (SARIF):** publica SAST (CodeQL/Trivy/
  Gitleaks); **em repositório privado exige GHAS**; em repositório público é gratuito.
- **Gitleaks:** roda no CI do projeto; bloqueia finding real; **independente da plataforma**.

## Passos manuais (se algum recurso ficar indisponível)

1. **Secret scanning / push protection:** Settings → *Code security and analysis* →
   habilitar. Verificação (read-only):
   `gh api repos/ENDARTStudios/MEDIA-Rate/secret-scanning/alerts` (deve responder lista).
2. **Code scanning (SARIF):** habilitar em *Code security* (público: gratuito; privado:
   exige GHAS/Code Security). Verificação (read-only):
   `gh api repos/ENDARTStudios/MEDIA-Rate/code-scanning/alerts`.
3. **Dependabot alerts:** gratuito em qualquer visibilidade — recomendado ativo.

## Histórico

- **2026-10-10 (T182/T183):** repositório PÚBLICO com secret scanning/push protection
  desabilitados (incidente INC-2026-10-11 — ver `docs/08-security/SECURITY_INCIDENTS.md`).
- **2026-10-11 (T184):** repositório tornado privado pelo Operador; tentativa de
  habilitação de secret scanning via API retornou 422 (recurso pago em privado);
  workflow Security passou a falhar em repositório privado (code scanning exige GHAS).
- **2026-10-11 (T186):** repositório **PÚBLICO** novamente (decisão do Operador);
  secret scanning e code scanning **VERIFICADOS ATIVOS** via API; Gitleaks adotado como
  padrão bloqueador; uploads SARIF condicionais/não-fatais; diagnóstico do run
  `38151955200` registrado (falha de plataforma, não achado novo) — decisão **D-578**.

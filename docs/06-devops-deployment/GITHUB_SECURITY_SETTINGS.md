# GitHub — Configurações de Segurança do Repositório (status + passos manuais)

Estado verificado via API (`gh`) em 2026-10-11, com o repositório **privado**.

| Recurso | Estado | Evidência sanitizada |
|---|---|---|
| Visibilidade | **PRIVADO** | `gh repo view --json isPrivate` → `true` |
| Secret scanning | **INDISPONÍVEL no plano atual** | `PATCH /repos/.../security_and_analysis` → **422 "Secret scanning is not available for this repository"**; `GET .../secret-scanning/alerts` → 404 "disabled" |
| Push protection | **INDISPONÍVEL (mesmo motivo)** | idem (bloqueio por plano, não por permissão do token) |
| Dependabot security updates | desabilitado (herdado) | `security_and_analysis.dependabot_security_updates=disabled` |

**Por quê:** o secret scanning **gratuito** do GitHub cobre repositórios **públicos**.
Em repositórios **privados**, secret scanning e push protection exigem o produto pago
**GitHub Secret Protection** (linha do GitHub Advanced Security). A tentativa de
habilitação via API (T184) foi negada com 422 — **não é falta de permissão do token**.
O agente **não declara habilitado** o que não pôde verificar.

## Passos manuais (Operador)

1. **Decisão de custo — Secret Protection (pago):** habilitar na organização/repositório
   `ENDARTStudios/MEDIA-Rate`: GitHub → Settings → *Code security* → **Secret Protection**
   (inclui secret scanning + push protection). No repositório: Settings → *Code security
   and analysis* → **Secret scanning** / **Push protection** → *Enable* (as opções ficam
   visíveis apenas com o produto ativo).
2. **Verificação pós-habilitação (o agente pode executar, read-only):**
   - `gh api repos/ENDARTStudios/MEDIA-Rate -q '.security_and_analysis'` deve exibir
     `secret_scanning.status=enabled` e `secret_scanning_push_protection.status=enabled`;
   - `gh api repos/ENDARTStudios/MEDIA-Rate/secret-scanning/alerts` deixa de responder 404.
3. **Dependabot alerts (gratuito também em privado):** pode ser habilitado imediatamente
   (Settings → *Code security* → Dependabot alerts) — recomendado como complemento.
4. **Compensação atual:** o gate `Docs Gate — Secret scan (padrões óbvios)` continua
   rodando em toda PR de docs/alterações (`.github/workflows/ci.yml`); manter até que a
   proteção de plataforma esteja ativa.

## Histórico

- **2026-10-10 (T182/T183):** repositório PÚBLICO com secret scanning e push protection
  DESABILITADOS — sem alertas de plataforma (incidente INC-2026-10-11, ver
  `docs/08-security/SECURITY_INCIDENTS.md`).
- **2026-10-11 (T184):** repositório tornado privado pelo Operador; tentativa de
  habilitação via API registrada (422 — recurso indisponível no plano). Feature pendente
  de decisão de custo/configuração.

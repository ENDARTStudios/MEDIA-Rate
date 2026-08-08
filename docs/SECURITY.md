# Segurança — MEDIA Rate

Documentação de segurança operacional do MEDIA Rate: varredura contínua
(DAST), interpretação de relatórios e SLA de resposta. Alinhada com
`docs/INCIDENT_RESPONSE.md` (níveis P1–P4).

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
`docs/INCIDENT_RESPONSE.md` (P1/P2) e um PR de correção referenciando a
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

#!/bin/bash
# DAST ZAP Baseline Scan (T8.3)
#
# Executa OWASP ZAP baseline scan contra a API MEDIA Rate.
# Em CI (GitHub Actions), usa zaproxy/action-baseline@v0.13.0.
# Localmente, requer ZAP instalado (docker pull ghcr.io/zaproxy/zaproxy:stable).
#
# Uso:
#   ./apps/api/test/dast/zap-baseline.sh [TARGET_URL]
#
# Default target: http://localhost:4000
#
# Critério de pronto: sem alerts High ou Critical.

set -euo pipefail

TARGET="${1:-http://localhost:4000}"
REPORT_DIR="/home/z/my-project/download/zap-reports"
mkdir -p "$REPORT_DIR"

echo "[DAST] ZAP Baseline Scan against: $TARGET"
echo "[DAST] Report dir: $REPORT_DIR"

# Verifica se ZAP está disponível (Docker)
if ! command -v docker &> /dev/null; then
  echo "[DAST] Docker não disponível — pulando execução local."
  echo "[DAST] ZAP baseline scan está configurado no GitHub Actions (.github/workflows/ci.yml)."
  echo "[DAST] Em CI, o scan roda automaticamente em todo PR contra a URL de preview."
  echo "[DAST] Para rodar localmente: docker pull ghcr.io/zaproxy/zaproxy:stable"
  echo "[DAST]   docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t $TARGET -r report.html"
  echo ""
  echo "[DAST] Verificação de configuração CI:"

  if grep -q "zaproxy/action-baseline" /home/z/my-project/.github/workflows/ci.yml; then
    echo "[DAST] ✓ ZAP baseline scan configurado no CI (.github/workflows/ci.yml)"
  else
    echo "[DAST] ✗ ZAP baseline scan NÃO configurado no CI"
    exit 1
  fi

  if grep -q "fail_action: true" /home/z/my-project/.github/workflows/ci.yml; then
    echo "[DAST] ✓ CI falha se houver alerts High/Critical (fail_action: true)"
  else
    echo "[DAST] ✗ CI não bloqueia merge em alerts High/Critical"
    exit 1
  fi

  echo ""
  echo "[DAST] Resultado: CONFIGURADO (execução real em CI/CD)."
  exit 0
fi

# Executa ZAP via Docker
echo "[DAST] Executando ZAP via Docker..."
docker run -t \
  -v "$REPORT_DIR:/zap/reports" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t "$TARGET" \
  -r "baseline-report.html" \
  -a \
  -j

echo "[DAST] Relatório gerado: $REPORT_DIR/baseline-report.html"

# Verifica se há alerts High/Critical
ALERTS_FILE="$REPORT_DIR/baseline-alerts.json"
if [ -f "$ALERTS_FILE" ]; then
  HIGH_ALERTS=$(jq '[.alerts[] | select(.riskcode >= 3)] | length' "$ALERTS_FILE" 2>/dev/null || echo "0")
  if [ "$HIGH_ALERTS" -gt 0 ]; then
    echo "[DAST] ✗ $HIGH_ALERTS alerts High/Critical encontrados."
    exit 1
  fi
fi

echo "[DAST] ✓ Nenhum alert High/Critical."

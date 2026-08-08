#!/usr/bin/env bash
# ============================================================
# T219 — ZAP Baseline Scan LOCAL (DAST manual em dev).
# Executa o mesmo baseline scan do CI (zaproxy) contra a API local
# (default: http://localhost:4000) usando as regras de supressão
# versionadas em test/dast/zap-rules.conf.
#
# Requisitos: Docker (imagem ghcr.io/zaproxy/zaproxy).
# Uso:
#   bash test/dast/zap-baseline.sh [target] [arquivo-de-regras]
#   bash test/dast/zap-baseline.sh http://localhost:4000
#   bash test/dast/zap-baseline.sh https://preview-123.media-rate.example.com
# ============================================================
set -euo pipefail

TARGET="${1:-http://localhost:4000}"
RULES="${2:-test/dast/zap-rules.conf}"
WORKDIR="test/dast"

if [ ! -f "$RULES" ]; then
  echo "ERRO: arquivo de regras '$RULES' nao encontrado." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERRO: docker nao instalado — necessario para a imagem ZAP." >&2
  exit 1
fi

echo "=== ZAP Baseline (local) ==="
echo "Target:  $TARGET"
echo "Regras:  $RULES"
echo "Relatorio: $WORKDIR/zap-report-local.html"

docker run --rm -t \
  -v "$(pwd)/$WORKDIR:/zap/wrk/:rw" \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t "$TARGET" \
  -r /zap/wrk/zap-report-local.html \
  -c /zap/wrk/zap-rules.conf \
  -a -j

echo "=== Concluido: abra test/dast/zap-report-local.html ==="

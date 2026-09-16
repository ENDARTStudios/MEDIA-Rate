#!/usr/bin/env bash
# T467/D-506 — verificação MANUAL do upload R2 em produção (NÃO é CI).
#
# Pré-requisitos:
#   - R2 ativado na conta Cloudflare + bucket media-rate-assets criado
#     (senão: EPROTO no TLS do endpoint S3 — ver docs/legal/R2-TEST-MEDIA.md);
#   - E2E_TEST_EMAIL/E2E_TEST_PASSWORD no .env (usuário promovido a ADMIN
#     temporariamente — despromover após o teste);
#   - media de teste 424e6a91-5b5c-4659-b805-bb06ed13547d existente.
#
# Uso: bash scripts/verify-prod/r2-upload-check.sh
set -euo pipefail

BASE="${E2E_API_BASE:-https://media-rate-production.up.railway.app}"
MIDIA_ID="424e6a91-5b5c-4659-b805-bb06ed13547d"
EMAIL="${E2E_TEST_EMAIL:-lgpd-test@mediarate.test}"
PASS="${E2E_TEST_PASSWORD:?E2E_TEST_PASSWORD ausente}"
CDIR="$(mktemp -d)"

cleanup() { rm -rf "$CDIR"; }
trap cleanup EXIT

echo "[1/3] login $EMAIL"
curl -s -c "$CDIR/cookies.txt" -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" -o "$CDIR/login.json"
grep -q '"csrf_token"' "$CDIR/login.json" || { echo "FALHA: login sem csrf"; exit 1; }
CSRF=$(python -c "import json;print(json.load(open('$CDIR/login.json'))['csrf_token'])")

echo "[2/3] upload p/ media-test $MIDIA_ID"
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > "$CDIR/probe.jpg"
HTTP=$(curl -s -b "$CDIR/cookies.txt" -X POST \
  "$BASE/api/v1/admin/assets/$MIDIA_ID/FILME" \
  -H "x-csrf-token: $CSRF" -F "file=@$CDIR/probe.jpg;type=image/jpeg" \
  -o "$CDIR/upload.json" -w "%{http_code}")
echo "HTTP $HTTP"
cat "$CDIR/upload.json"; echo

if [ "$HTTP" = "201" ]; then
  echo "[3/3] OK — conferir: audit MEDIA_ASSET_UPLOADED no banco + objeto no bucket."
  exit 0
fi
echo "FALHA: esperado 201 (ver R2-TEST-MEDIA.md). HTTP=$HTTP"
exit 1

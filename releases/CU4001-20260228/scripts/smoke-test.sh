#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3017}"
DB_USER="${DB_USER:-erpuser}"
DB_PASS="${DB_PASS:-Pepe1234++}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-erpdb}"
TEST_USER="${TEST_USER:-1}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
COOKIE_FILE="$TMP_DIR/cu4001.cookie"

OTP=$(mysql -N -s -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" -D "$DB_NAME" -e "CALL generar_otp_usuario('$TEST_USER'); SELECT otp FROM otp_codes WHERE user_id='$TEST_USER' AND used=0 ORDER BY created_at DESC LIMIT 1;" | tail -n 1)
if [[ -z "${OTP:-}" ]]; then
  echo "FAIL: no se pudo generar OTP"
  exit 1
fi

echo "SMOKE 1/5: GET / con OTP"
HTTP_ROOT=$(curl -sS -o "$TMP_DIR/root.html" -c "$COOKIE_FILE" -w "%{http_code}" "$BASE_URL/?Codigo_usuario=$TEST_USER&OTP=$OTP")
[[ "$HTTP_ROOT" == "200" ]] || { echo "FAIL: / expected 200 got $HTTP_ROOT"; exit 1; }

echo "SMOKE 2/5: GET /api/init"
HTTP_INIT=$(curl -sS -o "$TMP_DIR/init.json" -b "$COOKIE_FILE" -w "%{http_code}" "$BASE_URL/api/init")
[[ "$HTTP_INIT" == "200" ]] || { echo "FAIL: /api/init expected 200 got $HTTP_INIT"; cat "$TMP_DIR/init.json"; exit 1; }

echo "SMOKE 3/5: GET /api/bases"
HTTP_BASES=$(curl -sS -o "$TMP_DIR/bases.json" -b "$COOKIE_FILE" -w "%{http_code}" "$BASE_URL/api/bases")
[[ "$HTTP_BASES" == "200" ]] || { echo "FAIL: /api/bases expected 200 got $HTTP_BASES"; cat "$TMP_DIR/bases.json"; exit 1; }

echo "SMOKE 4/5: GET /api/productos"
HTTP_PROD=$(curl -sS -o "$TMP_DIR/productos.json" -b "$COOKIE_FILE" -w "%{http_code}" "$BASE_URL/api/productos")
[[ "$HTTP_PROD" == "200" ]] || { echo "FAIL: /api/productos expected 200 got $HTTP_PROD"; cat "$TMP_DIR/productos.json"; exit 1; }

echo "SMOKE 5/5: POST /api/transferencias sin confirmacion (debe bloquear)"
HTTP_BLOCK=$(curl -sS -o "$TMP_DIR/block.json" -b "$COOKIE_FILE" -H 'Content-Type: application/json' -d '{"vFecha":"2026-02-28","vCodigo_base":"1","vCodigo_basedestino":"2","vDetalleTransferencia":[{"vcodigo_producto":"2","Vcantidad":1}]}' -w "%{http_code}" "$BASE_URL/api/transferencias")
[[ "$HTTP_BLOCK" == "422" ]] || { echo "FAIL: expected 422 got $HTTP_BLOCK"; cat "$TMP_DIR/block.json"; exit 1; }

echo "PASS: smoke test CU4001 OK"

#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3018}"
DB_USER="${DB_USER:-erpuser}"
DB_PASS="${DB_PASS:-Pepe1234++}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-erpdb}"
TEST_USER="${TEST_USER:-1}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
COOKIE_FILE="$TMP_DIR/cu4002.cookie"

OTP=$(mysql -N -s -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" -D "$DB_NAME" -e "CALL generar_otp_usuario('$TEST_USER'); SELECT otp FROM otp_codes WHERE user_id='$TEST_USER' AND used=0 ORDER BY created_at DESC LIMIT 1;" | tail -n 1)
if [[ -z "${OTP:-}" ]]; then
  echo "FAIL: no se pudo generar OTP"
  exit 1
fi

echo "SMOKE 1/7: GET /api/init sin auth (espera 403)"
HTTP_NOAUTH=$(curl -sS -o "$TMP_DIR/noauth.json" -w "%{http_code}" "$BASE_URL/api/init")
[[ "$HTTP_NOAUTH" == "403" ]] || { echo "FAIL: /api/init sin auth expected 403 got $HTTP_NOAUTH"; cat "$TMP_DIR/noauth.json"; exit 1; }

echo "SMOKE 2/7: GET / con OTP valido"
HTTP_ROOT=$(curl -sS -o "$TMP_DIR/root.html" -c "$COOKIE_FILE" -w "%{http_code}" "$BASE_URL/?Codigo_usuario=$TEST_USER&OTP=$OTP")
[[ "$HTTP_ROOT" == "200" ]] || { echo "FAIL: / expected 200 got $HTTP_ROOT"; exit 1; }

echo "SMOKE 3/7: GET /api/init con auth"
HTTP_INIT=$(curl -sS -o "$TMP_DIR/init.json" -b "$COOKIE_FILE" -w "%{http_code}" "$BASE_URL/api/init")
[[ "$HTTP_INIT" == "200" ]] || { echo "FAIL: /api/init expected 200 got $HTTP_INIT"; cat "$TMP_DIR/init.json"; exit 1; }

echo "SMOKE 4/7: GET /api/bases"
HTTP_BASES=$(curl -sS -o "$TMP_DIR/bases.json" -b "$COOKIE_FILE" -w "%{http_code}" "$BASE_URL/api/bases")
[[ "$HTTP_BASES" == "200" ]] || { echo "FAIL: /api/bases expected 200 got $HTTP_BASES"; cat "$TMP_DIR/bases.json"; exit 1; }
BASE_ID=$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const v=(j.data&&j.data[0]&&j.data[0].codigo_base)||''; process.stdout.write(String(v));" "$TMP_DIR/bases.json")
[[ -n "$BASE_ID" ]] || { echo "FAIL: /api/bases sin datos"; exit 1; }

echo "SMOKE 5/7: GET /api/productos-stock?codigo_base=$BASE_ID"
HTTP_PROD=$(curl -sS -o "$TMP_DIR/prod.json" -b "$COOKIE_FILE" -w "%{http_code}" "$BASE_URL/api/productos-stock?codigo_base=$BASE_ID")
[[ "$HTTP_PROD" == "200" ]] || { echo "FAIL: /api/productos-stock expected 200 got $HTTP_PROD"; cat "$TMP_DIR/prod.json"; exit 1; }

echo "SMOKE 6/7: POST /api/ajustes payload invalido (espera 400)"
HTTP_BAD=$(curl -sS -o "$TMP_DIR/bad-ajuste.json" -b "$COOKIE_FILE" -H 'Content-Type: application/json' -d '{"vFecha":"","vCodigo_base":"","vDetalleAjuste":[]}' -w "%{http_code}" "$BASE_URL/api/ajustes")
[[ "$HTTP_BAD" == "400" ]] || { echo "FAIL: /api/ajustes invalido expected 400 got $HTTP_BAD"; cat "$TMP_DIR/bad-ajuste.json"; exit 1; }

echo "SMOKE 7/7: GET /api/sql-logs protegido (espera 403 o 404 o 200 autorizado)"
HTTP_SQL=$(curl -sS -o "$TMP_DIR/sql.json" -b "$COOKIE_FILE" -w "%{http_code}" "$BASE_URL/api/sql-logs")
[[ "$HTTP_SQL" == "403" || "$HTTP_SQL" == "404" || "$HTTP_SQL" == "200" ]] || { echo "FAIL: /api/sql-logs expected 403/404/200 got $HTTP_SQL"; cat "$TMP_DIR/sql.json"; exit 1; }

echo "PASS: smoke test CU4002 OK"

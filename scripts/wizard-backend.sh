#!/usr/bin/env bash
set -euo pipefail

CMD="${1:-start}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/wizard/.backend-logs"
PID_DIR="$ROOT_DIR/wizard/.backend-pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "node no esta disponible en PATH."
  exit 1
fi

NODE_BIN="${NODE_BIN:-}"
if [[ -z "$NODE_BIN" ]]; then
  if [[ -x "$HOME/.nvm/versions/node/v20.20.0/bin/node" ]]; then
    NODE_BIN="$HOME/.nvm/versions/node/v20.20.0/bin/node"
  elif command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
  fi
fi

if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
  echo "No se encontro un binario de node ejecutable."
  exit 1
fi

mapfile -d '' -t SERVERS < <(find "$ROOT_DIR/wizard" -mindepth 2 -maxdepth 2 -name server.js -print0 | sort -z)

if [[ ${#SERVERS[@]} -eq 0 ]]; then
  echo "No se encontraron servicios (server.js) bajo wizard/."
  exit 1
fi

service_id() {
  local rel
  rel="${1#"$ROOT_DIR/"}"
  rel="${rel%/server.js}"
  rel="${rel//\//_}"
  rel="${rel// /_}"
  echo "$rel"
}

is_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

start_service() {
  local server="$1"
  local id
  id="$(service_id "$server")"
  local pid_file="$PID_DIR/$id.pid"
  local log_file="$LOG_DIR/$id.log"

  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if is_running "$pid"; then
      echo "SKIP  $id (pid $pid)"
      return 0
    fi
    rm -f "$pid_file"
  fi

  local dir
  dir="$(dirname "$server")"
  (
    cd "$dir"
    nohup "$NODE_BIN" "server.js" >> "$log_file" 2>&1 &
    echo $! > "$pid_file"
  )
  echo "START $id (log: $log_file)"
}

stop_service() {
  local server="$1"
  local id
  id="$(service_id "$server")"
  local pid_file="$PID_DIR/$id.pid"

  if [[ ! -f "$pid_file" ]]; then
    echo "STOP  $id (sin pid)"
    return 0
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if is_running "$pid"; then
    kill "$pid" || true
    echo "STOP  $id (pid $pid)"
  else
    echo "STOP  $id (pid stale)"
  fi
  rm -f "$pid_file"
}

status_service() {
  local server="$1"
  local id
  id="$(service_id "$server")"
  local pid_file="$PID_DIR/$id.pid"

  if [[ ! -f "$pid_file" ]]; then
    echo "DOWN  $id"
    return 0
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if is_running "$pid"; then
    echo "UP    $id (pid $pid)"
  else
    echo "DOWN  $id (pid stale)"
  fi
}

case "$CMD" in
  start)
    for server in "${SERVERS[@]}"; do
      start_service "$server"
    done
    ;;
  stop)
    for server in "${SERVERS[@]}"; do
      stop_service "$server"
    done
    ;;
  restart)
    for server in "${SERVERS[@]}"; do
      stop_service "$server"
    done
    for server in "${SERVERS[@]}"; do
      start_service "$server"
    done
    ;;
  status)
    for server in "${SERVERS[@]}"; do
      status_service "$server"
    done
    ;;
  *)
    echo "Uso: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac

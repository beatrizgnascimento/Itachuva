#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_DIR="$ROOT_DIR/.local"
PGDATA="$LOCAL_DIR/postgres"
PGLOG="$LOCAL_DIR/postgres.log"
SOCKET_DIR="$LOCAL_DIR/postgres-socket"

BACKEND_PID=""
FRONTEND_PID=""
POSTGRES_STARTED="0"

cleanup() {
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi

  if [ "$POSTGRES_STARTED" = "1" ]; then
    pg_ctl -D "$PGDATA" stop -m fast >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

ensure_postgres_running() {
  require_command pg_ctl
  require_command psql

  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Local Postgres is not initialized. Run ./setup.sh first." >&2
    exit 1
  fi

  mkdir -p "$LOCAL_DIR" "$SOCKET_DIR"

  if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
    echo "Starting local Postgres cluster..."
    pg_ctl \
      -D "$PGDATA" \
      -o "-p 5432 -c listen_addresses='localhost' -c unix_socket_directories='$SOCKET_DIR'" \
      -l "$PGLOG" \
      start
    POSTGRES_STARTED="1"
  fi

  if ! psql -h localhost -p 5432 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'itachuva'" | grep -q 1; then
    createdb -h localhost -p 5432 -U postgres itachuva
  fi
}

run_pipeline() {
  require_command python3
  echo "Running pipeline..."
  (cd "$ROOT_DIR/pipeline/src" && python3 run_pipeline.py)
}

start_backend() {
  require_command node
  echo "Starting backend..."
  (
    cd "$ROOT_DIR/backend"
    env \
      DATABASE_URL=postgres://postgres@localhost:5432/itachuva \
      PGHOST=localhost \
      PGUSER=postgres \
      PGPASSWORD= \
      PGDATABASE=itachuva \
      PGPORT=5432 \
      PGSSLMODE=disable \
      CORS_ORIGIN=http://localhost:3000 \
      node server.js
  ) &
  BACKEND_PID="$!"
}

start_frontend() {
  require_command npm
  echo "Starting frontend..."
  (cd "$ROOT_DIR/frontend" && npm run dev) &
  FRONTEND_PID="$!"
}

ensure_postgres_running
run_pipeline
start_backend
start_frontend

echo "Backend: http://localhost:4000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop all services."

wait "$BACKEND_PID" "$FRONTEND_PID"
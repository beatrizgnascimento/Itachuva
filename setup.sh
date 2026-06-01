#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
PIPELINE_DIR="$ROOT_DIR/pipeline"
LOCAL_DIR="$ROOT_DIR/.local"
PGDATA="${PGDATA:-$LOCAL_DIR/postgres}"
PGLOG="$LOCAL_DIR/postgres.log"
SOCKET_DIR="$LOCAL_DIR/postgres-socket"

mkdir -p "$LOCAL_DIR"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[setup] Missing required command: $cmd"
    exit 1
  fi
}

load_backend_env() {
  if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo "[setup] Created backend/.env from .env.example"
  fi

  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_DIR/.env"
  set +a
}

start_postgres_if_needed() {
  local pgport="${PGPORT:-5432}"
  local pguser="${PGUSER:-postgres}"

  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "[setup] Initializing local Postgres cluster at $PGDATA"
    rm -rf "$PGDATA"
    initdb -D "$PGDATA" -U "$pguser" --auth=trust >/dev/null
  fi

  mkdir -p "$SOCKET_DIR"

  if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
    echo "[setup] Starting local Postgres on port $pgport"
    pg_ctl -D "$PGDATA" -o "-p $pgport -c listen_addresses='localhost' -c unix_socket_directories='$SOCKET_DIR'" -l "$PGLOG" start >/dev/null
  else
    echo "[setup] Local Postgres already running"
  fi
}

ensure_database() {
  local pguser="${PGUSER:-postgres}"
  local pgport="${PGPORT:-5432}"
  local pgdatabase="${PGDATABASE:-itachuva}"

  echo "[setup] Ensuring database '$pgdatabase' exists"

  if ! psql -h localhost -p "$pgport" -U "$pguser" -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname = '$pgdatabase'" | grep -q 1; then
    createdb -h localhost -p "$pgport" -U "$pguser" "$pgdatabase"
  fi
}

ensure_schema() {
  echo "[setup] Ensuring backend schema"
  (
    cd "$BACKEND_DIR"
    node -e "const { createPool, ensureSchema } = require('./src/db'); (async () => { const pool = createPool(); try { await ensureSchema(pool); } finally { await pool.end(); } })().catch((error) => { console.error(error); process.exit(1); });"
  )
}

main() {
  require_cmd node
  require_cmd npm
  require_cmd python3
  require_cmd psql
  require_cmd initdb
  require_cmd pg_ctl
  require_cmd createdb

  echo "[setup] Installing backend dependencies"
  (cd "$BACKEND_DIR" && npm install)

  echo "[setup] Installing frontend dependencies"
  (cd "$FRONTEND_DIR" && npm install)

  load_backend_env
  start_postgres_if_needed
  ensure_database
  ensure_schema

  mkdir -p "$PIPELINE_DIR/data/raw" "$PIPELINE_DIR/data/processed" "$PIPELINE_DIR/data/output"

  echo "[setup] Done"
  echo "[setup] Postgres data dir: $PGDATA"
  echo "[setup] Postgres log: $PGLOG"
}

main "$@"
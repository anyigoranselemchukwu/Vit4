#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python - <<'PY'
import sqlite3
import subprocess
from pathlib import Path

db_path = Path("vit.db")
sentinel_tables = {
    "wallets",
    "wallet_transactions",
    "notifications",
    "platform_configs",
    "gov_proposals",
    "bridge_transactions",
    "dev_api_keys",
    "marketplace_listings",
}

if db_path.exists():
    conn = sqlite3.connect(db_path)
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    has_version = "alembic_version" in tables
    version = None
    if has_version:
        row = conn.execute("SELECT version_num FROM alembic_version LIMIT 1").fetchone()
        version = row[0] if row else None
    conn.close()
    if has_version and version != "22c85e91a8d9" and sentinel_tables.issubset(tables):
        subprocess.run(["alembic", "stamp", "head"], check=True)
    else:
        subprocess.run(["alembic", "upgrade", "head"], check=True)
else:
    subprocess.run(["alembic", "upgrade", "head"], check=True)
PY
python -m uvicorn main:app --host 0.0.0.0 --port "${BACKEND_PORT:-8000}" &
BACKEND_PID=$!
# Wait for backend to be ready before starting the frontend
until curl -sf "http://localhost:${BACKEND_PORT:-8000}/health" > /dev/null 2>&1; do sleep 1; done
cd frontend
npm install
# Use relative URLs so Vite proxy handles routing to the backend
npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT:-5000}" &
FRONTEND_PID=$!
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' EXIT
wait

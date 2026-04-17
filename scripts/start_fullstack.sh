#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python -m uvicorn main:app --host 0.0.0.0 --port "${BACKEND_PORT:-8000}" &
BACKEND_PID=$!
cd frontend
npm install
# Use relative URLs and let Vite proxy to localhost:8000
VITE_API_URL="http://localhost:${BACKEND_PORT:-8000}" npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT:-5000}" &
FRONTEND_PID=$!
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' EXIT
wait

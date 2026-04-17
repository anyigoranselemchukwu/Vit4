#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
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

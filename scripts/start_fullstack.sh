#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

ALEMBIC_BIN="/home/runner/workspace/.pythonlibs/bin/alembic"

# Run database migrations / ensure schema is up to date
python -c "
import asyncio, os

async def ensure_schema():
    from app.db.database import engine, Base
    import app.db.models
    import app.modules.wallet.models
    import app.modules.blockchain.models
    import app.modules.training.models
    import app.modules.ai.models
    import app.data.models
    import app.modules.notifications.models
    import app.modules.marketplace.models
    import app.modules.trust.models
    import app.modules.bridge.models
    import app.modules.developer.models
    import app.modules.governance.models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('[startup] Database schema ready')

asyncio.run(ensure_schema())
"

# Start backend
python -m uvicorn main:app --host 0.0.0.0 --port "${BACKEND_PORT:-8000}" &
BACKEND_PID=$!

# Wait for backend to be ready
until curl -sf "http://localhost:${BACKEND_PORT:-8000}/health" > /dev/null 2>&1; do sleep 1; done

# Start frontend
cd frontend
npm install --prefer-offline
npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT:-5000}" &
FRONTEND_PID=$!

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' EXIT
wait

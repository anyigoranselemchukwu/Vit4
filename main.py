# main.py — VIT Sports Intelligence Network v4.0.0
# Full Integration: AI + Wallet + Blockchain + Training

import asyncio
import os
import uuid
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.config import get_env, APP_VERSION
from app.db.database import engine, Base, get_db, _is_sqlite
import app.db.models  # ensure all models registered
import app.modules.wallet.models  # register wallet models with SQLAlchemy

# ===== CORE ROUTES =====
from app.api.routes import (
    predict,
    result,
    history,
    admin,
    ai_feed,
    ai as ai_route,
    training as training_route,
    analytics as analytics_route,
    odds_compare as odds_route,
    subscription as subscription_route,
    audit as audit_route,
)

# ===== AUTH ROUTES =====
from app.auth.routes import router as auth_router

# ===== WALLET ROUTES (Phase 1) =====
from app.modules.wallet.routes import router as wallet_router
from app.modules.wallet.admin_routes import router as wallet_admin_router

# ===== BLOCKCHAIN ROUTES (Phase 4 — not yet built) =====
# from app.blockchain.routes import router as blockchain_router

# ===== MIDDLEWARE =====
from app.api.middleware.auth import APIKeyMiddleware
from app.api.middleware.logging import LoggingMiddleware
from app.api.middleware.rate_limit import RateLimitMiddleware

# ===== SERVICES =====
from app.schemas.schemas import HealthResponse
from app.services.alerts import TelegramAlert
from app.core.dependencies import (
    get_orchestrator,
    get_data_loader,
    get_telegram_alerts,
)

# ===== BACKGROUND TASKS =====
from app.services.model_accountability import ModelAccountability
from app.services.results_settler import settle_results
# from app.wallet.pricing import recalculate_vitcoin_price

load_dotenv()

# ============================================
# BACKGROUND TASKS
# ============================================

_SETTLEMENT_INTERVAL_HOURS = 6
_ACCOUNTABILITY_INTERVAL_HOURS = 24
_VITCOIN_PRICING_INTERVAL_HOURS = 6


async def auto_settle_loop():
    await asyncio.sleep(60)
    while True:
        if os.getenv("FOOTBALL_DATA_API_KEY"):
            try:
                result = await settle_results(days_back=2)
                print(f"[settlement] {result}")
            except Exception as e:
                print(f"[settlement] ERROR: {e}")
        await asyncio.sleep(_SETTLEMENT_INTERVAL_HOURS * 3600)


async def model_accountability_loop():
    from app.db.database import AsyncSessionLocal

    await asyncio.sleep(120)
    while True:
        try:
            async with AsyncSessionLocal() as db:
                ma = ModelAccountability(db)
                await ma.update_model_weights()
                print("[accountability] updated")
        except Exception as e:
            print(f"[accountability] ERROR: {e}")

        await asyncio.sleep(_ACCOUNTABILITY_INTERVAL_HOURS * 3600)


async def vitcoin_pricing_loop():
    pass  # stub until app.wallet.pricing is built (Phase 1)


# ============================================
# LIFECYCLE
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"\n🚀 VIT Network v{APP_VERSION} starting...")

    # DB INIT
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database ready")

    # SERVICES
    orchestrator = get_orchestrator()
    if orchestrator:
        print(f"✅ ML Models: {orchestrator.num_models_ready()} ready")

    alerts = get_telegram_alerts()
    if alerts and alerts.enabled:
        await alerts.send_startup_message()

    # BACKGROUND TASKS
    tasks = [
        asyncio.create_task(auto_settle_loop()),
        asyncio.create_task(model_accountability_loop()),
        asyncio.create_task(vitcoin_pricing_loop()),
    ]

    print("✅ Background services started")
    print("🌐 API running at http://localhost:5000")

    yield

    for task in tasks:
        task.cancel()

    print("🛑 Shutdown complete")


# ============================================
# APP INIT
# ============================================

app = FastAPI(
    title="VIT Sports Intelligence Network",
    version=APP_VERSION,
    lifespan=lifespan,
)

# ============================================
# MIDDLEWARE
# ============================================

cors_origins = get_env("CORS_ALLOWED_ORIGINS", "*")
origins = ["*"] if cors_origins == "*" else cors_origins.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(APIKeyMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)


# ============================================
# ROUTES
# ============================================

# Core
app.include_router(predict.router)
app.include_router(result.router)
app.include_router(history.router)
app.include_router(admin.router)
app.include_router(training_route.router)
app.include_router(analytics_route.router)
app.include_router(odds_route.router)
app.include_router(ai_feed.router)
app.include_router(ai_route.router)
app.include_router(subscription_route.router)
app.include_router(audit_route.router)

# Auth (JWT)
app.include_router(auth_router)

# Wallet (Phase 1)
app.include_router(wallet_router)
app.include_router(wallet_admin_router)

# Blockchain (Phase 4 — not yet built)
# app.include_router(blockchain_router, prefix="/api/blockchain")


# ============================================
# UTILITIES
# ============================================

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ============================================
# HEALTH
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health(db: AsyncSession = Depends(get_db)):
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except:
        db_ok = False

    orch = get_orchestrator()
    models = orch.num_models_ready() if orch else 0

    return HealthResponse(
        status="ok" if db_ok and models > 0 else "degraded",
        models_loaded=models,
        db_connected=db_ok,
        clv_tracking_enabled=True,
    )


@app.get("/system/status")
async def system_status(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        db_status = True
    except:
        db_status = False

    orch = get_orchestrator()
    loader = get_data_loader()

    return {
        "status": "operational",
        "version": APP_VERSION,
        "components": {
            "database": db_status,
            "models": orch.num_models_ready() if orch else 0,
            "data_pipeline": bool(loader),
        },
    }


# ============================================
# FRONTEND — SPA + STATIC ASSETS
# ============================================

_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.exists(_FRONTEND_DIST):
    # Serve compiled JS/CSS bundles
    _assets_dir = os.path.join(_FRONTEND_DIST, "assets")
    if os.path.exists(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    # Serve individual root-level static files
    @app.get("/favicon.svg", include_in_schema=False)
    async def favicon():
        return FileResponse(os.path.join(_FRONTEND_DIST, "favicon.svg"))

    @app.get("/icons.svg", include_in_schema=False)
    async def icons_svg():
        return FileResponse(os.path.join(_FRONTEND_DIST, "icons.svg"))

    # SPA catch-all: serve index.html for every non-API path so React Router works
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Try serving a real file first (e.g. public assets)
        file_path = os.path.join(_FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Fall back to index.html for client-side routing
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))
else:
    @app.get("/", include_in_schema=False)
    async def root_fallback():
        return {
            "name": "VIT Sports Intelligence Network",
            "version": APP_VERSION,
            "status": "live — frontend not built",
        }


# ============================================
# RUN
# ============================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 5000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )
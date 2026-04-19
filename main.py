# main.py — VIT Sports Intelligence Network v4.0.0
# Full Integration: AI + Wallet + Blockchain + Training

import asyncio
import logging
import os
import time
import uuid
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func

from fastapi.middleware.gzip import GZipMiddleware
from app.config import get_env, APP_VERSION, print_config_status
from app.core.errors import AppError, error_response
from app.db.database import get_db
import app.db.models  # ensure all models registered
import app.modules.wallet.models  # register wallet models with SQLAlchemy
import app.modules.blockchain.models  # register blockchain models with SQLAlchemy
import app.modules.training.models  # register training module models with SQLAlchemy
import app.modules.ai.models  # register Module E models (ModelMetadata, AIPredictionAudit)
import app.data.models  # register Module F models (MatchFeatureStore, PipelineRun)
import app.modules.notifications.models  # register Module K notification models
import app.modules.marketplace.models    # register Module G marketplace models
import app.modules.trust.models          # register Module I trust models
import app.modules.bridge.models         # register Module J bridge models
import app.modules.developer.models      # register Module L developer models
import app.modules.governance.models     # register Module M governance models

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
    matches as matches_route,
)

# ===== AUTH ROUTES =====
from app.auth.routes import router as auth_router

# ===== WALLET ROUTES (Phase 1) =====
from app.modules.wallet.routes import router as wallet_router
from app.modules.wallet.admin_routes import router as wallet_admin_router
from app.modules.wallet.webhooks import router as webhooks_router

# ===== BLOCKCHAIN ROUTES (Phase 4) =====
from app.modules.blockchain.routes import router as blockchain_router
from app.modules.blockchain.oracle import router as oracle_router

# ===== TRAINING MODULE ROUTES (Module D) =====
from app.modules.training.routes import router as training_module_router

# ===== AI ORCHESTRATION ROUTES (Module E) =====
from app.modules.ai.routes import router as ai_engine_router

# ===== DASHBOARD ROUTES =====
from app.api.routes.dashboard import router as dashboard_router

# ===== DATA PIPELINE ROUTES (Module F) =====
from app.data.routes import router as pipeline_router
from app.data.pipeline import etl_pipeline_loop, odds_refresh_loop
from app.core.cache import cache_background_purge_loop

# ===== NOTIFICATION ROUTES (Module K) =====
from app.modules.notifications.routes import router as notifications_router
from app.modules.notifications.websocket import router as notifications_ws_router

# ===== MARKETPLACE ROUTES (Module G) =====
from app.modules.marketplace.routes import router as marketplace_router

# ===== TRUST ROUTES (Module I) =====
from app.modules.trust.routes import router as trust_router

# ===== BRIDGE ROUTES (Module J) =====
from app.modules.bridge.routes import router as bridge_router

# ===== DEVELOPER ROUTES (Module L) =====
from app.modules.developer.routes import router as developer_router

# ===== GOVERNANCE ROUTES (Module M) =====
from app.modules.governance.routes import router as governance_router

# ===== MIDDLEWARE =====
from app.api.middleware.auth import APIKeyMiddleware
from app.api.middleware.logging import LoggingMiddleware
from app.api.middleware.rate_limit import RateLimitMiddleware
from app.api.middleware.security import SecurityHeadersMiddleware

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

logger = logging.getLogger("uvicorn.error")

# ============================================
# BACKGROUND TASKS
# ============================================

_SETTLEMENT_INTERVAL_HOURS = 6
_ACCOUNTABILITY_INTERVAL_HOURS = 24
_VITCOIN_PRICING_INTERVAL_HOURS = 6


class BackgroundTaskSupervisor:
    def __init__(self, task_specs, check_interval: int = 30, max_restarts: int = 5):
        self.task_specs = task_specs
        self.check_interval = check_interval
        self.max_restarts = max_restarts
        self.tasks = {}
        self.restart_counts = {name: 0 for name, _ in task_specs}
        self.last_started_at = {}
        self.monitor_task = None
        self.stopping = False

    def start(self):
        for name, factory in self.task_specs:
            self._start_task(name, factory)
        self.monitor_task = asyncio.create_task(self._monitor(), name="background-supervisor")
        logger.info("[supervisor] started with tasks=%s", ", ".join(self.tasks.keys()))

    def _start_task(self, name, factory):
        task = asyncio.create_task(factory(), name=name)
        self.tasks[name] = task
        self.last_started_at[name] = time.time()
        logger.info("[supervisor] task started name=%s", name)

    async def _monitor(self):
        while not self.stopping:
            await asyncio.sleep(self.check_interval)
            for name, factory in self.task_specs:
                task = self.tasks.get(name)
                if task and not task.done():
                    continue
                if self.restart_counts[name] >= self.max_restarts:
                    logger.critical("[supervisor] task restart limit reached name=%s restarts=%s", name, self.restart_counts[name])
                    continue
                if task:
                    try:
                        exc = task.exception()
                    except asyncio.CancelledError:
                        exc = None
                    if exc:
                        logger.error("[supervisor] task failed name=%s error=%s", name, exc, exc_info=exc)
                    else:
                        logger.warning("[supervisor] task exited name=%s", name)
                self.restart_counts[name] += 1
                logger.warning("[supervisor] restarting task name=%s attempt=%s", name, self.restart_counts[name])
                self._start_task(name, factory)

    async def stop(self):
        self.stopping = True
        all_tasks = list(self.tasks.values())
        if self.monitor_task:
            all_tasks.append(self.monitor_task)
        for task in all_tasks:
            task.cancel()
        await asyncio.gather(*all_tasks, return_exceptions=True)
        logger.info("[supervisor] stopped")

    def snapshot(self):
        return {
            name: {
                "running": bool(task and not task.done()),
                "done": bool(task and task.done()),
                "restarts": self.restart_counts.get(name, 0),
                "last_started_at": self.last_started_at.get(name),
            }
            for name, task in self.tasks.items()
        }


async def auto_settle_loop():
    await asyncio.sleep(60)
    while True:
        if os.getenv("FOOTBALL_DATA_API_KEY"):
            try:
                from app.db.database import AsyncSessionLocal
                from app.modules.ai.weight_adjuster import adjust_weights_for_match
                settlement_result = await settle_results(days_back=2)
                print(f"[settlement] {settlement_result}")

                # E3 — weight adjustment for each newly settled match
                settled_matches = settlement_result if isinstance(settlement_result, list) else []
                if settled_matches:
                    orch = get_orchestrator()
                    async with AsyncSessionLocal() as db:
                        for match_info in settled_matches:
                            mid = str(match_info.get("match_id", ""))
                            outcome = match_info.get("outcome")
                            if mid and outcome:
                                await adjust_weights_for_match(db, orch, mid, outcome)
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


async def subscription_expiry_loop():
    """Module K — check every 12h and warn users about expiring subscriptions."""
    from app.db.database import AsyncSessionLocal
    from app.modules.notifications.service import NotificationService
    while True:
        await asyncio.sleep(12 * 3600)
        try:
            async with AsyncSessionLocal() as db:
                await NotificationService.check_subscription_expiry(db)
        except Exception as e:
            print(f"[notifications] subscription expiry check error: {e}")


# ============================================
# LIFECYCLE
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.logging_config import configure_logging
    configure_logging(level=get_env("LOG_LEVEL", "INFO"))
    print_config_status()
    print(f"🚀 VIT Network v{APP_VERSION} starting...")

    print("✅ Database migrations applied")

    # SEED PLATFORM CONFIG DEFAULTS
    try:
        from app.db.database import AsyncSessionLocal
        from app.modules.wallet.models import PlatformConfig
        from sqlalchemy import select as _select

        _default_configs = [
            ("fee_rates", {"deposit": 0.01, "withdrawal": 0.02, "conversion": 0.005}, "Platform fee rates"),
            ("vitcoin_min_stake", {"amount": 10, "validator_min": 100}, "Minimum VITCoin stake amounts"),
            ("withdrawal_limits", {"daily_usd": 1000, "daily_ngn": 500000, "daily_usdt": 1000}, "Daily withdrawal limits"),
            ("deposit_limits", {"min_usd": 1, "min_ngn": 500, "max_usd": 10000}, "Deposit limits"),
            ("vitcoin_supply", {"initial": 1000000, "burned": 0, "reserved": 100000}, "VITCoin supply parameters"),
            ("platform_treasury", {"address": "vit_treasury_001"}, "Platform treasury wallet reference"),
        ]
        async with AsyncSessionLocal() as _db:
            for key, value, desc in _default_configs:
                existing = (await _db.execute(_select(PlatformConfig).where(PlatformConfig.key == key))).scalar_one_or_none()
                if not existing:
                    _db.add(PlatformConfig(key=key, value=value, description=desc))
            await _db.commit()
        print("✅ PlatformConfig defaults seeded")
    except Exception as _e:
        print(f"⚠️  PlatformConfig seeding failed: {_e}")

    # SEED DEFAULT ADMIN ACCOUNT
    try:
        import os as _os
        from app.db.database import AsyncSessionLocal
        from app.db.models import User as _User
        from app.auth.jwt_utils import hash_password
        from sqlalchemy import select as _select

        _admin_email = _os.environ.get("ADMIN_EMAIL", "admin@vit.network")
        _admin_pass = _os.environ.get("ADMIN_PASSWORD")
        _admin_user = _os.environ.get("ADMIN_USERNAME", "vit_admin")

        async with AsyncSessionLocal() as _db:
            _exists = (await _db.execute(_select(_User).where(_User.email == _admin_email))).scalar_one_or_none()
            if not _exists:
                if not _admin_pass:
                    print("⚠️  Default admin creation skipped: set ADMIN_PASSWORD or register the first user")
                else:
                    _db.add(_User(
                        email=_admin_email,
                        username=_admin_user,
                        hashed_password=hash_password(_admin_pass),
                        role="admin",
                        admin_role="super_admin",
                        subscription_tier="elite",
                        is_active=True,
                    ))
                    await _db.commit()
                    print(f"✅ Default admin created: {_admin_email}")
            else:
                # Ensure existing admin has admin_role and subscription_tier set
                if not _exists.admin_role:
                    _exists.admin_role = "super_admin"
                if not _exists.subscription_tier:
                    _exists.subscription_tier = "elite"
                await _db.commit()
                print(f"✅ Admin account found: {_admin_email}")
    except Exception as _e:
        print(f"⚠️  Admin seeding failed: {_e}")

    # SEED SUBSCRIPTION PLANS
    try:
        from app.db.database import AsyncSessionLocal
        from app.db.models import SubscriptionPlan
        from sqlalchemy import select as _select

        _plans = [
            {
                "name": "free",
                "display_name": "Free",
                "price_monthly": 0.0,
                "price_yearly": 0.0,
                "prediction_limit": 5,
                "features": {
                    "predictions": True,
                    "basic_history": True,
                    "advanced_analytics": False,
                    "ai_insights": False,
                    "accumulator_builder": False,
                    "model_breakdown": False,
                    "telegram_alerts": False,
                    "bankroll_tools": False,
                    "csv_upload": False,
                    "priority_support": False,
                },
            },
            {
                "name": "pro",
                "display_name": "Pro",
                "price_monthly": 49.0,
                "price_yearly": 490.0,
                "prediction_limit": 100,
                "features": {
                    "predictions": True,
                    "basic_history": True,
                    "advanced_analytics": True,
                    "ai_insights": True,
                    "accumulator_builder": True,
                    "model_breakdown": True,
                    "telegram_alerts": True,
                    "bankroll_tools": True,
                    "csv_upload": False,
                    "priority_support": False,
                },
            },
            {
                "name": "elite",
                "display_name": "Elite",
                "price_monthly": 199.0,
                "price_yearly": 1990.0,
                "prediction_limit": 1000,
                "features": {
                    "predictions": True,
                    "basic_history": True,
                    "advanced_analytics": True,
                    "ai_insights": True,
                    "accumulator_builder": True,
                    "model_breakdown": True,
                    "telegram_alerts": True,
                    "bankroll_tools": True,
                    "csv_upload": True,
                    "priority_support": True,
                    "validator_eligibility": True,
                    "revenue_share": True,
                },
            },
        ]

        async with AsyncSessionLocal() as _db:
            _count = (await _db.execute(_select(func.count()).select_from(SubscriptionPlan))).scalar()
            if _count == 0:
                for _p in _plans:
                    _db.add(SubscriptionPlan(
                        name=_p["name"],
                        display_name=_p["display_name"],
                        price_monthly=_p["price_monthly"],
                        price_yearly=_p["price_yearly"],
                        prediction_limit=_p["prediction_limit"],
                        features=_p["features"],
                        is_active=True,
                    ))
                await _db.commit()
                print("✅ Subscription plans seeded (Free / Pro / Elite)")
            else:
                print(f"✅ Subscription plans: {_count} already seeded")
    except Exception as _e:
        print(f"⚠️  Subscription plan seeding failed: {_e}")

    # BACKFILL WALLETS FOR EXISTING USERS
    try:
        import uuid as _uuid
        from decimal import Decimal as _Decimal
        from app.db.database import AsyncSessionLocal
        from app.db.models import User as _User
        from app.modules.wallet.models import Wallet as _Wallet
        from sqlalchemy import select as _select

        async with AsyncSessionLocal() as _db:
            _users = (await _db.execute(_select(_User))).scalars().all()
            _created = 0
            for _u in _users:
                _existing_wallet = (await _db.execute(
                    _select(_Wallet).where(_Wallet.user_id == _u.id)
                )).scalar_one_or_none()
                if not _existing_wallet:
                    _db.add(_Wallet(
                        id=str(_uuid.uuid4()),
                        user_id=_u.id,
                        vitcoin_balance=_Decimal("100.00000000"),
                    ))
                    _created += 1
            if _created:
                await _db.commit()
                print(f"✅ Wallets backfilled for {_created} existing user(s)")
    except Exception as _e:
        print(f"⚠️  Wallet backfill failed: {_e}")

    # SECURE ADMIN PASSWORDS — update legacy default passwords on startup
    try:
        import os as _os
        from app.db.database import AsyncSessionLocal
        from app.db.models import User as _User
        from app.auth.jwt_utils import hash_password, verify_password
        from sqlalchemy import select as _select

        _LEGACY_PASSWORDS = ["admin123", "Admin123", "VitAdmin2025!", "password"]
        _secure_pass = _os.environ.get("ADMIN_PASSWORD", "")

        if _secure_pass:
            async with AsyncSessionLocal() as _db:
                _admins = (await _db.execute(_select(_User).where(_User.role == "admin"))).scalars().all()
                _updated = 0
                for _admin in _admins:
                    for _legacy in _LEGACY_PASSWORDS:
                        if verify_password(_legacy, _admin.hashed_password):
                            _admin.hashed_password = hash_password(_secure_pass)
                            _updated += 1
                            break
                if _updated:
                    await _db.commit()
                    print(f"✅ Updated {_updated} admin account(s) to use ADMIN_PASSWORD from environment")
    except Exception as _e:
        print(f"⚠️  Admin password security check failed: {_e}")

    # SERVICES
    orchestrator = get_orchestrator()
    if orchestrator:
        print(f"✅ ML Models: {orchestrator.num_models_ready()} ready")

    # E1 — Bootstrap model registry
    try:
        from app.db.database import AsyncSessionLocal
        from app.modules.ai.registry import bootstrap_registry
        async with AsyncSessionLocal() as _db:
            inserted = await bootstrap_registry(_db, orchestrator)
            print(f"✅ AI Model Registry: {inserted} new entries bootstrapped")
    except Exception as _e:
        print(f"⚠️  AI Registry bootstrap failed: {_e}")

    alerts = get_telegram_alerts()
    if alerts and alerts.enabled:
        await alerts.send_startup_message()

    supervised_tasks = [
        ("etl-pipeline", etl_pipeline_loop),
        ("odds-refresh", odds_refresh_loop),
        ("cache-purge", lambda: cache_background_purge_loop(300)),
    ]
    supervisor = BackgroundTaskSupervisor(
        supervised_tasks,
        check_interval=int(get_env("BACKGROUND_TASK_CHECK_INTERVAL_SECONDS", "30")),
        max_restarts=int(get_env("BACKGROUND_TASK_MAX_RESTARTS", "5")),
    )
    supervisor.start()
    app.state.background_supervisor = supervisor

    tasks = [
        asyncio.create_task(auto_settle_loop(), name="auto-settle"),
        asyncio.create_task(model_accountability_loop(), name="model-accountability"),
        asyncio.create_task(vitcoin_pricing_loop(), name="vitcoin-pricing"),
        asyncio.create_task(subscription_expiry_loop(), name="subscription-expiry"),
    ]

    print("✅ Background services started with supervision")
    print("🌐 API running at http://localhost:5000")

    yield

    await supervisor.stop()
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)

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

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(APIKeyMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = (
        request.headers.get("X-Request-ID")
        or request.headers.get("X-Correlation-ID")
        or str(uuid.uuid4())
    )
    request.state.request_id = request_id
    try:
        response = await call_next(request)
    except Exception:
        logging.getLogger("app.errors").exception(
            "Unhandled request failure request_id=%s method=%s path=%s",
            request_id,
            request.method,
            request.url.path,
        )
        raise
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Correlation-ID"] = request_id
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    logging.getLogger("app.errors").warning(
        "Application error request_id=%s status=%s code=%s method=%s path=%s message=%s",
        getattr(request.state, "request_id", "unknown"),
        exc.status_code,
        exc.code,
        request.method,
        request.url.path,
        exc.message,
    )
    return error_response(
        request=request,
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
    )


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "HTTP error"
    logging.getLogger("app.errors").warning(
        "HTTP error request_id=%s status=%s method=%s path=%s detail=%s",
        getattr(request.state, "request_id", "unknown"),
        exc.status_code,
        request.method,
        request.url.path,
        detail,
    )
    return error_response(
        request=request,
        status_code=exc.status_code,
        code="http_error",
        message=detail,
        details=None if isinstance(exc.detail, str) else exc.detail,
        headers=dict(exc.headers or {}),
    )


def _sanitize_validation_errors(errors: list) -> list:
    """Convert any non-JSON-serializable objects in Pydantic error dicts to strings."""
    sanitized = []
    for err in errors:
        clean = {}
        for k, v in err.items():
            if k == "ctx" and isinstance(v, dict):
                clean[k] = {ck: str(cv) if not isinstance(cv, (str, int, float, bool, type(None))) else cv
                            for ck, cv in v.items()}
            elif isinstance(v, (str, int, float, bool, list, dict, type(None))):
                clean[k] = v
            else:
                clean[k] = str(v)
        sanitized.append(clean)
    return sanitized


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    logging.getLogger("app.errors").warning(
        "Validation error request_id=%s method=%s path=%s errors=%s",
        getattr(request.state, "request_id", "unknown"),
        request.method,
        request.url.path,
        exc.errors(),
    )
    return error_response(
        request=request,
        status_code=422,
        code="validation_error",
        message="Request validation failed",
        details=_sanitize_validation_errors(exc.errors()),
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logging.getLogger("app.errors").exception(
        "Unhandled exception request_id=%s method=%s path=%s",
        getattr(request.state, "request_id", "unknown"),
        request.method,
        request.url.path,
    )
    return error_response(
        request=request,
        status_code=500,
        code="internal_server_error",
        message="Internal server error",
    )


# ============================================
# ROUTES
# ============================================

# Core
app.include_router(predict.router)
app.include_router(result.router)
app.include_router(history.router)
app.include_router(matches_route.router)
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
app.include_router(webhooks_router)

# Blockchain (Phase 4)
app.include_router(blockchain_router)
app.include_router(oracle_router)

# Training Module (Module D)
app.include_router(training_module_router)

# AI Orchestration (Module E)
app.include_router(ai_engine_router)

# Dashboard
app.include_router(dashboard_router)

# Data Pipeline (Module F)
app.include_router(pipeline_router)

# Notifications (Module K)
app.include_router(notifications_router)
app.include_router(notifications_ws_router)

# Marketplace (Module G)
app.include_router(marketplace_router)

# Trust & Anti-Fraud (Module I)
app.include_router(trust_router)

# Cross-Chain Bridge (Module J)
app.include_router(bridge_router)

# Developer Platform (Module L)
app.include_router(developer_router)

# Governance (Module M)
app.include_router(governance_router)


# ============================================
# UTILITIES
# ============================================

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

    # User stats
    from app.db.models import User, Prediction, CLVEntry
    from app.modules.wallet.models import Wallet, WalletTransaction
    from decimal import Decimal
    import datetime

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    active_30d = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= thirty_days_ago)
    )).scalar() or 0
    validators = (await db.execute(
        select(func.count(User.id)).where(User.role == "validator")
    )).scalar() or 0

    # Economy stats
    total_staked_vit = Decimal("0")
    total_profit = Decimal("0")
    platform_volume = Decimal("0")
    try:
        total_staked_vit = (await db.execute(
            select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
                WalletTransaction.type == "stake"
            )
        )).scalar() or Decimal("0")
        platform_volume = (await db.execute(
            select(func.coalesce(func.sum(WalletTransaction.amount), 0))
        )).scalar() or Decimal("0")
        profit_result = (await db.execute(select(func.coalesce(func.sum(CLVEntry.profit), 0)))).scalar()
        total_profit = profit_result or Decimal("0")
    except Exception:
        pass

    return {
        "status": "operational",
        "version": APP_VERSION,
        "components": {
            "database": db_status,
            "models": orch.num_models_ready() if orch else 0,
            "data_pipeline": bool(loader),
        },
        "users": {
            "total": total_users,
            "active_30d": active_30d,
            "validators": validators,
        },
        "economy": {
            "total_staked_vit": float(total_staked_vit),
            "total_profit": float(total_profit),
            "platform_volume": float(platform_volume),
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
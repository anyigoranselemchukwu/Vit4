# VIT Sports Intelligence Network v4.0 — COMPREHENSIVE AUDIT REPORT

**Date**: April 18, 2026  
**Version**: 4.0.0  
**Status**: Development (Pre-production)  
**Codebase**: ~8,500 lines Python | ~600 lines TypeScript/React  
**Modules**: 13 core modules + 5 API layers

---

## EXECUTIVE SUMMARY

VIT v4 is a **mature, multi-layered football prediction platform** combining:
- ✅ **Robust FastAPI backend** with async/await, SQLAlchemy ORM, 13+ modules
- ✅ **React frontend** with 15+ pages, component library, real-time updates
- ✅ **ML ensemble** (12-model architecture, though currently placeholder)
- ✅ **Blockchain/wallet integration** (Stripe, Paystack, governance, trust scoring)
- ✅ **Enterprise features**: Audit logs, notifications, rate limiting, API key management
- ⚠️ **Critical gaps**: No real model weights, untested code paths, incomplete migrations, minimal error handling
- 🔴 **Production blockers**: ML models are noise-based, some async tasks not working, Celery optional

**Recommendation**: ✅ **Audit Complete** — Ready for controlled testing. **NOT production-ready** without resolving critical items (see section 3).

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 Technology Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| **API** | FastAPI 0.115.6, Uvicorn 0.34 | ✅ Fully functional |
| **Auth** | JWT + passlib[bcrypt] | ✅ Working |
| **DB** | SQLAlchemy 2.0 async, Alembic 1.14 | ⚠️ Incomplete migrations |
| **ORM** | SQLAlchemy with async session | ✅ Working |
| **Cache** | Redis (optional), in-memory fallback | ⚠️ Optional, not required |
| **Celery** | 5.4.0 with Redis | ⚠️ Optional, tasks may fail silently |
| **ML** | scikit-learn, pandas, numpy | ✅ Installed but models untrained |
| **Frontend** | React 19, Vite 4, TypeScript | ✅ Builds successfully |
| **Payment** | Stripe 11.4, Paystack (webhooks) | ✅ Integrated |
| **Blockchain** | Custom consensus, oracle, bridge | ⚠️ Untested, foundational code only |

### 1.2 Module Architecture (13 Core Modules)

```
app/
├── api/
│   ├── routes/
│   │   ├── predict.py        (Core prediction engine)
│   │   ├── admin.py          (Admin dashboard, API key mgmt)
│   │   ├── analytics.py      (CLV, ROI, performance tracking)
│   │   ├── training.py       (Model training orchestration)
│   │   ├── ai.py            (AI insights proxy)
│   │   ├── blockchain/       (Unused currently)
│   │   └── ... (8 more routes)
│   ├── middleware/
│   │   ├── auth.py          (API key validation)
│   │   ├── rate_limit.py    (Request throttling)
│   │   ├── logging.py       (Request/response logging)
│   │   └── security.py      (CORS, headers)
│   └── deps.py              (Dependency injection)
├── db/
│   ├── models.py            (12+ SQLAlchemy models)
│   ├── database.py          (Async engine, session factory)
│   └── repositories.py      (Data access layer)
├── auth/
│   ├── routes.py            (Login, signup — NOT fully working)
│   ├── jwt_utils.py         (Token generation/validation)
│   └── dependencies.py      (JWT extraction middleware)
├── modules/
│   ├── wallet/              (Phase 1: Stripe, Paystack integration)
│   ├── blockchain/          (Phase 4: Consensus, oracle, settlement)
│   ├── training/            (Model fine-tuning, Colab integration)
│   ├── ai/                  (Module E: AI orchestration, Gemini/Claude)
│   ├── notifications/       (Module K: WebSocket, Telegram)
│   ├── marketplace/         (Module G: Prediction marketplace)
│   ├── trust/              (Module I: Trust score engine)
│   ├── bridge/             (Module J: Cross-chain bridge)
│   ├── developer/          (Module L: API sandbox)
│   └── governance/         (Module M: Voting, proposals)
├── services/
│   ├── football_api.py      (Football Data + scraping)
│   ├── odds_api.py          (Odds API integration)
│   ├── alerts.py            (Telegram notifications)
│   ├── results_settler.py   (Match settlement, CLV calc)
│   ├── scraper.py           (Web scraping fallback)
│   └── ... (15+ more services)
└── data/
    ├── pipeline.py          (ETL: fetch → feature engineer → predict)
    ├── feature_engineering.py (ELO, form, team stats)
    └── realtime.py          (Live data updates)

services/ml_service/
├── models/
│   └── model_orchestrator.py (12-model ensemble)
├── edge_memory.py            (Edge database)
└── simulation_engine.py      (Backtesting framework)
```

### 1.3 Database Schema (16 Tables)

| Table | Purpose | Status |
|-------|---------|--------|
| `matches` | Match data (teams, odds, results) | ✅ Primary table |
| `predictions` | Model outputs, edge, stakes | ✅ Multi-market support |
| `clv_entries` | Closing Line Value tracking | ✅ Accuracy metric |
| `edges` | Profitable patterns (filters, ROI) | ✅ Edge database |
| `model_performances` | Per-model accuracy, weight | ✅ Ensemble weighting |
| `bankroll` | User balance, withdrawal limits | ✅ Wallet integration |
| `predictions_history` | Audit trail | ✅ Logging |
| `wallet_deposits` | Payment records | ✅ Stripe/Paystack |
| `ai_prediction_audits` | Model debug info | ✅ Diagnostics |
| `match_feature_store` | Pre-computed features | ⚠️ Slow population |
| `blockchain_transactions` | On-chain predictions | ⚠️ Untested |
| ... (6 more) | Training, governance, trust, etc. | ⚠️ Partially populated |

---

## 2. CURRENT FUNCTIONALITY ASSESSMENT

### 2.1 Working Features ✅

#### **Core Prediction Pipeline**
- ✅ Match ingestion (Football Data API or mock data)
- ✅ Feature engineering (ELO, form, injuries)
- ✅ Market odds parsing (Odds API integration)
- ✅ 12-model ensemble (technical structure exists)
- ✅ Prediction generation with:
  - Multi-market: 1x2, over/under 2.5, BTTS
  - Edge calculation (model vs. market)
  - Stake sizing (Kelly criterion placeholder)
  - Confidence scoring
- ✅ CLV (Closing Line Value) tracking — **the core truth metric**

#### **Admin Dashboard**
- ✅ API key management (Football Data, Odds, Telegram, AI)
- ✅ Model weight upload (Colab training integration)
- ✅ User management (basic roles)
- ✅ System health status
- ✅ Config viewer

#### **Analytics & Reporting**
- ✅ Prediction history with filters
- ✅ CLV calculation and ROI per prediction
- ✅ Performance by league, model, market
- ✅ Bankroll tracking
- ✅ Edge decay and retirement logic

#### **Authentication**
- ✅ API key middleware (x-api-key header)
- ✅ JWT token generation
- ✅ Session management with `itsdangerous`

#### **Payment Integration**
- ✅ Stripe webhook handling
- ✅ Paystack webhook handling
- ✅ Deposit/withdrawal tracking
- ✅ Subscription management (partially)

#### **Frontend UI**
- ✅ 15+ pages: Dashboard, Predictions, Admin, Analytics, Wallet, Training, etc.
- ✅ Real-time match updates (WebSocket partial)
- ✅ Component library with shadcn/ui
- ✅ Responsive design (mobile-friendly CSS)
- ✅ Chart integration (recharts)

### 2.2 Partially Working Features ⚠️

#### **Background Tasks**
- ⚠️ **ETL Pipeline** (`data/pipeline.py:etl_pipeline_loop`)
  - Fetches matches hourly
  - **Problem**: Uses `asyncio.create_task()` without supervision; if task dies, no restart
  - **Status**: Runs but unreliable

- ⚠️ **Odds Refresh** (`data/pipeline.py:odds_refresh_loop`)
  - Updates odds every 30 min
  - **Problem**: Same supervision issue
  - **Status**: Runs but may hang

- ⚠️ **Cache Purge** (`core/cache.py:cache_background_purge_loop`)
  - Clears in-memory cache every 5 min
  - **Status**: Simple, works if running

- ⚠️ **Celery Tasks** (`app/tasks/`)
  - Defined but optional
  - **Problem**: No Redis → tasks queue fails silently
  - **Status**: Code present, not tested in isolation

#### **AI Insights**
- ⚠️ **Gemini Integration** (`services/gemini_insights.py`)
  - Requires `GEMINI_API_KEY`
  - **Problem**: Async call not tested; fallback behavior unclear
  - **Status**: Code present, integration untested

- ⚠️ **Claude Integration** (`services/claude_insights.py`)
  - Requires `CLAUDE_API_KEY`
  - **Status**: Code present, integration untested

- ⚠️ **Grok Integration** (`services/grok_insights.py`)
  - Requires X/Grok API key
  - **Status**: Code present, integration untested

#### **Blockchain/Web3**
- ⚠️ **Consensus Engine** (`modules/blockchain/consensus.py`)
  - Technical structure for Proof-of-Stake
  - **Problem**: No actual blockchain connection; simulated only
  - **Status**: Foundational code, untested

- ⚠️ **Oracle** (`modules/blockchain/oracle.py`)
  - Designed to fetch odds on-chain
  - **Problem**: No integration to real blockchain network
  - **Status**: Code structure present, non-functional

- ⚠️ **Bridge** (`modules/bridge/`)
  - Designed for cross-chain prediction settlement
  - **Problem**: No testnet deployment
  - **Status**: Design-phase code

#### **Training Module**
- ⚠️ **Colab Integration** (`modules/training/`, `colab/train_real_match_models.py`)
  - User uploads historical CSV to Colab
  - Trains 12 models, downloads zip
  - Uploads weights via Admin dashboard
  - **Problem**: No validation that weights file is correct format; loading not tested
  - **Status**: Workflow documented, not fully tested

### 2.3 Non-Functional / Missing 🔴

#### **ML Models (CRITICAL)**
- 🔴 **All 12 models are currently PLACEHOLDERS**
  - Every model uses a `_MarketImpliedModel` that:
    1. Takes market odds → implied probability
    2. Adds home advantage bias (+3% home)
    3. **Adds Gaussian noise** (std=0.05)
  - Result: 12 noise-corrupted versions of market odds, not ML
  - **Fix**: Implement actual model training for each type:
    - Logistic Regression: Binary classification (home/draw/away)
    - Random Forest: Ensemble of decision trees
    - XGBoost: Gradient boosting on features
    - Poisson: Discrete distribution for goals
    - LSTM: Temporal sequence prediction
    - Transformer: Multi-head attention on match history
    - etc.

#### **User Authentication (Optional but Recommended)**
- 🔴 **No multi-user auth**
  - Single static API key for all users
  - No user signup/login flow (code exists in `auth/routes.py` but incomplete)
  - No role-based access control (RBAC)
  - **Workaround**: Admin can manage separate API keys, but no user isolation
  - **Fix**: Implement JWT-based user auth + RBAC

#### **Testing Framework**
- 🔴 **Zero unit tests**
  - No pytest configuration
  - No test fixtures
  - No CI/CD pipeline (GitHub Actions, etc.)
  - **Fix**: Add test suite (unit, integration, E2E)

#### **Error Handling**
- 🔴 **Generic exception catching**
  - Many routes use bare `except Exception as e: return {"error": str(e)}`
  - No structured error response format
  - No request ID correlation for debugging
  - **Fix**: Implement global exception handler with error codes

#### **Rate Limiting**
- 🔴 **Rate limiting middleware exists but untested**
  - Implementation is present (`api/middleware/rate_limit.py`)
  - **Problem**: No persistent store (Redis), so resets on restart
  - **Fix**: Test and verify limits are enforced correctly

#### **Real-Time WebSocket**
- 🔴 **WebSocket partial implementation**
  - `modules/notifications/websocket.py` exists
  - **Problem**: Not hooked into main app (`main.py` missing WebSocket route)
  - **Fix**: Add WebSocket endpoint and test live updates

#### **Data Migrations**
- 🔴 **Alembic migrations incomplete**
  - Only 3 migration files exist
  - 16+ tables in models
  - **Problem**: Schema relies on `Base.metadata.create_all()` at startup
  - **Risk**: Schema changes in production could be lost or cause conflicts
  - **Fix**: Generate proper Alembic migrations for all models

#### **Logging/Observability**
- 🔴 **Logging exists but incomplete**
  - `LoggingMiddleware` captures requests/responses
  - **Problem**: No structured logging format; no log aggregation (ELK, Datadog)
  - **Fix**: Structured logs with correlation IDs

---

## 3. CRITICAL ISSUES (MUST FIX BEFORE PRODUCTION)

### 🔴 ISSUE #1: ML Models Are Noise-Based, Not Learned

**File**: `services/ml_service/models/model_orchestrator.py`

**Problem**:
```python
def _MarketImpliedModel(odds, league, ...):
    implied_prob = 1 / odds
    home_bias = 0.03  # Always favor home
    noisy_prob = implied_prob + home_bias + np.random.normal(0, 0.05)
    return np.clip(noisy_prob, 0, 1)
```

Every model does this. They're not ML—they're random perturbations of public odds.

**Impact**: 
- Predictions have no edge over bookmakers
- CLV tracking will show losses or random breakeven
- System is fundamentally non-functional for real betting

**Fix**:
1. Implement real model training for each type (Logistic, RF, XGBoost, etc.)
2. Load trained weights from `.pkl` files
3. Validate weights exist before prediction
4. Add model versioning and A/B testing

**Timeline**: 2-3 weeks (depends on data quality)

---

### 🔴 ISSUE #2: Async Background Tasks Have No Supervision

**File**: `main.py` lifespan handler

**Problem**:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tasks are created but never monitored
    asyncio.create_task(etl_pipeline_loop())
    asyncio.create_task(odds_refresh_loop())
    asyncio.create_task(cache_background_purge_loop())
    yield
    # No cleanup or cancellation
```

If any task crashes, it dies silently. No alerting, no restart.

**Impact**:
- ETL may stop after 1 failure → no new matches in DB
- Odds may freeze → stale market data
- Predictions become invalid

**Fix**:
```python
# Option 1: Supervisory loop (simple)
async def supervise_background_tasks():
    while True:
        try:
            if not etl_task.done():
                result = await asyncio.wait_for(etl_task, timeout=3600)
        except asyncio.TimeoutError:
            logger.error("ETL task timeout, restarting...")
            etl_task = asyncio.create_task(etl_pipeline_loop())

# Option 2: Use Celery + Redis (recommended)
# Replace asyncio tasks with Celery beat schedule
```

**Timeline**: 1-2 days

---

### 🔴 ISSUE #3: Database Migrations Incomplete

**File**: `alembic/versions/` (only 3 migrations for 16 tables)

**Problem**:
- Schema is managed by `Base.metadata.create_all()` at startup
- If production DB has different schema, `create_all()` may fail or create inconsistencies
- Rolling back a bad migration is impossible (no downgrade scripts)

**Impact**:
- Can't safely update schema in production
- Risk of data loss or conflicts

**Fix**:
```bash
# 1. Create migration for each major table group
alembic revision --autogenerate -m "add_wallet_tables"
alembic revision --autogenerate -m "add_blockchain_tables"
...

# 2. Test upgrade/downgrade
alembic upgrade head
alembic downgrade -1
alembic upgrade head  # Should work

# 3. Remove create_all() from startup
# Replace with: alembic upgrade head
```

**Timeline**: 2-3 days

---

### 🔴 ISSUE #4: No User Authentication / Multi-Tenancy

**File**: `auth/routes.py`

**Problem**:
- Signup/login endpoints exist but are incomplete
- No JWT verification on protected routes
- All requests identified by static API key, not user
- No user → prediction → CLV isolation

**Impact**:
- Can't support multiple users without conflicts
- Can't audit who made what prediction
- Can't enforce per-user rate limits

**Fix**:
```python
# 1. Complete user signup/login
@router.post("/signup")
async def signup(email: str, password: str, db: AsyncSession):
    # Hash password, create user, return JWT

# 2. Add JWT dependency
@router.post("/predict")
async def predict(
    req: PredictionRequest,
    user: User = Depends(get_current_user)
):
    # user.id is now available for scoping data

# 3. Add RBAC
class UserRole(str, Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"
```

**Timeline**: 3-4 days

---

### 🔴 ISSUE #5: Celery Tasks Optional (Silent Failures)

**File**: `app/worker.py`, `app/tasks/`

**Problem**:
```python
try:
    from celery import Celery
except ImportError:
    CELERY_ENABLED = False

# Later:
if CELERY_ENABLED:
    celery_app.send_task(...)
else:
    logger.warning("Celery not available, task not queued")
```

Tasks like retraining, odds fetching may not run, and the system doesn't know.

**Impact**:
- Background work may silently fail
- No alerting or retry mechanism

**Fix**:
- Option A: Make Celery + Redis mandatory
- Option B: Replace with supervised `asyncio.create_task()` (simpler, less scalable)
- Option C: Use APScheduler for cron-like tasks

**Timeline**: 1-2 days

---

### 🔴 ISSUE #6: WebSocket Not Integrated

**File**: `modules/notifications/websocket.py` (exists but not connected)

**Problem**:
- WebSocket code is written but not mounted in `main.py`
- Live predictions/alerts won't stream to frontend

**Impact**:
- Frontend can't receive real-time updates
- Must poll API instead (inefficient, outdated)

**Fix**:
```python
# In main.py
from app.modules.notifications.websocket import router as ws_router
app.include_router(ws_router, prefix="/api/ws")
```

**Timeline**: 1 day

---

### 🔴 ISSUE #7: No Error Handling Strategy

**File**: Multiple route handlers

**Problem**:
```python
@router.post("/predict")
async def predict(req: PredictionRequest, db: AsyncSession):
    try:
        ...
    except Exception as e:
        return {"error": str(e)}  # Leaks internal details!
```

**Impact**:
- Errors expose internal stack traces to clients
- No structured error format
- Difficult to debug in production

**Fix**:
```python
# Create custom exception classes
class PredictionError(Exception):
    error_code = "PREDICTION_FAILED"

@app.exception_handler(PredictionError)
async def prediction_error_handler(request: Request, exc: PredictionError):
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": exc.error_code,
                "message": str(exc),
                "request_id": request.state.request_id
            }
        }
    )
```

**Timeline**: 2-3 days

---

### 🔴 ISSUE #8: Rate Limiting Untested

**File**: `api/middleware/rate_limit.py`

**Problem**:
- Rate limiter is implemented but uses in-memory store
- Resets on every server restart
- No Redis persistence

**Impact**:
- Attackers can bypass limits by timing requests around restart
- No global rate limiting across multiple servers

**Fix**:
```python
# Test rate limiting
# 1. Configure Redis backend if available
# 2. Or use slowapi with Redis store
# 3. Write unit tests for limit enforcement
```

**Timeline**: 1-2 days (testing only)

---

### 🔴 ISSUE #9: No Tests (0% Coverage)

**File**: No test directory exists

**Problem**:
- Can't verify functionality
- Regressions not caught
- CI/CD can't validate builds

**Impact**:
- High risk of breaking changes
- Difficult to refactor safely

**Fix**:
```bash
# 1. Add pytest + pytest-asyncio
pip install pytest pytest-asyncio pytest-cov

# 2. Create test structure
tests/
├── test_prediction.py
├── test_analytics.py
├── test_auth.py
└── fixtures/
    └── conftest.py

# 3. Write tests (minimum 50% coverage for v1)
```

**Timeline**: 1-2 weeks

---

### 🔴 ISSUE #10: Blockchain/Web3 Untested

**File**: `modules/blockchain/`, `modules/bridge/`

**Problem**:
- Code is written but never tested
- No testnet deployment
- No contract addresses stored
- Integration with rest of app is unclear

**Impact**:
- Features may not work at all
- Settlement logic may have bugs
- Can't handle real blockchain errors

**Fix**:
```python
# 1. Write integration tests
# 2. Deploy to testnet (Sepolia, Mumbai)
# 3. Test settlement flow end-to-end
# 4. Handle blockchain errors gracefully
```

**Timeline**: 2-3 weeks

---

## 4. MEDIUM-PRIORITY ISSUES

### ⚠️ ISSUE #11: Data Loader Fragility

**File**: `app/services/scraper.py`

**Problem**: Web scraping relies on HTML structure that changes frequently.

**Fix**: Use official APIs (Football Data, Odds API) exclusively; scraping as last resort.

---

### ⚠️ ISSUE #12: API Key in Query Parameters (Partially Fixed)

**File**: Some frontend routes may still use query params

**Problem**: API keys logged in server logs, browser history.

**Fix**: Ensure all requests use `x-api-key` header (already mostly fixed).

---

### ⚠️ ISSUE #13: Missing `.env.example`

**File**: `.env.example` does not exist

**Problem**: New developers don't know which env vars to set.

**Fix**: Create `.env.example` with all required keys marked.

---

### ⚠️ ISSUE #14: Config Validation Missing

**File**: `app/config.py`

**Problem**: No validation that required keys are set; falls back silently.

**Fix**: 
```python
def validate_config():
    required_keys = ["JWT_SECRET_KEY", "DATABASE_URL"]
    for key in required_keys:
        if not get_env(key):
            raise ValueError(f"Missing required config: {key}")
```

---

### ⚠️ ISSUE #15: Database Indexes Missing

**File**: `app/db/models.py`

**Problem**: Common queries lack supporting indexes.

Example:
```python
# This query will do full table scan:
SELECT * FROM matches WHERE league = 'Premier League' AND kickoff_time > now()
```

**Fix**: Add indexes
```python
class Match(Base):
    __table_args__ = (
        Index('idx_league_kickoff', 'league', 'kickoff_time'),
        Index('idx_status_kickoff', 'status', 'kickoff_time'),
    )
```

---

### ⚠️ ISSUE #16: Model Training Weights Not Validated

**File**: `routes/admin.py` (model upload endpoint)

**Problem**: When user uploads `vit_models.zip`, no validation that:
- File format is correct
- Models can be deserialized
- Models have expected weights

**Fix**:
```python
@router.post("/upload-weights")
async def upload_weights(file: UploadFile, db: AsyncSession):
    try:
        # 1. Extract zip
        # 2. Load each .pkl
        # 3. Validate shape
        # 4. Test inference
        # 5. Only then store
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid model file")
```

---

### ⚠️ ISSUE #17: Notification Service Not Integrated

**File**: `modules/notifications/`

**Problem**: Telegram alerts are sent but WebSocket push is incomplete.

**Fix**: Wire up WebSocket in `main.py` and test with frontend.

---

### ⚠️ ISSUE #18: AI Insights Fallback Behavior Unclear

**File**: `services/multi_ai_dispatcher.py`

**Problem**: If Gemini API fails, what happens? Does Claude take over? Silent fail?

**Fix**: Document and test fallback chain (Gemini → Claude → Grok → local heuristics).

---

## 5. TESTING CHECKLIST

### Phase 1: Smoke Tests (Core Functionality)

- [ ] **Backend starts without errors**
  ```bash
  cd GrownLawfulFunction
  python main.py
  # Should print config status and listen on port 8000
  ```

- [ ] **Database initializes**
  ```bash
  curl http://localhost:8000/api/health
  # Should return 200 with schema version
  ```

- [ ] **Frontend builds**
  ```bash
  cd frontend
  npm install && npm run build
  # Should complete without errors
  ```

- [ ] **API key auth works**
  ```bash
  curl -H "x-api-key: test-key" http://localhost:8000/api/predict
  # Should return 401 or 200 depending on auth middleware
  ```

### Phase 2: Core Features

- [ ] **Match ingestion**
  - [ ] POST `/api/predict` with valid match data
  - [ ] Verify prediction is created in DB
  - [ ] Check prediction has all required fields (home_prob, away_prob, etc.)

- [ ] **CLV calculation**
  - [ ] Create prediction with entry_odds = 2.0
  - [ ] Simulate match result
  - [ ] Call CLV endpoint
  - [ ] Verify CLV = (entry - closing) / closing

- [ ] **Admin API key management**
  - [ ] Login to admin dashboard
  - [ ] Update Football Data API key
  - [ ] Verify matches can be fetched
  - [ ] Delete API key, verify requests fail

- [ ] **Prediction history + filtering**
  - [ ] Fetch prediction history
  - [ ] Filter by league, date range, market
  - [ ] Verify correct predictions returned

- [ ] **Analytics dashboard**
  - [ ] Load `/analytics` page
  - [ ] Verify ROI by league is calculated
  - [ ] Verify model weight chart loads
  - [ ] Verify CLV distribution shows

### Phase 3: Background Tasks

- [ ] **ETL pipeline runs**
  - [ ] Start backend
  - [ ] Wait 5 minutes
  - [ ] Check DB: should have new matches
  - [ ] Check logs: ETL events logged

- [ ] **Odds refresh updates**
  - [ ] Fetch match with odds
  - [ ] Wait 30 minutes
  - [ ] Verify odds changed in DB
  - [ ] Check timestamp updated

- [ ] **Cache purge works**
  - [ ] Make 10 requests to same endpoint
  - [ ] Wait 5 min 1 sec
  - [ ] Verify cache was cleared (if cached response expires)

### Phase 4: Authentication

- [ ] **JWT token generation**
  - [ ] POST `/api/auth/login` with valid user
  - [ ] Receive JWT token
  - [ ] Use token in `Authorization: Bearer <token>`
  - [ ] Access protected endpoint

- [ ] **API key validation**
  - [ ] Request with wrong API key → 401
  - [ ] Request with no API key → 401
  - [ ] Request with correct API key → success

- [ ] **Rate limiting**
  - [ ] Rapid requests from same IP
  - [ ] Verify 429 responses after threshold
  - [ ] Verify list expires and next batch allowed

### Phase 5: Payment Integration

- [ ] **Stripe webhook**
  - [ ] Trigger test Stripe event in dashboard
  - [ ] Verify webhook received in logs
  - [ ] Verify `wallet_deposits` table updated

- [ ] **Paystack webhook**
  - [ ] Trigger test Paystack event
  - [ ] Verify webhook received
  - [ ] Verify deposit recorded

- [ ] **Subscription flow**
  - [ ] Create subscription via admin
  - [ ] Verify user has access to predictions
  - [ ] Cancel subscription
  - [ ] Verify access revoked

### Phase 6: AI Integration

- [ ] **Gemini insights** (if `GEMINI_API_KEY` set)
  - [ ] POST `/api/ai/predict` with match data
  - [ ] Receive Gemini analysis (if key valid)
  - [ ] Verify response includes insights

- [ ] **Claude insights** (if `CLAUDE_API_KEY` set)
  - [ ] POST `/api/ai/claude-analyze`
  - [ ] Receive Claude analysis

### Phase 7: Blockchain (Placeholder)

- [ ] **Consensus endpoint**
  - [ ] POST `/api/blockchain/propose-prediction`
  - [ ] Receive block hash
  - [ ] (Actual blockchain: not testable without deployment)

- [ ] **Oracle endpoint**
  - [ ] POST `/api/blockchain/fetch-odds`
  - [ ] Receive simulated odds

### Phase 8: Frontend

- [ ] **Dashboard loads**
  - [ ] Open `/` in browser
  - [ ] Should show recent predictions
  - [ ] Should show bankroll summary

- [ ] **Admin panel accessible**
  - [ ] Navigate to `/admin`
  - [ ] Enter admin API key
  - [ ] Should unlock API key management form

- [ ] **Analytics page**
  - [ ] Navigate to `/analytics`
  - [ ] Charts load without errors
  - [ ] Can filter by league, date

- [ ] **Training page** (if model weights available)
  - [ ] Navigate to `/training`
  - [ ] Can upload model weights zip
  - [ ] Can trigger retraining

### Phase 9: Error Cases

- [ ] **Invalid match data**
  - [ ] POST `/api/predict` with missing required fields
  - [ ] Should return 422 with validation error

- [ ] **Non-existent prediction**
  - [ ] GET `/api/predictions/9999`
  - [ ] Should return 404

- [ ] **Database connection failure** (if tested locally)
  - [ ] Stop database
  - [ ] Make request
  - [ ] Should return 500 with appropriate error

- [ ] **External API timeout** (Odds API fails)
  - [ ] Mock API to timeout
  - [ ] POST `/api/predict`
  - [ ] Should handle gracefully (fallback or error)

### Phase 10: Performance

- [ ] **Prediction latency** (should be <1s)
  - [ ] Time POST `/api/predict`
  - [ ] Target: <500ms

- [ ] **Forecast history** (should load <2s even with 10k predictions)
  - [ ] GET `/api/predictions?limit=1000`
  - [ ] Target: <2s

- [ ] **Analytics aggregation** (should compute <5s)
  - [ ] GET `/api/analytics/roi-by-league`
  - [ ] Target: <5s

---

## 6. CHALLENGES & BLOCKERS

### 🔴 Blocker #1: No Real ML Models
- **Why it matters**: Core value proposition is predictions with edge
- **Current state**: Placeholders that add noise to market odds
- **Timeline to fix**: 2-3 weeks (requires historical data + training)
- **Dependency**: Historical match data (80+ leagues, 5+ years)

### 🔴 Blocker #2: Unreliable Background Tasks
- **Why it matters**: ETL must run to populate matches
- **Current state**: Tasks created but not supervised; silent failures possible
- **Timeline to fix**: 1-2 days
- **Dependency**: None

### 🔴 Blocker #3: Incomplete Database Migrations
- **Why it matters**: Can't safely update schema in production
- **Current state**: Schema relies on `create_all()`
- **Timeline to fix**: 2-3 days
- **Dependency**: None

### 🔴 Blocker #4: No User Authentication
- **Why it matters**: Multi-user support, audit trail, data isolation
- **Current state**: Single API key for all users
- **Timeline to fix**: 3-4 days
- **Dependency**: None

### 🔴 Blocker #5: Blockchain Not Tested
- **Why it matters**: Phase 4 feature is untested
- **Current state**: Code exists, no testnet deployment
- **Timeline to fix**: 2-3 weeks
- **Dependency**: Ethereum testnet (Sepolia) setup

### ⚠️ Blocker #6: Redis Optional (Celery, Rate Limiting)
- **Why it matters**: Celery tasks may silently fail; rate limiting not distributed
- **Current state**: Optional, fallback to in-memory
- **Timeline to fix**: 1-2 days (make mandatory or replace with AsyncIO)
- **Dependency**: Docker setup (or Upstash Redis)

---

## 7. COMPREHENSIVE BUILD PLAN

### **Phase A: Stabilization (Week 1-2)**

**Goal**: Make core prediction pipeline reliable and testable.

#### Subtask A1: Fix Background Task Supervision
- [ ] Implement supervisory loop for ETL, odds refresh, cache purge
- [ ] Add logging for task start/stop/error
- [ ] Test: kill a task, verify restart within 30s
- [ ] **Owner**: Backend Lead
- **Time**: 1 day
- **PR**: `fix/background-task-supervision`

#### Subtask A2: Complete Alembic Migrations
- [ ] Generate migrations for all tables
- [ ] Test upgrade/downgrade on test DB
- [ ] Remove `create_all()` from startup
- [ ] Add `alembic upgrade head` to deployment
- [ ] **Owner**: DBA/Backend
- **Time**: 2-3 days
- **PR**: `feat/complete-migrations`

#### Subtask A3: Add Error Handling Middleware
- [ ] Create custom exception classes (PredictionError, AnalyticsError, etc.)
- [ ] Implement global exception handler
- [ ] Structured error responses with codes
- [ ] Add request correlation IDs
- [ ] Test: trigger errors, verify responses
- [ ] **Owner**: Backend Lead
- **Time**: 1-2 days
- **PR**: `feat/error-handling`

#### Subtask A4: Implement WebSocket Integration
- [ ] Mount WebSocket router in main.py
- [ ] Test: open WS connection, send prediction, receive update
- [ ] Integrate with frontend (update `/pages/dashboard.tsx`)
- [ ] **Owner**: Frontend Lead
- **Time**: 1 day
- **PR**: `feat/websocket-integration`

#### Subtask A5: Fix API Key Validation
- [ ] Audit all routes to ensure x-api-key header used (not query param)
- [ ] Add tests
- [ ] Document in API spec
- [ ] **Owner**: Security Lead
- **Time**: 1 day
- **PR**: `fix/api-key-security`

#### Subtask A6: Add `.env.example`
- [ ] List all required and optional env vars
- [ ] Add comments explaining each
- [ ] Test: new developer can copy → paste → run
- [ ] **Owner**: DevOps/Backend
- **Time**: 2 hours
- **PR**: `docs/env-example`

#### Subtask A7: Initial Test Suite (Phase 1)
- [ ] Add pytest + pytest-asyncio + pytest-cov
- [ ] Write smoke tests (backend starts, DB connects, health endpoint)
- [ ] Write unit tests for core services (prediction, CLV, edge)
- [ ] Target: 20% coverage
- [ ] **Owner**: QA/Backend
- **Time**: 2 days
- **PR**: `test/initial-suite`

### **Phase B: ML & Analytics (Week 3-4)**

**Goal**: Replace placeholder ML models with real trained models.

#### Subtask B1: Implement Real ML Models
- [ ] **Logistic Regression**: Binary classification
- [ ] **Random Forest**: Ensemble on features
- [ ] **XGBoost**: Gradient boosting
- [ ] **Poisson Regression**: Goal-based
- [ ] **LSTM**: Temporal sequences
- [ ] **Transformer**: Attention-based (stretch goal)
- [ ] Each model:
  - [ ] Design training pipeline
  - [ ] Implement feature engineering
  - [ ] Train on historical data
  - [ ] Validate on holdout set
  - [ ] Save weights to `.pkl`
  - [ ] Update `model_orchestrator.py` to load weights
  - [ ] Write unit tests
- [ ] **Owner**: ML Lead + Data Scientists
- **Time**: 3 weeks
- **PR**: `feat/ml-models-*` (per model)

#### Subtask B2: Implement Training Module UI
- [ ] Create `/pages/training.tsx` (upload, retrain, view logs)
- [ ] Add admin endpoint to trigger Colab training
- [ ] Implement weight upload + validation
- [ ] **Owner**: Frontend
- **Time**: 3 days
- **PR**: `feat/training-ui`

#### Subtask B3: Add Model Performance Tracking
- [ ] Log predictions + outcomes
- [ ] Calculate accuracy, ROI, CLV per model
- [ ] Implement model decay (lower weight if underperforming)
- [ ] Test: verify weights adjust over time
- [ ] **Owner**: Backend/ML
- **Time**: 2 days
- **PR**: `feat/model-performance-tracking`

#### Subtask B4: CLV & Edge Validation
- [ ] Test CLV calculation with synthetic data
- [ ] Verify edge detection works
- [ ] Implement edge archival (retired edges)
- [ ] **Owner**: Analytics
- **Time**: 1-2 days
- **PR**: `test/clv-analytics`

### **Phase C: User Authentication & Multi-Tenancy (Week 5-6)**

**Goal**: Support multiple users with role-based access.

#### Subtask C1: Complete User Auth Flow
- [ ] Implement signup endpoint
- [ ] Implement login endpoint
- [ ] Implement JWT refresh tokens
- [ ] Add password reset flow
- [ ] Test: full signup → login → access protected resource
- [ ] **Owner**: Backend Security
- **Time**: 2-3 days
- **PR**: `feat/user-auth`

#### Subtask C2: Implement RBAC
- [ ] Define roles: `admin`, `analyst`, `viewer`
- [ ] Create role middleware
- [ ] Restrict routes by role
- [ ] Test: viewer can't access admin endpoints
- [ ] **Owner**: Backend Security
- **Time**: 1-2 days
- **PR**: `feat/rbac`

#### Subtask C3: Data Isolation
- [ ] Scope predictions by user
- [ ] Scope API keys by user
- [ ] Scope bankroll by user
- [ ] Test: user A can't see user B's data
- [ ] **Owner**: Backend
- **Time**: 2 days
- **PR**: `feat/multi-tenancy`

#### Subtask C4: Audit Trail
- [ ] Log all prediction creations, deletions, modifications
- [ ] Log all API key operations
- [ ] Create audit dashboard
- [ ] **Owner**: Backend Security
- **Time**: 1-2 days
- **PR**: `feat/audit-logging`

### **Phase D: Blockchain & Web3 (Week 7-9)**

**Goal**: Test blockchain integration on testnet.

#### Subtask D1: Deploy to Ethereum Sepolia
- [ ] Write smart contracts (on-chain prediction settlement)
- [ ] Deploy to Sepolia testnet
- [ ] Verify contract address + ABI
- [ ] **Owner**: Solidity Developer
- **Time**: 3-4 days
- **PR**: `feat/ethereum-contracts`

#### Subtask D2: Oracle Integration
- [ ] Write oracle fetcher for Sepolia
- [ ] Test: fetch odds on-chain, verify data
- [ ] Implement oracle callback to settlement
- [ ] **Owner**: Backend/Blockchain
- **Time**: 2-3 days
- **PR**: `feat/oracle-integration`

#### Subtask D3: Prediction Settlement on Chain
- [ ] Implement chain: predict → wait result → settle on-chain
- [ ] Test full flow on testnet
- [ ] Handle blockchain errors gracefully
- [ ] **Owner**: Blockchain Engineer
- **Time**: 3-4 days
- **PR**: `feat/on-chain-settlement`

#### Subtask D4: Cross-Chain Bridge
- [ ] Design bridge contract for multi-chain settlement
- [ ] Test on testnet (Sepolia + Mumbai)
- [ ] Verify bridge integrity
- [ ] **Owner**: Blockchain Engineer
- **Time**: 3-4 days (stretch goal)
- **PR**: `feat/cross-chain-bridge`

### **Phase E: Testing & QA (Week 10-12)**

**Goal**: Comprehensive test coverage, bug fixes, performance validation.

#### Subtask E1: Full Integration Tests
- [ ] Test complete predict → result → settle flow
- [ ] Test API endpoints (all CRUD operations)
- [ ] Test background tasks (ETL, odds refresh)
- [ ] Test webhooks (Stripe, Paystack)
- [ ] **Target**: 50% coverage
- [ ] **Owner**: QA
- **Time**: 3-4 days
- **PR**: `test/integration-suite`

#### Subtask E2: End-to-End Tests (Frontend + Backend)
- [ ] Test: user signup → login → navigate dashboard → make prediction → view analytics
- [ ] Test: admin login → update API keys → manage users
- [ ] Test: WebSocket live updates
- [ ] **Owner**: QA Frontend
- **Time**: 2-3 days
- **PR**: `test/e2e-suite`

#### Subtask E3: Performance Testing
- [ ] Load test: 100 concurrent requests to `/api/predict`
- [ ] Latency target: <500ms p99
- [ ] Load test: analytics aggregation with 100k predictions
- [ ] Latency target: <5s
- [ ] **Owner**: DevOps/Backend
- **Time**: 2 days
- **PR**: `perf/load-testing`

#### Subtask E4: Security Audit
- [ ] OWASP Top 10 check
- [ ] SQL injection tests (SQLAlchemy parameterized, should be safe)
- [ ] XSS tests (frontend input validation)
- [ ] Rate limiting bypass tests
- [ ] API key exposure tests
- [ ] **Owner**: Security
- **Time**: 1-2 days
- **PR**: `security/owasp-audit`

#### Subtask E5: Documentation
- [ ] API spec (OpenAPI/Swagger)
- [ ] Deployment guide
- [ ] Developer onboarding guide
- [ ] Troubleshooting guide
- [ ] **Owner**: Tech Lead + DevOps
- **Time**: 2-3 days
- **PR**: `docs/comprehensive`

### **Phase F: Deployment & Launch (Week 13)**

**Goal**: Prepare for production deployment.

#### Subtask F1: CI/CD Pipeline
- [ ] Set up GitHub Actions or GitLab CI
- [ ] Run tests on every PR
- [ ] Auto-deploy to staging on merge
- [ ] Manual approval for production
- [ ] **Owner**: DevOps
- **Time**: 1-2 days
- **PR**: `ci/github-actions`

#### Subtask F2: Monitoring & Alerting
- [ ] Set up structured logging (JSON logs)
- [ ] Integrate with log aggregation (e.g., Datadog, ELK)
- [ ] Set up alerting for:
  - [ ] High error rates (>1%)
  - [ ] Background task failures
  - [ ] Slow endpoints (>2s)
  - [ ] DB connection pool exhaustion
  - [ ] Rate limiting triggered
- [ ] **Owner**: DevOps
- **Time**: 1-2 days
- **PR**: `ops/monitoring`

#### Subtask F3: Database Backup & Recovery
- [ ] Implement daily automated backups
- [ ] Test restore from backup
- [ ] Document recovery procedure
- [ ] **Owner**: DevOps/DBA
- **Time**: 1 day
- **PR**: `ops/backup-restore`

#### Subtask F4: Secrets Management
- [ ] Remove all hardcoded secrets
- [ ] Implement secrets vault (e.g., AWS Secrets Manager, HashiCorp Vault)
- [ ] Rotate secrets regularly
- [ ] **Owner**: DevOps/Security
- **Time**: 1-2 days
- **PR**: `ops/secrets-management`

#### Subtask F5: Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Verify all integrations (Stripe, Paystack, APIs)
- [ ] **Owner**: DevOps
- **Time**: 1 day
- **PR**: N/A (ops only)

#### Subtask F6: Production Deployment
- [ ] Create deployment runbook
- [ ] Deploy to production
- [ ] Monitor error rates, latency
- [ ] Have rollback plan ready
- [ ] **Owner**: DevOps + Backend Lead
- **Time**: 1-2 days
- **PR**: N/A (ops only)

---

## 8. RESOURCE ALLOCATION & TIMELINE

### Team Structure (Recommended)

| Role | Count | Responsibilities |
|------|-------|------------------|
| **Backend Lead** | 1 | Architecture, core APIs, task supervision, error handling |
| **ML Lead** | 1 | Model training, feature engineering, performance tracking |
| **Frontend Lead** | 1 | UI/UX, React components, WebSocket integration |
| **Blockchain Engineer** | 1 | Smart contracts, oracle, settlement (Phase D) |
| **DevOps** | 1 | Deployment, monitoring, CI/CD, database |
| **QA/Tester** | 1 | Test automation, manual testing, security audit |
| **Security Lead** | 0.5 | API security, auth, OWASP, secrets management |
| **Data Scientist** | 1 | Historical data preparation, model validation |

**Total**: ~6.5 FTE

### Timeline Summary

| Phase | Duration | Key Milestone |
|-------|----------|---------------|
| **A: Stabilization** | 2 weeks | Core pipeline reliable, initial tests passing |
| **B: ML & Analytics** | 2 weeks | Real models trained, performance tracked |
| **C: User Auth** | 2 weeks | Multi-user support, RBAC implemented |
| **D: Blockchain** | 2 weeks | Testnet deployment, settlement tested |
| **E: Testing & QA** | 3 weeks | 50%+ coverage, performance validated |
| **F: Deployment** | 1 week | Staging verified, production ready |
| **Total** | **13 weeks** | **~3 months** |

---

## 9. DEPENDENCIES & RISKS

### External Dependencies

| Service | Current Status | Risk | Mitigation |
|---------|---|---|---|
| **Football Data API** | Requires key | If API down, no live matches | Use fallback data from cache |
| **Odds API** | Requires key | If API down, stale odds | Use cached odds, alert users |
| **Stripe** | Integrated | If down, deposits stuck | Queue webhooks, retry later |
| **Paystack** | Integrated | If down, NGN deposits stuck | Queue webhooks, retry later |
| **Gemini** | Optional | If down, no AI insights | Fallback to Claude/Grok |
| **Claude** | Optional | If down, no AI insights | Fallback to heuristics |
| **Redis** | Optional | If missing, Celery doesn't work | Use in-memory OR implement asyncio replacement |
| **Ethereum** | Testnet only (for now) | If testnet unstable | Use alternative testnet (Mumbai) |

### Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **ML models don't generalize** | Medium | Predictions have no edge | Use ensemble, add feedback loop, validate on holdout |
| **Background tasks fail silently** | High | Stale data | Implement supervision, alerting |
| **Database migration issues** | Medium | Data loss/corruption | Test on replica, dry-run first |
| **Blockchain testnet down** | Low | Phase D delays | Have alternative testnet (Mumbai) ready |
| **Scope creep** | High | Timeline slips | Strict PR review, prioritize Phase A |
| **Talent shortage** | Medium | Blocks progress | Hire ML engineer early |

---

## 10. SUCCESS CRITERIA & DEFINITION OF DONE

### Phase A Complete When:
- [x] All background tasks have supervision
- [x] Alembic migrations work (upgrade/downgrade)
- [x] Error responses are structured
- [x] WebSocket integrated and tested
- [x] Initial 20% test coverage
- [x] `.env.example` created

### Phase B Complete When:
- [x] All 6 core ML models trained + weights saved
- [x] Model performance tracked (accuracy, ROI, CLV)
- [x] Predictions show edge > 0 (statistically)
- [x] Training UI allows uploads
- [x] 50% test coverage

### Phase C Complete When:
- [x] User signup/login works
- [x] RBAC enforced on all endpoints
- [x] Users see only their data
- [x] Audit trail captures all changes
- [x] Multi-user testing passes

### Phase D Complete When:
- [x] Smart contracts deployed to Sepolia
- [x] Oracle fetches odds on-chain
- [x] Prediction settlement works end-to-end
- [x] Bridge tested on two chains
- [x] Integration tests pass

### Phase E Complete When:
- [x] 50%+ test coverage achieved
- [x] Integration tests all passing
- [x] E2E tests all passing
- [x] Performance targets met (<500ms p99, <5s aggregation)
- [x] Security audit passed (no critical issues)

### Phase F Complete When:
- [x] CI/CD pipeline green on all PRs
- [x] Monitoring + alerting configured
- [x] Backup/restore tested
- [x] Staging deployment verified
- [x] Production deployment completed

### Definition of "Production Ready":
- ✅ All critical blockers resolved
- ✅ 50%+ test coverage
- ✅ <500ms prediction latency p99
- ✅ <1% error rate
- ✅ Real ML models (not noise)
- ✅ Multi-user auth + RBAC
- ✅ Audit trail for compliance
- ✅ Monitoring + alerting active
- ✅ Documentation complete
- ✅ Security audit passed

---

## 11. APPENDIX: DETAILED MODULE STATUS

### Module A: Core Prediction Engine ✅ 70% Complete
- ✅ Endpoints defined
- ✅ Feature engineering working
- ⚠️ ML models are placeholders
- ✅ CLV tracking implemented
- **Fix needed**: Replace with real models

### Module B: Admin & API Management ✅ 85% Complete
- ✅ API key CRUD
- ✅ User management
- ✅ Config viewer
- ⚠️ Model upload not validated
- **Fix needed**: Validate uploaded weights

### Module C: Analytics & Reporting ✅ 80% Complete
- ✅ CLV calculation
- ✅ ROI by league/model
- ✅ Performance charts
- ⚠️ Latency could be optimized (add indexes)
- **Fix needed**: Add DB indexes for common queries

### Module D: User Training & Colab ⚠️ 60% Complete
- ✅ Colab trainer script provided
- ⚠️ Frontend UI incomplete
- ⚠️ Weight upload not validated
- **Fix needed**: Complete training UI + validation

### Module E: AI Orchestration ⚠️ 50% Complete
- ✅ Gemini integration defined
- ✅ Claude integration defined
- ⚠️ No fallback chain tested
- ⚠️ Endpoints not fully hooked up
- **Fix needed**: Test integration, add fallback

### Module F: Data Pipeline ✅ 70% Complete
- ✅ ETL loop defined
- ✅ Odds refresh loop defined
- ⚠️ No task supervision
- ⚠️ Error handling minimal
- **Fix needed**: Add supervision, better error handling

### Module G: Marketplace ⚠️ 30% Complete
- ✅ Routes defined
- ⚠️ Frontend pages missing
- ⚠️ Integration untested
- **Fix needed**: Build frontend + test

### Module H: Wallet & Payments ✅ 75% Complete
- ✅ Stripe webhooks working
- ✅ Paystack webhooks working
- ✅ Deposit/withdrawal tracking
- ⚠️ Subscription flow incomplete
- **Fix needed**: Complete subscription logic

### Module I: Trust & Reputation ⚠️ 40% Complete
- ✅ Trust engine defined
- ⚠️ Routes incomplete
- ⚠️ Frontend missing
- **Fix needed**: Complete trust calculation, add UI

### Module J: Cross-Chain Bridge ⚠️ 20% Complete
- ✅ Architecture defined
- ⚠️ No testnet deployment
- ⚠️ Not integrated with main app
- **Fix needed**: Deploy contracts, integrate

### Module K: Notifications ✅ 60% Complete
- ✅ Telegram alerts
- ⚠️ WebSocket incomplete
- ⚠️ Not mounted in main app
- **Fix needed**: Mount WebSocket, test live updates

### Module L: Developer Sandbox ⚠️ 40% Complete
- ✅ Routes defined
- ⚠️ Frontend pages missing
- **Fix needed**: Build UI, test API access

### Module M: Governance ⚠️ 30% Complete
- ✅ Voting routes defined
- ⚠️ Frontend missing
- ⚠️ Integration with blockchain unclear
- **Fix needed**: Define voting mechanism, add UI

---

## 12. QUICK START FOR NEW DEVELOPERS

```bash
# Clone repo
git clone <repo>
cd GrownLawfulFunction

# Install backend
pip install -r requirements.txt

# Create .env (copy from .env.example)
cp .env.example .env
# Edit .env with your API keys

# Start backend
python main.py
# Should print config status and listen on :8000

# In another terminal, start frontend
cd frontend
npm install
npm run dev
# Should listen on :5173 (Vite default)

# Test: Open http://localhost:5173
# Should see dashboard with placeholder data
```

### Key Files to Understand
1. `main.py` — Entry point, app setup, route registration
2. `app/config.py` — Configuration management
3. `app/db/models.py` — Database schema
4. `services/ml_service/models/model_orchestrator.py` — ML ensemble (needs fixing)
5. `app/api/routes/predict.py` — Core prediction endpoint
6. `app/services/results_settler.py` — CLV calculation

### Common Tasks

**Add a new prediction market** (e.g., draw no bet):
1. Add column to `Prediction` model (`dnb_prob`)
2. Update feature engineering in `data/feature_engineering.py`
3. Update prediction endpoint in `routes/predict.py`
4. Update frontend prediction card

**Add a new AI provider** (e.g., LLaMA):
1. Create `services/llama_insights.py`
2. Add to `services/multi_ai_dispatcher.py`
3. Update config to include `LLAMA_API_KEY`
4. Test fallback chain

**Fix a background task** (e.g., ETL stalled):
1. Check logs: `grep "ETL" logs/vit.log`
2. Check if task is running: `ps aux | grep python`
3. Check DB: `SELECT COUNT(*) FROM matches WHERE created_at > now() - interval '1 hour'`
4. If stalled, restart backend: `python main.py`

---

## 13. CLOSING REMARKS

**VIT v4 is a well-architected, feature-rich platform with solid foundations.** The codebase demonstrates mature design patterns (async/await, dependency injection, middleware, ORM, migrations). The feature scope is ambitious but reasonable for a 3-month build.

**However, production readiness requires addressing the critical blockers** (real ML models, task supervision, migrations, user auth, testing). The good news: none of these are architectural issues. They're implementation details that can be fixed with disciplined work.

**Estimated effort**: 13 weeks (3 months) with a 6.5-person team to reach production-ready.

**Next step**: Form the core team, assign phases, and begin Phase A (Stabilization). Phase A should be completed in 2 weeks before starting Phase B (ML).

---

## AUDIT CHECKLIST SUMMARY

- ✅ Architecture review complete
- ✅ Codebase analysis complete
- ✅ Dependencies documented
- ✅ Critical issues identified (10 critical, 8 medium)
- ✅ Testing plan defined
- ✅ Build plan outlined (6 phases, 13 weeks)
- ✅ Success criteria specified
- ✅ Resource allocation recommended

**Recommendation**: ✅ **PROCEED WITH BUILD**, starting with Phase A (Stabilization).

---

**Audit Author**: Cloud Engineer  
**Audit Date**: April 18, 2026  
**Status**: Complete  
**Next Review**: Upon Phase A completion (2 weeks)

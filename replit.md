# VIT Sports Intelligence Network v4.4.0 — Production Hardening

## Overview
A full-stack sports prediction platform combining a 12-model ML ensemble with AI insights, blockchain economy, wallet system, marketplace, governance, and complete module coverage across all 11 phases of the build roadmap.

## Blocker Status (as of v4.4.0)
- ✅ **Blocker #1 — Real ML Models**: `scripts/train_models.py` trains LR (75.1%) + RF (80.8%) models; `scripts/generate_training_data.py` generates synthetic training data; `.pkl` files saved to `backend/models/trained/` and `models/`
- ✅ **Blocker #2 — Test Coverage**: 249 tests across 20 test files; all tests passing; `pytest-cov` configured in CI
- ✅ **Blocker #3 — CI/CD**: `.github/workflows/ci.yml` with backend tests, lint, frontend build, security scan, integration gate
- ✅ **Blocker #4 — Monitoring**: `app/core/logging_config.py` wired into `main.py` lifespan; structured JSON logging in prod, readable plain text in dev; request context middleware
- ✅ **Blocker #5 — Frontend Integration**: `AIConfidenceWidget` and `TopOpportunitiesWidget` in `frontend/src/pages/dashboard.tsx` now use real API data from `/api/dashboard/model-confidence` and `/api/dashboard/top-opportunities`; loading skeletons and empty-state handling included

## Architecture
- **Backend**: FastAPI (Python 3.11) on port 8000
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui on port 5000
- **Database**: SQLite (dev) / PostgreSQL (prod) via SQLAlchemy async — auto-migrates on start
- **Auth**: JWT Bearer (`Authorization: Bearer <token>`) + legacy x-api-key support
- **Background Tasks**: Supervised async loops for ETL, odds refresh, and cache purge; direct async loops for auto-settlement, model accountability, pricing, and subscription expiry

## Running the App
```bash
bash scripts/start_fullstack.sh
```
- Backend: `python -m uvicorn main:app --host 0.0.0.0 --port 8000`
- Frontend: `cd frontend && npm run dev` (Vite on port 5000, proxies API to localhost:8000)

## Module Status
- ✅ Phase 0: Foundation (FastAPI, 12-model ML, CLV tracking, Telegram)
- ✅ Phase 1: Wallet & VITCoin Engine (`app/modules/wallet/`)
- ✅ Phase 2: AI Orchestration (`app/modules/ai/` — registry, orchestrator, weight adjuster)
- ✅ Phase 3: Data Pipeline (`app/data/` — ETL, real-time odds, feature engineering)
- ✅ Phase 4: Blockchain Economy (`app/modules/blockchain/` — consensus, oracle, settlement)
- ✅ Phase 5: Analytics & Dashboard (`app/api/routes/analytics.py`, `dashboard.py`)
- ✅ Phase 6: Notifications (`app/modules/notifications/` — WebSocket, email, Telegram)
- ✅ Phase 7: AI Marketplace (`app/modules/marketplace/`)
- ✅ Phase 8: Trust & Anti-Fraud (`app/modules/trust/`)
- ✅ Phase 9: Cross-Chain Bridge (`app/modules/bridge/`)
- ✅ Phase 10: RBAC Admin Control Center (v4.3.0)
  - Backend: `app/core/roles.py` (AdminRole, SubscriptionTier, Permission, ROLE_PERMISSIONS matrix)
  - Backend: `app/core/permissions.py` (require_permission, require_admin_roles, require_subscription)
  - Backend: 11 new admin endpoint groups in `app/api/routes/admin.py` (stats, health, users CRUD+ban, leagues×25, markets×9, currency+VIT recalc, subscriptions, feature flags, cache/backup, audit)
  - Frontend: `app/lib/auth.tsx` (AuthProvider with hasPermission/hasAdminRole/hasTier helpers)
  - Frontend: `components/auth/ProtectedRoute.tsx`, `PermissionGate.tsx`, `TierGate`
  - Frontend: `pages/admin.tsx` — 8-tab control center (Dashboard, Users, Leagues, Markets, Currency, Subscriptions, System, Audit)
  - Database: Alembic migration 739d5e62d691 adds admin_role, subscription_tier, is_banned to users
- ✅ Phase 10: Developer Platform (`app/modules/developer/`)
- ✅ Phase 11: Governance (`app/modules/governance/`)
- ✅ Module D: AI Training Guide (`app/modules/training/`)

## Key Files
- `main.py` — FastAPI entry point, all 16+ routers, lifespan, background tasks
- `frontend/` — React TypeScript SPA (17 pages, wouter routing, shadcn/ui)
- `requirements.txt` — Python dependencies plus pytest/coverage tooling
- `tests/` — initial pytest smoke suite with coverage target
- `app/modules/` — All feature modules (wallet, blockchain, ai, training, notifications, marketplace, trust, bridge, developer, governance)
- `app/data/` — ETL pipeline, real-time data, feature engineering
- `app/auth/` — JWT auth (jwt_utils.py, routes.py, dependencies.py)
- `app/core/cache.py` — In-memory TTL cache
- `app/api/middleware/security.py` — Security headers middleware
- `services/ml_service/` — 12-model ML ensemble

## Phase F: Institutional-Grade UX (v4.2.0)
New frontend features added:

### Design System (DS1–DS3)
- `frontend/src/styles/tokens.css` — Full design token system: deep space color palette (`--vit-brand-*`, `--vit-gray-*`), perfect fourth typography scale, 4px spacing grid, shadow/glow system, animation tokens (150ms/250ms/350ms), glassmorphism utilities, keyframe animations (slide-up, scale-in, celebrate, ticker)
- Mobile-first responsive with bottom nav bar for mobile (4 core tabs)
- Sticky desktop sidebar with scrollable nav

### Onboarding (ON1–ON3)
- `frontend/src/components/onboarding.tsx` — WelcomeModal (celebration animation + 100 VIT bonus display), OnboardingTour (3-step interactive guide), FirstPredictionFlow (match selection + stake slider + presets)
- Auth page now triggers WelcomeModal after registration → optional tour
- Show password toggle on all password fields

### Dashboard (DB1–DB3)
- Personalized greeting with time-of-day awareness
- Active predictions + Top Opportunities widget (AI edge sorted)
- AI Ensemble Status panel (per-model confidence + historical accuracy)
- LevelCard — XP-based level system (Novice → Analyst → Pro → Elite → Legend)
- AchievementBadges grid (6 badges, 4 rarity tiers)
- Leaderboard widget (top 10, highlights current user)
- StreakCounter widget with fire animation
- Mobile Quick Actions FAB (floating action button)

### Wallet (WL1–WL2)
- Total portfolio hero card with USD equivalent and win rate
- Per-currency balance grid (5 currencies, color-coded)
- KYC status banner with verify-now button
- Quick deposit: preset amounts (1K/5K/10K/50K NGN etc.), fee calculation preview
- Transaction history with type filters (all/deposit/withdrawal/conversion)
- Export statement button (coming soon toast)

### Landing Page (LP1–LP2)
- `frontend/src/pages/landing.tsx` — Full marketing landing page
- Fixed navbar with smooth scroll links
- Hero with gradient text, social proof stats (50K+ predictions, 73% accuracy, $2.4M staked, 12 models)
- Live ticker tape with historical results
- 6-feature showcase grid with hover lift
- AI ensemble visualization mockup (animated confidence bars)
- Auto-rotating testimonial carousel
- 3-tier pricing table (Free/Pro/Elite)
- Footer with links
- Landing page shown to unauthenticated users at `/`

### Integration (INT1–INT4)
- `frontend/src/lib/apiClient.ts` — Token refresh interceptor, 401 auto-logout, 429 rate limit toast with retry-after
- `frontend/src/lib/websocket.ts` — VITWebSocketService with auto-reconnect (exponential backoff), message routing by type, offline queue
- `frontend/src/components/error-boundary.tsx` — React ErrorBoundary with retry, dev stack trace, Sentry-ready hook
- `frontend/src/App.tsx` — QueryClient with smart retry (skip 401s), error boundary wrapping all routes, improved loading spinner

### Updated Files
- `frontend/src/components/layout.tsx` — Mobile bottom nav bar, sticky desktop sidebar, improved active state styles, VIT_OS branding
- `frontend/src/index.css` — imports tokens.css
- `frontend/src/lib/apiClient.ts` — Enhanced with token refresh + rate limit handling
- `frontend/src/App.tsx` — Landing route, error boundaries, QueryClient tuning

## Frontend Pages (19)
landing (new, public), dashboard, matches, match-detail, predictions, wallet, validators, training, analytics, subscription, admin, marketplace, trust, bridge, developer, governance, auth (login/register), payment-callback, not-found

## Authentication
- **JWT Bearer** — `Authorization: Bearer <token>`
- **API Key** — `x-api-key: <key>` (legacy, still supported)
- POST /auth/register → creates user (first user = admin)
- POST /auth/login → returns access + refresh tokens
- POST /auth/refresh → refreshes tokens
- GET /auth/me → current user info

## Environment Variables
- `FOOTBALL_DATA_API_KEY` — live fixture fetching + auto-settlement
- `THE_ODDS_API_KEY` — odds comparison
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — Telegram alerts
- `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROK_API_KEY` — AI match insights
- `JWT_SECRET_KEY` — JWT signing key (change before production)
- If `JWT_SECRET_KEY` is not set in development, the app creates a local `.vit_jwt_secret`; production requires an explicit secret.
- `ADMIN_PASSWORD` — optional default admin seed password; without it, startup will not create a new default admin account.
- `STRIPE_SECRET_KEY` — Stripe payments
- `ACCESS_TOKEN_EXPIRE_MINUTES` — JWT TTL (default: 60)
- `REFRESH_TOKEN_EXPIRE_DAYS` — refresh TTL (default: 30)

## Database
SQLite dev (`vit.db`), PostgreSQL in production. Schema is managed by Alembic migrations on startup; `Base.metadata.create_all` is no longer used during app startup.

Core tables: matches, predictions, clv_entries, edges, model_performances, bankroll_states, decision_logs, teams, ai_predictions, ai_performances, ai_signal_cache, subscription_plans, user_subscriptions, audit_logs, training_datasets, users, training_jobs, training_guide_steps

Module tables: wallets, wallet_transactions, withdrawal_requests, platform_configs, vitcoin_price_history, validator_profiles, validator_predictions, consensus_predictions, oracle_results, match_settlements, user_stakes, model_metadata, ai_prediction_audits, match_feature_store, pipeline_runs, notifications, notification_preferences, ai_model_listings, user_trust_scores, fraud_flags, risk_events, bridge_transactions, developer_api_keys, governance_proposals, governance_votes

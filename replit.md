# VIT Sports Intelligence Network v4.0.0

## Overview
A full-stack sports prediction platform combining a 12-model ML ensemble with AI insights, blockchain economy, wallet system, marketplace, governance, and complete module coverage across all 11 phases of the build roadmap.

## Architecture
- **Backend**: FastAPI (Python 3.11) on port 8000
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui on port 5000
- **Database**: SQLite (dev) / PostgreSQL (prod) via SQLAlchemy async — auto-migrates on start
- **Auth**: JWT Bearer (`Authorization: Bearer <token>`) + legacy x-api-key support
- **Background Tasks**: Async loops — auto-settlement, model accountability, ETL pipeline, odds refresh, notification expiry, cache purge

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
- ✅ Phase 10: Developer Platform (`app/modules/developer/`)
- ✅ Phase 11: Governance (`app/modules/governance/`)
- ✅ Module D: AI Training Guide (`app/modules/training/`)

## Key Files
- `main.py` — FastAPI entry point, all 16+ routers, lifespan, background tasks
- `frontend/` — React TypeScript SPA (17 pages, wouter routing, shadcn/ui)
- `requirements.txt` — Python dependencies (clean, deduplicated)
- `app/modules/` — All feature modules (wallet, blockchain, ai, training, notifications, marketplace, trust, bridge, developer, governance)
- `app/data/` — ETL pipeline, real-time data, feature engineering
- `app/auth/` — JWT auth (jwt_utils.py, routes.py, dependencies.py)
- `app/core/cache.py` — In-memory TTL cache
- `app/api/middleware/security.py` — Security headers middleware
- `services/ml_service/` — 12-model ML ensemble

## Frontend Pages (17)
dashboard, matches, match-detail, predictions, wallet, validators, training, analytics, subscription, admin, marketplace, trust, bridge, developer, governance, auth (login/register), not-found

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
- `STRIPE_SECRET_KEY` — Stripe payments
- `ACCESS_TOKEN_EXPIRE_MINUTES` — JWT TTL (default: 60)
- `REFRESH_TOKEN_EXPIRE_DAYS` — refresh TTL (default: 30)

## Database
SQLite dev (`vit.db`), PostgreSQL in production. All tables auto-created on startup via `Base.metadata.create_all`.

Core tables: matches, predictions, clv_entries, edges, model_performances, bankroll_states, decision_logs, teams, ai_predictions, ai_performances, ai_signal_cache, subscription_plans, user_subscriptions, audit_logs, training_datasets, users, training_jobs, training_guide_steps

Module tables: wallets, wallet_transactions, withdrawal_requests, platform_configs, vitcoin_price_history, validator_profiles, validator_predictions, consensus_predictions, oracle_results, match_settlements, user_stakes, model_metadata, ai_prediction_audits, match_feature_store, pipeline_runs, notifications, notification_preferences, ai_model_listings, user_trust_scores, fraud_flags, risk_events, bridge_transactions, developer_api_keys, governance_proposals, governance_votes

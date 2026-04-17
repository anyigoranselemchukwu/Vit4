# VIT Sports Intelligence Network

## Overview
A full-stack sports prediction platform combining a 12-model ML ensemble with AI insights for football match predictions, CLV tracking, and bankroll management.

## Architecture
- **Backend**: FastAPI (Python 3.11) on port 5000 — serves both the API and the built React frontend
- **Frontend**: React 19 + Vite, built to `frontend/dist/` and served as static files by FastAPI
- **Database**: SQLite (local) / PostgreSQL (production) via SQLAlchemy async
- **Background Tasks**: Celery + Redis (optional; auto-settle and model accountability run as async loops)
- **Auth**: JWT (python-jose + bcrypt) — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`

## Running the App
The workflow `Start application` runs `python main.py` on port 5000.

## Key Files
- `main.py` — FastAPI entry point; lifespan, routes, static file serving
- `frontend/` — Vite + React project; `npm run build` outputs to `frontend/dist/`
- `requirements.txt` — Python dependencies
- `app/` — API routes, services, DB models, middleware
- `app/auth/` — JWT auth module (jwt_utils.py, routes.py, dependencies.py)
- `app/training/` — Module D: quality_scorer.py, prompt_generator.py
- `services/ml_service/` — 12-model ML ensemble

## Frontend Build
```bash
cd frontend && npm install && npm run build
```

## Database Migrations
```bash
alembic upgrade head
```
Current head: `003` (adds users, training_jobs, training_guide_steps)

## Authentication
- **JWT Bearer** — `Authorization: Bearer <token>` (preferred)
- **API Key** — `x-api-key: <key>` (legacy, still supported)
- First registered user automatically becomes `admin`
- JWT secret configured via `JWT_SECRET_KEY` env var

## Environment Variables (optional)
See `.env.example` for available keys:
- `FOOTBALL_DATA_API_KEY` — enables live fixture fetching and auto-settlement
- `THE_ODDS_API_KEY` — enables odds comparison
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — enables Telegram alerts
- `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROK_API_KEY` — enables AI match insights
- `JWT_SECRET_KEY` — JWT signing key (change before production)
- `ACCESS_TOKEN_EXPIRE_MINUTES` — JWT access token TTL (default: 60)
- `REFRESH_TOKEN_EXPIRE_DAYS` — JWT refresh token TTL (default: 30)

## Roadmap Status
- ✅ Phase 0: Foundation (FastAPI, React, 12-model ML, CLV, Telegram)
- ✅ Pre-Phase 1 blockers resolved: JWT auth, full Alembic migrations, Module D training pipeline
- 🔜 Phase 1: Wallet & VITCoin Engine (app/wallet/)
- 🔜 Phase 2: AI Orchestration Layer (app/ai/)
- 🔜 Phase 3: Data Pipeline (data/pipeline.py)
- 🔜 Phase 4: Blockchain Economy (app/blockchain/)

## DB Tables (19 total)
matches, predictions, clv_entries, edges, model_performances,
bankroll_states, decision_logs, teams, ai_predictions, ai_performances,
ai_signal_cache, subscription_plans, user_subscriptions, audit_logs,
training_datasets, users, training_jobs, training_guide_steps, alembic_version

# VIT Sports Intelligence Network

## Overview

Full-stack sports prediction platform combining a 12-model ML ensemble, blockchain economy (VITCoin), validator consensus, AI insights, marketplace, and governance for football match predictions.

**Default admin credentials:** `admin@vit.network` / `VitAdmin2025!`  
**localStorage token key:** `vit_token`  
**API base:** Backend port `8000`, Frontend port `5000`

---

## Module Status

| Phase | Module | Status | Key Deliverables |
|-------|--------|--------|-----------------|
| 0 | Foundation | ✅ Complete | DB, auth, config, JWT, rate limit, CORS |
| 1 | Wallet (B) | ✅ Complete | Multi-currency, VITCoin pricing, transactions, Paystack/Stripe/USDT/Pi |
| 2 | AI Orchestration (E) | ✅ Complete | 12-model ensemble, consensus engine, weight adjustment |
| 3 | Data Pipeline (F) | ✅ Complete | ETL, feature engineering, real-time odds WebSocket |
| 4 | Blockchain (C) | ✅ Complete | Validator consensus, staking, settlement, oracle |
| 5 | Analytics Dashboard (H) | ✅ Complete | System metrics, leaderboards, user P&L, date filter |
| 6 | Notifications (K) | ✅ Complete | In-app bell, WebSocket push, preferences, multi-channel |
| 7 | AI Marketplace (G) | ✅ Complete | Model listings, VITCoin billing, 15% protocol fee, ratings |
| 8 | Trust & Anti-Fraud (I) | ✅ Complete | 6 fraud detectors, composite trust score, flag review queue |
| 9 | Cross-Chain Bridge (J) | ✅ Complete | VIT↔USDT/ETH pools, lock/mint/burn, relayer confirm, audit log |
| 10 | Developer Platform (L) | ✅ Complete | API key management (4 plans), usage logging, SDK docs |
| 11 | Governance (M) | ✅ Complete | Proposal system, weighted voting (stake×trust), timelock execution |

### Production-Readiness Improvements (Post-MVP)

| Track | Status | Details |
|-------|--------|---------|
| Requirements cleanup | ✅ Done | Deduplicated to 25 pinned packages; added `stripe`, `itsdangerous` |
| Security headers middleware | ✅ Done | CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy |
| GZip compression | ✅ Done | `GZipMiddleware(minimum_size=1000)` on all responses |
| In-memory TTL cache | ✅ Done | `app/core/cache.py` — `@cached(ttl, key_prefix)` decorator + background purge |
| Payment webhooks (Stripe) | ✅ Done | Stripe-Signature HMAC-SHA256 verification; replay attack prevention (5-min window) |
| Payment webhooks (Paystack) | ✅ Done | HMAC-SHA512 signature verification |
| Football data multi-provider | ✅ Done | `RAPIDAPI_KEY` / `RAPIDAPI_HOST` config vars added; `FOOTBALL_DATA_API_KEY` remains primary |
| .env.example comprehensive | ✅ Done | All keys documented: DB, auth, Paystack, Stripe, USDT, Pi, Telegram, Redis, API keys |
| config.py consolidated | ✅ Done | All env vars in one place with typed constants |
| Mobile hamburger nav | ✅ Done | Slide-over drawer with backdrop, close button, smooth UX |
| Duplicate icon fix (Training) | ✅ Done | Training uses `BookOpen`, Analytics uses `BarChart2` |
| Skeleton loading states | ✅ Done | Dashboard cards, mini stats, metrics grid, activity log all have skeletons |
| Improved empty states | ✅ Done | Activity log shows icon + copy instead of raw "NO_ACTIVITY_YET" |
| 404 page restyle | ✅ Done | Themed with AlertTriangle icon, font-mono, return-to-dashboard button |
| PostgreSQL support | ✅ Done | `VIT_DATABASE_URL=postgresql+asyncpg://...` in .env.example; `asyncpg` in requirements |
| **Mobile "Failed to fetch" fix** | ✅ Done | Removed `VITE_API_URL=http://localhost:8000` from startup script — all API calls now use relative URLs proxied by Vite |
| **Auth rate-limit bypass** | ✅ Done | `/auth/login`, `/auth/register`, `/auth/refresh` added to `RateLimitMiddleware._BYPASS` |
| **Pipeline flood fix** | ✅ Done | ETL and odds loops now check `_has_data_api_key()` before making external calls — no retry storm when keys are absent |
| **Admin router quick-access** | ✅ Done | New "Routes" tab in Admin Panel — 14 frontend pages + 100+ API endpoints with method badges, descriptions, clickable links |

---

## Stack

- **Backend**: Python 3.11 + FastAPI + SQLAlchemy (async) + SQLite (dev) / PostgreSQL (prod)
- **Frontend**: React 19 + Vite + TailwindCSS v4 + shadcn/ui + Wouter routing
- **Auth**: JWT (python-jose + bcrypt + passlib)
- **ML**: scikit-learn ensemble (12 models) + pandas + numpy + joblib
- **Payments**: Paystack (NGN), Stripe (USD), USDT on-chain, Pi Network
- **Background tasks**: asyncio loops — settlement (6h), model accountability (24h), ETL pipeline (6h), odds refresh (15m), subscription expiry (12h), cache purge (5m)
- **Security**: CORS, API key middleware, rate limiter, security headers, GZip, HMAC webhook verification

---

## Middleware Stack (order matters — innermost executes first)

```
CORSMiddleware          → outermost
GZipMiddleware          → compress responses ≥1KB
SecurityHeadersMiddleware → add security headers
APIKeyMiddleware        → validate API keys (non-auth routes)
LoggingMiddleware       → structured request logging
RateLimitMiddleware     → sliding-window rate limiter
```

---

## Project Structure

```
/
├── main.py                   # FastAPI entry point, lifespan, middleware, routers
├── requirements.txt          # 25 pinned Python packages (deduplicated)
├── .env.example              # Complete env var reference with comments
├── app/
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── auth.py           # APIKeyMiddleware
│   │   │   ├── logging.py        # Request/response logging
│   │   │   ├── rate_limit.py     # Sliding-window rate limiter
│   │   │   └── security.py       # Security headers (CSP, HSTS, X-Frame…) ← NEW
│   │   └── routes/               # Core: predict, result, history, analytics, dashboard…
│   ├── auth/                 # JWT auth routes & utilities
│   ├── config.py             # All environment config constants (typed)
│   ├── core/
│   │   ├── cache.py          # TTL cache + @cached decorator ← NEW
│   │   └── dependencies.py   # FastAPI DI providers (orchestrator, data loader, alerts)
│   ├── db/                   # SQLAlchemy models + async engine
│   ├── data/                 # Module F: ETL + WebSocket real-time odds
│   └── modules/
│       ├── ai/               # 12-model ensemble orchestration (Module E)
│       ├── blockchain/       # Validator consensus + oracle (Module C)
│       ├── bridge/           # Cross-chain bridge (Module J)
│       ├── developer/        # API key platform (Module L)
│       ├── governance/       # Proposal + voting (Module M)
│       ├── marketplace/      # AI model marketplace (Module G)
│       ├── notifications/    # Bell + WebSocket push (Module K)
│       ├── training/         # ML training jobs (Module D)
│       ├── trust/            # Anti-fraud + trust scoring (Module I)
│       └── wallet/
│           ├── routes.py     # Wallet CRUD
│           ├── admin_routes.py
│           └── webhooks.py   # Paystack + Stripe + USDT + Pi (HMAC verified) ← UPDATED
├── alembic/                  # Database migrations
├── scripts/
│   └── start_fullstack.sh    # Starts backend (port 8000) + frontend (port 5000)
└── frontend/
    └── src/
        ├── components/
        │   ├── layout.tsx        # Sidebar + mobile hamburger drawer ← UPDATED
        │   ├── notification-bell.tsx
        │   └── ui/               # shadcn/ui components (skeleton, card, badge…)
        ├── lib/
        │   ├── apiClient.ts      # apiGet / apiPost / apiPatch / apiDelete / apiFormPost
        │   └── auth.tsx          # Auth context (token key: vit_token)
        └── pages/
            ├── dashboard.tsx     # Skeleton loading + improved empty states ← UPDATED
            ├── not-found.tsx     # Themed 404 page ← UPDATED
            └── …                 # matches, predictions, wallet, validators, analytics…
```

---

## Running Locally

```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy env file and fill in values
cp .env.example .env

# Start everything (backend :8000 + frontend :5000)
bash scripts/start_fullstack.sh
```

Or use the **Start application** workflow in Replit.

---

## Environment Variables

See `.env.example` for the complete reference. Key groups:

| Group | Key Variables |
|-------|--------------|
| Database | `VIT_DATABASE_URL` (SQLite or PostgreSQL) |
| Auth | `SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES` |
| Payments | `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Football data | `FOOTBALL_DATA_API_KEY`, `RAPIDAPI_KEY`, `RAPIDAPI_HOST` |
| Notifications | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| Crypto | `USDT_MIN_CONFIRMATIONS`, `USDT_WALLET_ADDRESS` |
| Cache/Queue | `REDIS_URL` |

---

## Key API Endpoints

### Auth
- `POST /auth/register` — Create account
- `POST /auth/login` — Get JWT token
- `GET /auth/me` — Current user

### Payments & Webhooks
- `POST /api/webhooks/paystack` — Paystack webhook (HMAC-SHA512 verified)
- `POST /api/webhooks/stripe` — Stripe webhook (Stripe-Signature verified)
- `POST /api/webhooks/usdt` — USDT on-chain notification
- `POST /api/webhooks/pi` — Pi Network payment
- `GET  /api/webhooks/health` — Webhook receiver status

### Wallet
- `GET  /api/wallet/me` — Balance (NGN/USD/USDT/PI/VIT)
- `POST /api/wallet/deposit/initiate` — Start deposit
- `POST /api/wallet/convert` — Currency conversion
- `POST /api/wallet/withdraw` — Request withdrawal

### Dashboard
- `GET /api/dashboard/summary` — KPI summary
- `GET /api/dashboard/vitcoin-price` — Live VITCoin price
- `GET /api/dashboard/recent-activity` — Latest events

### Health
- `GET /health` — System health check

---

## Subscription Tiers

| Tier | Price | Predictions/day | Features |
|------|-------|-----------------|---------|
| Free | $0 | 5 | Basic predictions |
| Pro | $19.99/mo | 50 | Analytics + AI insights |
| Elite | $49.99/mo | Unlimited | All features + Telegram alerts |

---

## Deployment Notes

1. Set `VIT_DATABASE_URL` to a PostgreSQL URL in production
2. Set `APP_ENV=production` to activate HSTS and tighter security
3. Set `CORS_ALLOWED_ORIGINS` to your exact domain (not `*`)
4. Generate a strong `SECRET_KEY` with `python -c "import secrets; print(secrets.token_hex(32))"`
5. Configure Paystack and Stripe webhook endpoints to point at `/api/webhooks/paystack` and `/api/webhooks/stripe`
6. Replit DB (PostgreSQL) is available via the Database integration in Replit Secrets

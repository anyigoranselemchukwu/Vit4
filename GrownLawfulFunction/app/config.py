import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env without overriding existing environment variables.
DOTENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=DOTENV_PATH, override=False)


def get_env(name: str, default: str = "") -> str:
    """Read environment variables from os.environ first, then fallback to .env values."""
    value = os.environ.get(name)
    if value:
        return value
    return os.getenv(name, default) or default


# ── Application ────────────────────────────────────────────────────────
APP_VERSION: str    = get_env("APP_VERSION", "4.0.0")
APP_ENV: str        = get_env("APP_ENV", "development")
IS_PRODUCTION: bool = APP_ENV == "production"

# ── Prediction / bankroll constants (override via env vars) ────────────
MAX_STAKE: float          = float(get_env("MAX_STAKE",           "0.05"))
MIN_EDGE_THRESHOLD: float = float(get_env("MIN_EDGE_THRESHOLD",  "0.02"))

# ── LSTM training guard (prevents OOM on large synthetic datasets) ─────
LSTM_MAX_TRAINING_SEQS: int = int(get_env("LSTM_MAX_TRAINING_SEQS", "2000"))

# ── Ports ──────────────────────────────────────────────────────────────
BACKEND_PORT: int  = int(get_env("BACKEND_PORT",  "8000"))
FRONTEND_PORT: int = int(get_env("FRONTEND_PORT", "5000"))

# ── Security ───────────────────────────────────────────────────────────
SECRET_KEY: str              = get_env("SECRET_KEY", "dev-secret-change-in-production")
JWT_ALGORITHM: str           = get_env("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES: int      = int(get_env("JWT_EXPIRE_MINUTES", "1440"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(get_env("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
CORS_ALLOWED_ORIGINS: str    = get_env("CORS_ALLOWED_ORIGINS", "*")

# ── Football Data APIs ─────────────────────────────────────────────────
FOOTBALL_DATA_API_KEY: str = get_env("FOOTBALL_DATA_API_KEY", "")
RAPIDAPI_KEY: str          = get_env("RAPIDAPI_KEY", "")
RAPIDAPI_HOST: str         = get_env("RAPIDAPI_HOST", "api-football-v1.p.rapidapi.com")

# ── Telegram ───────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN: str = get_env("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID: str   = get_env("TELEGRAM_CHAT_ID", "")

# ── Paystack (NGN payments) ────────────────────────────────────────────
PAYSTACK_SECRET_KEY: str     = get_env("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY: str     = get_env("PAYSTACK_PUBLIC_KEY", "")
PAYSTACK_WEBHOOK_SECRET: str = get_env("PAYSTACK_WEBHOOK_SECRET", "")

# ── Stripe (USD / card payments) ──────────────────────────────────────
STRIPE_SECRET_KEY: str      = get_env("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY: str = get_env("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET: str  = get_env("STRIPE_WEBHOOK_SECRET", "")

# ── Crypto / USDT ──────────────────────────────────────────────────────
USDT_MIN_CONFIRMATIONS: int = int(get_env("USDT_MIN_CONFIRMATIONS", "3"))
USDT_WALLET_ADDRESS: str    = get_env("USDT_WALLET_ADDRESS", "")

# ── Pi Network ─────────────────────────────────────────────────────────
PI_API_KEY: str = get_env("PI_API_KEY", "")

# ── Redis ──────────────────────────────────────────────────────────────
REDIS_URL: str = get_env("REDIS_URL", "redis://localhost:6379/0")

# ── Admin ──────────────────────────────────────────────────────────────
ADMIN_EMAIL: str    = get_env("ADMIN_EMAIL",    "admin@vit.network")
ADMIN_PASSWORD: str = get_env("ADMIN_PASSWORD", "VitAdmin2025!")

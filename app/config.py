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


# ── Application version (single source of truth) ──────────────────────
APP_VERSION: str = get_env("APP_VERSION", "3.1.0")

# ── Prediction / bankroll constants (override via env vars) ────────────
MAX_STAKE: float         = float(get_env("MAX_STAKE",          "0.05"))
MIN_EDGE_THRESHOLD: float = float(get_env("MIN_EDGE_THRESHOLD", "0.02"))

# ── LSTM training guard (prevents OOM on large synthetic datasets) ─────
LSTM_MAX_TRAINING_SEQS: int = int(get_env("LSTM_MAX_TRAINING_SEQS", "2000"))

# ── Ports (for reference; actual binding uses env vars in start.sh) ────
BACKEND_PORT: int  = int(get_env("BACKEND_PORT",  "8000"))
FRONTEND_PORT: int = int(get_env("FRONTEND_PORT", "5000"))

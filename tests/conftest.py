import os
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("AUTH_ENABLED", "false")
os.environ.setdefault("VIT_DATABASE_URL", "sqlite+aiosqlite:///./vit.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-for-pytest-only")
os.environ.setdefault("SECRET_KEY", "test-secret-for-pytest-only")
os.environ.setdefault("FOOTBALL_DATA_API_KEY", "")
os.environ.setdefault("THE_ODDS_API_KEY", "")
os.environ.setdefault("ODDS_API_KEY", "")
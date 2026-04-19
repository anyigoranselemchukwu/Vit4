"""
scripts/train_models.py

Train LogisticRegression, RandomForest, and XGBoost models using
historical match data from the database, then save them as .pkl files
to backend/models/trained/ so the orchestrator can load them when
USE_REAL_ML_MODELS=true.

Usage:
    python scripts/train_models.py
"""

import asyncio
import logging
import os
import sys

import joblib
import numpy as np
from pathlib import Path

# ── Project root on path ──────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

# Save to both locations so the orchestrator finds them regardless of config
TRAINED_DIR = ROOT / "backend" / "models" / "trained"
MODELS_DIR = ROOT / "models"
TRAINED_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLUMNS = [
    "home_odds", "draw_odds", "away_odds",
    "home_implied", "draw_implied", "away_implied",
    "lam_h", "lam_a",
]

TARGET_MAP = {"H": 0, "D": 1, "A": 2}


# ── Data loading ──────────────────────────────────────────────────────────────

async def fetch_match_rows():
    """Pull settled matches with odds from the database."""
    import os
    os.environ.setdefault("VIT_DATABASE_URL", "sqlite+aiosqlite:///./vit.db")

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text

    db_url = os.getenv("VIT_DATABASE_URL", "sqlite+aiosqlite:///./vit.db")
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    rows = []
    async with async_session() as session:
        result = await session.execute(text("""
            SELECT home_odds, draw_odds, away_odds, result
            FROM matches
            WHERE result IS NOT NULL
              AND home_odds IS NOT NULL
              AND draw_odds IS NOT NULL
              AND away_odds IS NOT NULL
        """))
        rows = result.fetchall()

    await engine.dispose()
    return rows


def build_features(rows):
    """Convert raw DB rows into a feature matrix and label vector."""
    X, y = [], []
    for row in rows:
        ho, do, ao, result = row
        ho, do, ao = float(ho), float(do), float(ao)
        if result not in TARGET_MAP:
            continue
        inv = (1 / max(1.01, ho)) + (1 / max(1.01, do)) + (1 / max(1.01, ao))
        if inv <= 0:
            continue
        hi = (1 / ho) / inv
        di = (1 / do) / inv
        ai = (1 / ao) / inv
        # Approximate Poisson lambdas from implied probabilities
        lam_h = max(0.3, -np.log(1 - hi) * 1.5)
        lam_a = max(0.3, -np.log(1 - ai) * 1.3)
        X.append([ho, do, ao, hi, di, ai, lam_h, lam_a])
        y.append(TARGET_MAP[result])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def synthetic_fallback(n: int = 2000):
    """
    Generate synthetic training data when real match rows are unavailable.
    This keeps the script functional even on a fresh database.
    """
    rng = np.random.default_rng(42)
    ho = rng.uniform(1.5, 6.0, n)
    do = rng.uniform(2.8, 4.5, n)
    ao = rng.uniform(1.5, 6.0, n)
    inv = 1 / ho + 1 / do + 1 / ao
    hi, di, ai = 1 / ho / inv, 1 / do / inv, 1 / ao / inv
    lam_h = np.clip(-np.log(1 - hi) * 1.5, 0.3, 4.0)
    lam_a = np.clip(-np.log(1 - ai) * 1.3, 0.3, 4.0)
    X = np.column_stack([ho, do, ao, hi, di, ai, lam_h, lam_a]).astype(np.float32)
    # Crude outcome: home wins when hi > ai, draw when close, else away
    diff = hi - ai
    y = np.where(diff > 0.08, 0, np.where(np.abs(diff) <= 0.08, 1, 2)).astype(np.int32)
    noise = rng.integers(0, 3, n)
    mask = rng.random(n) < 0.25
    y[mask] = noise[mask]
    return X, y


# ── Model definitions ─────────────────────────────────────────────────────────

def get_models():
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler

    try:
        from xgboost import XGBClassifier
        xgb = XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.05,
                            use_label_encoder=False, eval_metric="mlogloss",
                            random_state=42, verbosity=0)
    except ImportError:
        from sklearn.ensemble import GradientBoostingClassifier
        xgb = None
        logger.warning("xgboost not installed — skipping xgb_v1")

    scaler = StandardScaler()
    lr = LogisticRegression(max_iter=1000, C=0.5, multi_class="multinomial",
                            solver="lbfgs", random_state=42)
    rf = RandomForestClassifier(n_estimators=300, max_depth=8, min_samples_leaf=4,
                                random_state=42, n_jobs=-1)

    entries = [
        ("logistic_v1", lr, scaler),
        ("rf_v1",       rf, None),
    ]
    if xgb is not None:
        entries.append(("xgb_v1", xgb, None))
    return entries


# ── Training loop ─────────────────────────────────────────────────────────────

def train_and_save(X, y, model_key, model, scaler, feature_columns):
    from sklearn.model_selection import cross_val_score
    from sklearn.preprocessing import StandardScaler

    if scaler is not None:
        X_fit = scaler.fit_transform(X)
    else:
        X_fit = X
        scaler = None

    scores = cross_val_score(model, X_fit, y, cv=5, scoring="accuracy", n_jobs=-1)
    acc = float(scores.mean())
    logger.info(f"  {model_key}: CV accuracy = {acc:.4f} ± {scores.std():.4f}")

    model.fit(X_fit, y)

    payload = {
        "model":           model,
        "scaler":          scaler,
        "feature_columns": feature_columns,
        "training_samples": len(y),
        "version":         "1.0.0",
        "metrics": {
            "accuracy":    acc,
            "cv_std":      float(scores.std()),
        },
    }

    # Save to both directories for compatibility
    out_path = TRAINED_DIR / f"{model_key}.pkl"
    joblib.dump(payload, out_path)
    mirror_path = MODELS_DIR / f"{model_key}.pkl"
    joblib.dump(payload, mirror_path)
    logger.info(f"  ✅ Saved → {out_path} and {mirror_path}")
    return acc


# ── Entry point ───────────────────────────────────────────────────────────────

async def main():
    logger.info("=== VIT Model Training Script ===")

    logger.info("Fetching historical match data...")
    rows = []
    try:
        rows = await fetch_match_rows()
        logger.info(f"  Found {len(rows)} settled matches with odds")
    except Exception as exc:
        logger.warning(f"  DB fetch failed: {exc}")

    if len(rows) < 100:
        logger.warning(f"  Insufficient real data ({len(rows)} rows) — using synthetic fallback")
        X, y = synthetic_fallback(3000)
    else:
        X, y = build_features(rows)
        if len(X) < 100:
            logger.warning("  Too few usable rows after feature build — using synthetic fallback")
            X, y = synthetic_fallback(3000)

    logger.info(f"Training on {len(X)} samples, {X.shape[1]} features")

    results = {}
    for model_key, model, scaler in get_models():
        logger.info(f"\nTraining {model_key}...")
        try:
            acc = train_and_save(X, y, model_key, model, scaler, FEATURE_COLUMNS)
            results[model_key] = acc
        except Exception as exc:
            logger.error(f"  ❌ {model_key} failed: {exc}")

    logger.info("\n=== Training Complete ===")
    for k, acc in results.items():
        logger.info(f"  {k}: {acc:.4f}")
    logger.info(f"\nModels saved to: {TRAINED_DIR}")
    logger.info("Set USE_REAL_ML_MODELS=true and restart the app to use them.")


if __name__ == "__main__":
    asyncio.run(main())

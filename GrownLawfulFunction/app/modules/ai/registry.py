# app/modules/ai/registry.py
"""
E1 — Model Registry Service

Syncs the in-memory ModelOrchestrator state with the ModelMetadata DB table.
- bootstrap_registry()  → called at startup; inserts rows for any missing model
- sync_weights_to_orchestrator() → push DB weights into live orchestrator
- sync_orchestrator_to_db()     → pull orchestrator state back into DB
"""

import logging
from typing import Any, Dict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai.models import ModelMetadata

logger = logging.getLogger(__name__)

# Canonical spec for all 12 models (key → display metadata)
MODEL_SPECS = {
    "logistic_v1":    {"name": "LogisticRegression", "model_type": "Logistic",      "markets": ["1x2"]},
    "rf_v1":          {"name": "RandomForest",        "model_type": "RandomForest",   "markets": ["1x2", "over_under"]},
    "xgb_v1":         {"name": "XGBoost",             "model_type": "XGBoost",        "markets": ["1x2", "over_under", "btts"]},
    "poisson_v1":     {"name": "PoissonGoals",        "model_type": "Poisson",        "markets": ["1x2", "over_under"]},
    "elo_v1":         {"name": "EloRating",           "model_type": "Elo",            "markets": ["1x2"]},
    "dixon_coles_v1": {"name": "DixonColes",          "model_type": "DixonColes",     "markets": ["1x2", "over_under", "btts"]},
    "lstm_v1":        {"name": "LSTM",                "model_type": "LSTM",           "markets": ["1x2"]},
    "transformer_v1": {"name": "Transformer",         "model_type": "Transformer",    "markets": ["1x2", "over_under"]},
    "ensemble_v1":    {"name": "NeuralEnsemble",      "model_type": "NeuralEnsemble", "markets": ["1x2", "over_under", "btts"]},
    "market_v1":      {"name": "MarketImplied",       "model_type": "MarketImplied",  "markets": ["1x2"]},
    "bayes_v1":       {"name": "BayesianNet",         "model_type": "BayesianNet",    "markets": ["1x2", "btts"]},
    "hybrid_v1":      {"name": "HybridStack",         "model_type": "HybridStack",    "markets": ["1x2", "over_under", "btts"]},
}


async def bootstrap_registry(db: AsyncSession, orchestrator: Any) -> int:
    """
    Ensure every model has a row in model_metadata.
    Inserts missing rows; does NOT overwrite existing weights.
    Returns the count of newly inserted rows.
    """
    inserted = 0
    orch_meta = getattr(orchestrator, "model_meta", {})

    for key, spec in MODEL_SPECS.items():
        result = await db.execute(select(ModelMetadata).where(ModelMetadata.key == key))
        row = result.scalar_one_or_none()

        if row is None:
            # Determine initial weight and pkl status from orchestrator
            meta = orch_meta.get(key, {})
            pkl_loaded = meta.get("pkl_loaded", False)
            initial_weight = 2.0 if pkl_loaded else 1.0

            row = ModelMetadata(
                key=key,
                name=spec["name"],
                model_type=spec["model_type"],
                version="v3.1.0",
                weight=initial_weight,
                is_active=True,
                pkl_loaded=pkl_loaded,
                supported_markets=spec["markets"],
                description=f"{spec['name']} — differentiated ensemble model",
            )
            db.add(row)
            inserted += 1
            logger.info(f"[registry] Registered model: {key} (weight={initial_weight})")
        else:
            # Sync pkl_loaded status from live orchestrator
            meta = orch_meta.get(key, {})
            pkl_loaded = meta.get("pkl_loaded", False)
            if row.pkl_loaded != pkl_loaded:
                row.pkl_loaded = pkl_loaded
                if pkl_loaded and row.weight < 2.0:
                    row.weight = 2.0  # bump weight now that real weights exist
                logger.info(f"[registry] Updated pkl status for {key}: {pkl_loaded}")

    await db.commit()
    logger.info(f"[registry] Bootstrap complete — {inserted} new models registered")
    return inserted


async def get_registry(db: AsyncSession) -> list:
    """Return all ModelMetadata rows as dicts."""
    result = await db.execute(select(ModelMetadata).order_by(ModelMetadata.key))
    rows = result.scalars().all()
    return [_row_to_dict(r) for r in rows]


async def get_model_by_key(db: AsyncSession, key: str) -> ModelMetadata | None:
    result = await db.execute(select(ModelMetadata).where(ModelMetadata.key == key))
    return result.scalar_one_or_none()


async def update_model_weight(db: AsyncSession, key: str, weight: float) -> bool:
    row = await get_model_by_key(db, key)
    if row is None:
        return False
    row.weight = max(0.0, round(weight, 6))
    await db.commit()
    return True


async def sync_weights_to_orchestrator(db: AsyncSession, orchestrator: Any) -> Dict[str, float]:
    """
    Push DB weights into the live in-memory orchestrator.
    Called after weight_adjuster runs so predictions use updated weights immediately.
    """
    result = await db.execute(select(ModelMetadata).where(ModelMetadata.is_active == True))
    rows = result.scalars().all()
    synced: Dict[str, float] = {}

    for row in rows:
        if row.key in orchestrator.model_meta:
            orchestrator.model_meta[row.key]["weight"] = row.weight
            synced[row.key] = row.weight

    logger.info(f"[registry] Synced {len(synced)} model weights to orchestrator")
    return synced


def _row_to_dict(row: ModelMetadata) -> dict:
    return {
        "id":                 row.id,
        "key":                row.key,
        "name":               row.name,
        "model_type":         row.model_type,
        "version":            row.version,
        "weight":             row.weight,
        "accuracy":           row.accuracy,
        "accuracy_1x2":       row.accuracy_1x2,
        "accuracy_ou":        row.accuracy_ou,
        "brier_score":        row.brier_score,
        "log_loss":           row.log_loss,
        "predictions_total":  row.predictions_total,
        "predictions_correct": row.predictions_correct,
        "is_active":          row.is_active,
        "pkl_loaded":         row.pkl_loaded,
        "pkl_path":           row.pkl_path,
        "training_samples":   row.training_samples,
        "supported_markets":  row.supported_markets,
        "description":        row.description,
        "created_at":         row.created_at.isoformat() if row.created_at else None,
        "updated_at":         row.updated_at.isoformat() if row.updated_at else None,
    }

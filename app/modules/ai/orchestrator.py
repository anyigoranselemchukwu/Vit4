# app/modules/ai/orchestrator.py
"""
E2 — Ensemble Orchestrator Service

Wraps the existing ModelOrchestrator, applies DB weights,
and writes every prediction to the AIPredictionAudit log.
"""

import logging
import math
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai.models import AIPredictionAudit

logger = logging.getLogger(__name__)


def _entropy(h: float, d: float, a: float) -> float:
    total = 0.0
    for p in (h, d, a):
        if p > 0:
            total -= p * math.log(p)
    return total


async def generate_ai_prediction(
    features: Dict[str, Any],
    match_id: str,
    orchestrator: Any,
    db: Optional[AsyncSession] = None,
    triggered_by: str = "api",
) -> Dict[str, Any]:
    """
    E2 — Core ensemble prediction entry point.

    1. Calls the existing ModelOrchestrator.predict() which applies
       per-model algorithms and the diversity-weighted aggregation.
    2. Enriches the result with risk_score (entropy) and
       a weights snapshot from the live orchestrator.
    3. Writes the full result to the AIPredictionAudit table (E4).

    Returns the same dict shape as ModelOrchestrator.predict() with
    an additional `audit_id` field.
    """
    raw = await orchestrator.predict(features, match_id)

    preds = raw.get("predictions", {})
    individual = raw.get("individual_results", [])

    hp = preds.get("home_prob", 0.33)
    dp = preds.get("draw_prob", 0.33)
    ap = preds.get("away_prob", 0.34)

    # Risk score: entropy of final distribution (high entropy = uncertain)
    ent = _entropy(hp, dp, ap)
    max_ent = math.log(3)
    risk_score = round(ent / max_ent, 4)  # 0 = certain, 1 = maximum uncertainty

    # Weights snapshot from live orchestrator
    weights_snapshot = {
        key: meta["weight"]
        for key, meta in orchestrator.model_meta.items()
    }

    pkl_active = sum(1 for v in orchestrator._pkl_loaded.values() if v)

    # Enrich prediction dict
    preds["risk_score"] = risk_score
    preds["pkl_models_active"] = pkl_active

    audit_id = None
    if db is not None:
        try:
            home_team = features.get("home_team", "")
            away_team = features.get("away_team", "")

            audit = AIPredictionAudit(
                match_id=str(match_id),
                home_team=home_team,
                away_team=away_team,
                home_prob=hp,
                draw_prob=dp,
                away_prob=ap,
                over_25_prob=preds.get("over_25_prob"),
                btts_prob=preds.get("btts_prob"),
                confidence=preds.get("confidence", {}).get("1x2"),
                risk_score=risk_score,
                model_agreement=preds.get("model_agreement"),
                individual_results=individual,
                weights_snapshot=weights_snapshot,
                pkl_models_active=pkl_active,
                triggered_by=triggered_by,
            )
            db.add(audit)
            await db.commit()
            await db.refresh(audit)
            audit_id = audit.id
        except Exception as exc:
            logger.warning(f"[orchestrator] Audit log write failed: {exc}")
            await db.rollback()

    raw["predictions"] = preds
    raw["audit_id"] = audit_id
    return raw

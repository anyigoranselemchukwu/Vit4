# app/api/routes/history.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, delete

from app.db.database import get_db
from app.db.models import Match, Prediction, CLVEntry
from app.api.middleware.auth import verify_api_key

router = APIRouter(prefix="/history", tags=["history"], dependencies=[Depends(verify_api_key)])

CERTIFIED_EDGE_THRESHOLD = 0.05
HIGH_CONFIDENCE_EDGE_THRESHOLD = 0.02


def _format_prediction_row(row):
    return {
        "match_id": row.Match.id,
        "home_team": row.Match.home_team,
        "away_team": row.Match.away_team,
        "league": row.Match.league,
        "kickoff_time": row.Match.kickoff_time.isoformat(),
        "home_prob": row.Prediction.home_prob,
        "draw_prob": row.Prediction.draw_prob,
        "away_prob": row.Prediction.away_prob,
        "over_25_prob": row.Prediction.over_25_prob,
        "under_25_prob": row.Prediction.under_25_prob,
        "btts_prob": row.Prediction.btts_prob,
        "no_btts_prob": row.Prediction.no_btts_prob,
        "consensus_prob": row.Prediction.consensus_prob,
        "recommended_stake": row.Prediction.recommended_stake,
        "final_ev": row.Prediction.final_ev,
        "edge": row.Prediction.vig_free_edge,
        "confidence": row.Prediction.confidence,
        "bet_side": row.Prediction.bet_side,
        "entry_odds": row.Prediction.entry_odds,
        "actual_outcome": row.Match.actual_outcome,
        "clv": row.CLVEntry.clv if row.CLVEntry else None,
        "profit": row.CLVEntry.profit if row.CLVEntry else None,
        "timestamp": row.Prediction.timestamp.isoformat()
    }


@router.get("")
async def get_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    count_result = await db.execute(select(func.count()).select_from(Prediction))
    total = count_result.scalar()

    result = await db.execute(
        select(Match, Prediction, CLVEntry)
        .join(Prediction, Match.id == Prediction.match_id)
        .outerjoin(CLVEntry, Prediction.id == CLVEntry.prediction_id)
        .order_by(Prediction.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "predictions": [_format_prediction_row(r) for r in rows]
    }


@router.delete("/clear")
@router.delete("/clear-all")
async def clear_history(db: AsyncSession = Depends(get_db)):
    """
    Delete all prediction history, including match and CLV records tied to historical predictions.
    """
    await db.execute(delete(CLVEntry))
    await db.execute(delete(Prediction))
    await db.execute(delete(Match))
    await db.commit()
    return {"message": "Prediction history cleared"}


@router.get("/picks")
async def get_picks(db: AsyncSession = Depends(get_db)):
    """
    Return certified picks (edge > 5%) and high-confidence picks (edge > 2%).
    Backed by child model ratings stored in model_insights.
    """
    result = await db.execute(
        select(Match, Prediction, CLVEntry)
        .join(Prediction, Match.id == Prediction.match_id)
        .outerjoin(CLVEntry, Prediction.id == CLVEntry.prediction_id)
        .where(Prediction.vig_free_edge.isnot(None))
        .order_by(Prediction.vig_free_edge.desc())
        .limit(100)
    )
    rows = result.all()

    certified = []
    high_confidence = []

    for row in rows:
        edge = row.Prediction.vig_free_edge or 0
        insights = row.Prediction.model_insights or []

        active_models = [m for m in insights if not m.get("failed")]
        num_models = len(active_models)

        if num_models == 0:
            continue

        # Calculate per-market model agreement (consensus)
        bet_side = row.Prediction.bet_side
        side_probs = []
        if bet_side == "home":
            side_probs = [m.get("home_prob", 0) for m in active_models if m.get("home_prob") is not None]
        elif bet_side == "draw":
            side_probs = [m.get("draw_prob", 0) for m in active_models if m.get("draw_prob") is not None]
        elif bet_side == "away":
            side_probs = [m.get("away_prob", 0) for m in active_models if m.get("away_prob") is not None]

        avg_model_prob = sum(side_probs) / len(side_probs) if side_probs else 0
        model_agreement = sum(
            1 for m in active_models
            if (bet_side == "home" and (m.get("home_prob") or 0) > 0.4)
            or (bet_side == "draw" and (m.get("draw_prob") or 0) > 0.3)
            or (bet_side == "away" and (m.get("away_prob") or 0) > 0.4)
        )
        agreement_pct = round(model_agreement / num_models * 100, 1) if num_models > 0 else 0

        # Model confidence ratings per market
        avg_1x2_confidence = (
            sum(m.get("confidence", {}).get("1x2", 0.5) for m in active_models) / num_models
        ) if num_models > 0 else 0.5
        avg_ou_confidence = (
            sum(m.get("confidence", {}).get("over_under", 0.5) for m in active_models if "over_under" in m.get("supported_markets", [])) /
            max(1, sum(1 for m in active_models if "over_under" in m.get("supported_markets", [])))
        )
        avg_btts_confidence = (
            sum(m.get("confidence", {}).get("btts", 0.5) for m in active_models if "btts" in m.get("supported_markets", [])) /
            max(1, sum(1 for m in active_models if "btts" in m.get("supported_markets", [])))
        )

        pick = {
            **_format_prediction_row(row),
            "model_insights": insights,
            "num_models": num_models,
            "model_agreement_pct": agreement_pct,
            "avg_model_prob": round(avg_model_prob, 3),
            "avg_1x2_confidence": round(avg_1x2_confidence, 3),
            "avg_ou_confidence": round(avg_ou_confidence, 3),
            "avg_btts_confidence": round(avg_btts_confidence, 3),
            "pick_type": "certified" if edge >= CERTIFIED_EDGE_THRESHOLD else "high_confidence"
        }

        if edge >= CERTIFIED_EDGE_THRESHOLD:
            certified.append(pick)
        elif edge >= HIGH_CONFIDENCE_EDGE_THRESHOLD:
            high_confidence.append(pick)

    return {
        "certified_picks": certified[:20],
        "high_confidence_picks": high_confidence[:20],
        "certified_count": len(certified),
        "high_confidence_count": len(high_confidence),
        "edge_thresholds": {
            "certified": CERTIFIED_EDGE_THRESHOLD,
            "high_confidence": HIGH_CONFIDENCE_EDGE_THRESHOLD
        }
    }


@router.get("/{match_id}")
async def get_match_detail(match_id: int, db: AsyncSession = Depends(get_db)):
    """
    Return full match detail: prediction, model insights, market breakdowns, CLV.
    """
    result = await db.execute(
        select(Match, Prediction, CLVEntry)
        .join(Prediction, Match.id == Prediction.match_id)
        .outerjoin(CLVEntry, Prediction.id == CLVEntry.prediction_id)
        .where(Match.id == match_id)
    )
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail=f"Match {match_id} not found")

    insights = row.Prediction.model_insights or []
    if not insights and row.Prediction.model_weights:
        weights = row.Prediction.model_weights or {}
        insights = [
            {
                "model_name": name,
                "model_type": "Unknown",
                "model_weight": float(weight or 0),
                "supported_markets": [],
                "confidence": {"1x2": 0.5, "over_under": 0.5, "btts": 0.5},
                "latency_ms": None,
                "failed": False,
            }
            for name, weight in weights.items()
        ]
    active_models = [m for m in insights if not m.get("failed")]

    def market_breakdown(market_key, prob_fields):
        models_for_market = [m for m in active_models if market_key in m.get("supported_markets", [])]
        if not models_for_market:
            return []
        breakdown = []
        for m in models_for_market:
            probs = {f: round(m.get(f, 0) * 100, 1) for f in prob_fields if m.get(f) is not None}
            conf = m.get("confidence", {}).get(
                market_key if market_key != "1x2" else "1x2", 0.5
            )
            breakdown.append({
                "model_name": m.get("model_name"),
                "model_type": m.get("model_type"),
                "weight": m.get("model_weight", 1.0),
                "probabilities": probs,
                "confidence": round(conf, 3),
                "rating": round(conf * 10, 1),
                "latency_ms": m.get("latency_ms"),
            })
        breakdown.sort(key=lambda x: x["confidence"], reverse=True)
        return breakdown

    neural_info = None
    for m in active_models:
        if m.get("home_goals_expectation") is not None:
            neural_info = {
                "model": m.get("model_name"),
                "home_xG": round(m.get("home_goals_expectation", 0), 3),
                "away_xG": round(m.get("away_goals_expectation", 0), 3),
                "dixon_coles_rho": m.get("dixon_coles_rho"),
            }
            break

    return {
        "match": {
            "id": row.Match.id,
            "home_team": row.Match.home_team,
            "away_team": row.Match.away_team,
            "league": row.Match.league,
            "kickoff_time": row.Match.kickoff_time.isoformat(),
            "status": row.Match.status,
            "actual_outcome": row.Match.actual_outcome,
            "home_goals": row.Match.home_goals,
            "away_goals": row.Match.away_goals,
            "ft_score": (
                f"{row.Match.home_goals}-{row.Match.away_goals}"
                if row.Match.home_goals is not None and row.Match.away_goals is not None
                else None
            ),
            "is_settled": row.Match.actual_outcome is not None,
            "opening_odds": {
                "home": row.Match.opening_odds_home,
                "draw": row.Match.opening_odds_draw,
                "away": row.Match.opening_odds_away,
            }
        },
        "prediction": {
            "home_prob": row.Prediction.home_prob,
            "draw_prob": row.Prediction.draw_prob,
            "away_prob": row.Prediction.away_prob,
            "over_25_prob": row.Prediction.over_25_prob,
            "under_25_prob": row.Prediction.under_25_prob,
            "btts_prob": row.Prediction.btts_prob,
            "no_btts_prob": row.Prediction.no_btts_prob,
            "consensus_prob": row.Prediction.consensus_prob,
            "bet_side": row.Prediction.bet_side,
            "entry_odds": row.Prediction.entry_odds,
            "edge": row.Prediction.vig_free_edge,
            "recommended_stake": row.Prediction.recommended_stake,
            "confidence": row.Prediction.confidence,
            "final_ev": row.Prediction.final_ev,
            "timestamp": row.Prediction.timestamp.isoformat(),
        },
        "markets": {
            "1x2": {
                "home_prob": row.Prediction.home_prob,
                "draw_prob": row.Prediction.draw_prob,
                "away_prob": row.Prediction.away_prob,
                "model_breakdown": market_breakdown("1x2", ["home_prob", "draw_prob", "away_prob"])
            },
            "over_under": {
                "over_25_prob": row.Prediction.over_25_prob,
                "under_25_prob": row.Prediction.under_25_prob,
                "model_breakdown": market_breakdown("over_under", ["over_2_5_prob", "under_2_5_prob"])
            },
            "btts": {
                "btts_prob": row.Prediction.btts_prob,
                "no_btts_prob": row.Prediction.no_btts_prob,
                "model_breakdown": market_breakdown("btts", ["btts_prob", "no_btts_prob"])
            }
        },
        "neural_info": neural_info,
        "clv": {
            "clv": row.CLVEntry.clv if row.CLVEntry else None,
            "profit": row.CLVEntry.profit if row.CLVEntry else None,
            "closing_odds": row.CLVEntry.closing_odds if row.CLVEntry else None,
            "bet_outcome": row.CLVEntry.bet_outcome if row.CLVEntry else None,
        } if row.CLVEntry else None,
        "model_summary": {
            "total_models": len(insights),
            "active_models": len(active_models),
            "failed_models": len(insights) - len(active_models),
            "models": [
                {
                    "name": m.get("model_name"),
                    "type": m.get("model_type"),
                    "weight": m.get("model_weight", 1.0),
                    "markets": m.get("supported_markets", []),
                    "confidence_1x2": round(m.get("confidence", {}).get("1x2", 0.5), 3),
                    "confidence_ou": round(m.get("confidence", {}).get("over_under", 0.5), 3),
                    "confidence_btts": round(m.get("confidence", {}).get("btts", 0.5), 3),
                    "latency_ms": m.get("latency_ms"),
                    "failed": m.get("failed", False),
                }
                for m in insights
            ]
        }
    }

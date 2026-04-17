"""Dashboard summary endpoints."""

import logging
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import CLVEntry, Match, Prediction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def get_dashboard_summary(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_predictions = (
        await db.execute(select(func.count(Prediction.id)))
    ).scalar() or 0

    settled = (
        await db.execute(
            select(func.count(CLVEntry.id)).where(
                CLVEntry.bet_outcome.in_(["win", "loss"])
            )
        )
    ).scalar() or 0

    wins = (
        await db.execute(
            select(func.count(CLVEntry.id)).where(CLVEntry.bet_outcome == "win")
        )
    ).scalar() or 0

    accuracy = round(wins / settled, 4) if settled > 0 else 0.0

    roi_result = (
        await db.execute(select(func.sum(CLVEntry.profit)))
    ).scalar() or Decimal("0")

    active = (
        await db.execute(
            select(func.count(Match.id)).where(Match.actual_outcome.is_(None))
        )
    ).scalar() or 0

    vitcoin_balance = 0.0
    try:
        from app.modules.wallet.models import Wallet
        wallet = (
            await db.execute(
                select(Wallet).where(Wallet.user_id == current_user.id)
            )
        ).scalar_one_or_none()
        if wallet:
            vitcoin_balance = float(wallet.vitcoin_balance)
    except Exception:
        pass

    return {
        "total_predictions": total_predictions,
        "accuracy_rate": accuracy,
        "roi": float(roi_result),
        "active_matches": active,
        "wallet_balance": vitcoin_balance,
    }


@router.get("/vitcoin-price")
async def get_dashboard_vitcoin_price(db: AsyncSession = Depends(get_db)):
    try:
        from app.modules.wallet.pricing import VITCoinPricingEngine
        from app.modules.wallet.models import VITCoinPriceHistory
        engine = VITCoinPricingEngine(db)
        prices = await engine.get_current_price()
        current = float(prices.get("usd", Decimal("0.001")))

        change_24h = 0.0
        try:
            hist_q = await db.execute(
                select(VITCoinPriceHistory)
                .order_by(VITCoinPriceHistory.calculated_at.desc())
                .limit(2)
            )
            history = hist_q.scalars().all()
            if len(history) >= 2:
                prev = float(history[1].price_usd)
                if prev > 0:
                    change_24h = round((current - prev) / prev * 100, 4)
        except Exception:
            pass

        return {"price": current, "change_24h": change_24h}
    except Exception:
        return {"price": 0.001, "change_24h": 0.0}


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = 10,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Match, Prediction)
        .join(Prediction, Match.id == Prediction.match_id)
        .order_by(Prediction.timestamp.desc())
        .limit(limit)
    )
    rows = result.all()
    activity = []
    for match, pred in rows:
        activity.append({
            "id": str(pred.id),
            "type": "prediction",
            "description": f"{match.home_team} vs {match.away_team}",
            "bet_side": pred.bet_side,
            "outcome": match.actual_outcome,
            "edge": pred.vig_free_edge,
            "created_at": pred.timestamp.isoformat(),
        })
    return activity

# app/api/routes/analytics.py
# VIT Sports Intelligence Network — v2.5.0
# Analytics Suite: accuracy, ROI, CLV, model contribution, CSV/Excel export

import csv
import io
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Match, Prediction, CLVEntry, User
from app.api.middleware.auth import verify_api_key
from app.api.deps import get_current_user
from app.services.statistical_significance import StatisticalSignificance

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    dependencies=[Depends(verify_api_key)],
)

from app.config import APP_VERSION
VERSION = APP_VERSION


# ── Helpers ───────────────────────────────────────────────────────────
def _date_filter(query, model, date_from: Optional[str], date_to: Optional[str]):
    """Apply optional date range filter to a query."""
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            query = query.where(model.timestamp >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.where(model.timestamp <= dt)
        except ValueError:
            pass
    return query


# ── 1. Accuracy Dashboard ─────────────────────────────────────────────
@router.get("/accuracy")
async def get_accuracy(
    league:    Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Return prediction accuracy for settled matches (actual_outcome is set).
    Broken down by: overall, league, bet side, confidence bucket.
    """
    base_q = (
        select(Match, Prediction)
        .join(Prediction, Match.id == Prediction.match_id)
        .where(Match.actual_outcome.isnot(None))
        .where(Prediction.bet_side.isnot(None))
    )

    if league:
        base_q = base_q.where(Match.league == league)
    base_q = _date_filter(base_q, Prediction, date_from, date_to)

    result = await db.execute(base_q)
    rows   = result.all()

    if not rows:
        return {"message": "No settled predictions found", "total": 0}

    total = len(rows)
    correct = sum(
        1 for r in rows
        if r.Prediction.bet_side and r.Match.actual_outcome
        and r.Prediction.bet_side.lower() == r.Match.actual_outcome.lower()
    )
    accuracy = round(correct / total, 4) if total > 0 else 0

    # By league
    league_stats: dict = {}
    for r in rows:
        lg = r.Match.league or "unknown"
        if lg not in league_stats:
            league_stats[lg] = {"total": 0, "correct": 0}
        league_stats[lg]["total"] += 1
        if r.Prediction.bet_side and r.Match.actual_outcome:
            if r.Prediction.bet_side.lower() == r.Match.actual_outcome.lower():
                league_stats[lg]["correct"] += 1

    league_breakdown = [
        {
            "league":   lg,
            "total":    v["total"],
            "correct":  v["correct"],
            "accuracy": round(v["correct"] / v["total"], 4) if v["total"] > 0 else 0,
        }
        for lg, v in league_stats.items()
    ]
    league_breakdown.sort(key=lambda x: x["accuracy"], reverse=True)

    # By confidence bucket
    buckets = {"low": {"range": "0–60%", "total": 0, "correct": 0},
               "mid": {"range": "60–75%", "total": 0, "correct": 0},
               "high": {"range": "75%+", "total": 0, "correct": 0}}
    for r in rows:
        conf = r.Prediction.confidence or 0.5
        bk   = "high" if conf >= 0.75 else ("mid" if conf >= 0.60 else "low")
        buckets[bk]["total"] += 1
        if r.Prediction.bet_side and r.Match.actual_outcome:
            if r.Prediction.bet_side.lower() == r.Match.actual_outcome.lower():
                buckets[bk]["correct"] += 1

    for bk in buckets.values():
        bk["accuracy"] = round(bk["correct"] / bk["total"], 4) if bk["total"] > 0 else 0

    # Weekly trend (group by ISO week)
    weekly: dict = {}
    for r in rows:
        wk = r.Prediction.timestamp.strftime("%Y-W%W") if r.Prediction.timestamp else "unknown"
        if wk not in weekly:
            weekly[wk] = {"total": 0, "correct": 0}
        weekly[wk]["total"] += 1
        if r.Prediction.bet_side and r.Match.actual_outcome:
            if r.Prediction.bet_side.lower() == r.Match.actual_outcome.lower():
                weekly[wk]["correct"] += 1

    weekly_trend = sorted(
        [{"week": wk, "accuracy": round(v["correct"] / v["total"], 4), "total": v["total"]}
         for wk, v in weekly.items() if v["total"] > 0],
        key=lambda x: x["week"]
    )

    return {
        "overall":         {"total": total, "correct": correct, "accuracy": accuracy},
        "by_league":       league_breakdown,
        "by_confidence":   buckets,
        "weekly_trend":    weekly_trend,
        "version":         VERSION,
    }


# ── 2. ROI & Equity Curve ─────────────────────────────────────────────
@router.get("/roi")
async def get_roi(
    date_from:       Optional[str] = Query(None),
    date_to:         Optional[str] = Query(None),
    initial_bankroll: float         = Query(default=1000.0),
    db: AsyncSession = Depends(get_db),
):
    """
    Return ROI, P&L, max drawdown, and equity curve for settled predictions.
    """
    q = (
        select(Match, Prediction, CLVEntry)
        .join(Prediction, Match.id == Prediction.match_id)
        .outerjoin(CLVEntry, Prediction.id == CLVEntry.prediction_id)
        .where(Match.actual_outcome.isnot(None))
        .where(Prediction.bet_side.isnot(None))
        .order_by(Prediction.timestamp.asc())
    )
    q = _date_filter(q, Prediction, date_from, date_to)

    result = await db.execute(q)
    rows   = result.all()

    if not rows:
        return {"message": "No settled predictions found", "total": 0}

    bankroll      = initial_bankroll
    peak_bankroll = initial_bankroll
    max_drawdown  = 0.0
    equity_curve  = []
    total_staked  = 0.0
    total_profit  = 0.0
    wins = losses = 0

    for r in rows:
        stake_pct   = r.Prediction.recommended_stake or 0
        entry_odds  = r.Prediction.entry_odds or 2.0
        bet_side    = r.Prediction.bet_side or ""
        actual      = r.Match.actual_outcome or ""
        stake_amount = bankroll * stake_pct
        total_staked += stake_amount

        won = bet_side.lower() == actual.lower()
        profit = stake_amount * (entry_odds - 1) if won else -stake_amount

        # Use CLV profit if available and more accurate
        if r.CLVEntry and r.CLVEntry.profit is not None:
            profit = r.CLVEntry.profit

        bankroll     += profit
        total_profit += profit
        peak_bankroll = max(peak_bankroll, bankroll)
        drawdown      = (peak_bankroll - bankroll) / peak_bankroll if peak_bankroll > 0 else 0
        max_drawdown  = max(max_drawdown, drawdown)

        if won:
            wins += 1
        else:
            losses += 1

        equity_curve.append({
            "ts":       r.Prediction.timestamp.isoformat() if r.Prediction.timestamp else "",
            "bankroll": round(bankroll, 2),
            "profit":   round(profit, 2),
            "match":    f"{r.Match.home_team} vs {r.Match.away_team}",
        })

    roi = round(total_profit / total_staked, 4) if total_staked > 0 else 0

    return {
        "summary": {
            "total_bets":      len(rows),
            "wins":            wins,
            "losses":          losses,
            "win_rate":        round(wins / len(rows), 4) if rows else 0,
            "total_staked":    round(total_staked, 2),
            "total_profit":    round(total_profit, 2),
            "roi":             roi,
            "final_bankroll":  round(bankroll, 2),
            "max_drawdown":    round(max_drawdown, 4),
        },
        "equity_curve": equity_curve,
        "version":       VERSION,
    }


# ── 3. CLV Visualization ──────────────────────────────────────────────
@router.get("/clv")
async def get_clv(
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Return CLV (Closing Line Value) stats and per-match breakdown.
    Positive CLV = beating the market at entry.
    """
    q = (
        select(Match, Prediction, CLVEntry)
        .join(Prediction, Match.id == Prediction.match_id)
        .join(CLVEntry, Prediction.id == CLVEntry.prediction_id)
        .where(CLVEntry.clv.isnot(None))
        .order_by(Prediction.timestamp.asc())
    )
    q = _date_filter(q, Prediction, date_from, date_to)

    result = await db.execute(q)
    rows   = result.all()

    if not rows:
        return {"message": "No CLV data found", "total": 0}

    clv_values = [r.CLVEntry.clv for r in rows if r.CLVEntry.clv is not None]
    avg_clv    = round(sum(clv_values) / len(clv_values), 4) if clv_values else 0
    positive   = sum(1 for v in clv_values if v > 0)

    series = [
        {
            "ts":           r.Prediction.timestamp.isoformat() if r.Prediction.timestamp else "",
            "match":        f"{r.Match.home_team} vs {r.Match.away_team}",
            "bet_side":     r.Prediction.bet_side,
            "entry_odds":   r.CLVEntry.entry_odds,
            "closing_odds": r.CLVEntry.closing_odds,
            "clv":          round(r.CLVEntry.clv, 4),
            "outcome":      r.CLVEntry.bet_outcome,
        }
        for r in rows
    ]

    significance = {}
    if len(clv_values) >= 10:
        try:
            significance = StatisticalSignificance.is_statistically_significant(clv_values)
            lo, hi = StatisticalSignificance.calculate_confidence_interval(clv_values)
            significance["ci_low"]  = round(float(lo), 4)
            significance["ci_high"] = round(float(hi), 4)
        except Exception:
            pass

    return {
        "summary": {
            "total":            len(rows),
            "avg_clv":          avg_clv,
            "positive_clv_pct": round(positive / len(rows), 4) if rows else 0,
            "max_clv":          max(clv_values) if clv_values else 0,
            "min_clv":          min(clv_values) if clv_values else 0,
        },
        "statistical_significance": significance,
        "series":  series,
        "version": VERSION,
    }


# ── 4. Model Contribution ─────────────────────────────────────────────
@router.get("/model-contribution")
async def get_model_contribution(
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Breakdown of how much each of the 12 models contributed to predictions.
    Shows participation rate, avg confidence, and accuracy where available.
    """
    q = (
        select(Match, Prediction)
        .join(Prediction, Match.id == Prediction.match_id)
    )
    q = _date_filter(q, Prediction, date_from, date_to)

    result = await db.execute(q.limit(500))
    rows   = result.all()

    contribution: dict = {}

    for r in rows:
        insights = r.Prediction.model_insights or []
        actual   = r.Match.actual_outcome
        bet_side = r.Prediction.bet_side

        for m in insights:
            name = m.get("model_name") or m.get("model_type") or "unknown"
            if name not in contribution:
                contribution[name] = {
                    "model_name":   name,
                    "model_type":   m.get("model_type", ""),
                    "appearances":  0,
                    "failures":     0,
                    "total_weight": 0.0,
                    "conf_sum":     0.0,
                    "correct":      0,
                    "settled":      0,
                }
            c = contribution[name]
            c["appearances"] += 1

            if m.get("failed"):
                c["failures"] += 1
                continue

            c["total_weight"] += m.get("model_weight", 1.0)
            c["conf_sum"]     += m.get("confidence", {}).get("1x2", 0.5)

            # Accuracy where match is settled
            if actual and bet_side:
                pred_side = None
                hp = m.get("home_prob", 0)
                dp = m.get("draw_prob", 0)
                ap = m.get("away_prob", 0)
                if hp and dp and ap:
                    pred_side = max({"home": hp, "draw": dp, "away": ap}, key={"home": hp, "draw": dp, "away": ap}.get)
                if pred_side:
                    c["settled"] += 1
                    if pred_side.lower() == actual.lower():
                        c["correct"] += 1

    models_out = []
    for name, c in contribution.items():
        active = c["appearances"] - c["failures"]
        models_out.append({
            "model_name":       name,
            "model_type":       c["model_type"],
            "appearances":      c["appearances"],
            "failures":         c["failures"],
            "participation_pct": round(active / c["appearances"], 4) if c["appearances"] > 0 else 0,
            "avg_weight":       round(c["total_weight"] / active, 3) if active > 0 else 0,
            "avg_confidence":   round(c["conf_sum"] / active, 3) if active > 0 else 0,
            "accuracy":         round(c["correct"] / c["settled"], 4) if c["settled"] > 0 else None,
            "settled_count":    c["settled"],
        })

    models_out.sort(key=lambda x: x.get("accuracy") or 0, reverse=True)

    return {
        "models":      models_out,
        "total_preds": len(rows),
        "version":     VERSION,
    }


# ── 5. Export ─────────────────────────────────────────────────────────
@router.get("/export/csv")
async def export_csv(
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Export full prediction history as CSV download."""
    q = (
        select(Match, Prediction, CLVEntry)
        .join(Prediction, Match.id == Prediction.match_id)
        .outerjoin(CLVEntry, Prediction.id == CLVEntry.prediction_id)
        .order_by(Prediction.timestamp.desc())
    )
    q = _date_filter(q, Prediction, date_from, date_to)

    result = await db.execute(q.limit(10000))
    rows   = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "match_id", "home_team", "away_team", "league", "kickoff_time",
        "home_prob", "draw_prob", "away_prob", "over_25_prob", "btts_prob",
        "edge", "confidence", "bet_side", "entry_odds", "recommended_stake",
        "actual_outcome", "clv", "profit", "timestamp",
    ])

    for r in rows:
        writer.writerow([
            r.Match.id, r.Match.home_team, r.Match.away_team, r.Match.league,
            r.Match.kickoff_time.isoformat() if r.Match.kickoff_time else "",
            r.Prediction.home_prob, r.Prediction.draw_prob, r.Prediction.away_prob,
            r.Prediction.over_25_prob, r.Prediction.btts_prob,
            r.Prediction.vig_free_edge, r.Prediction.confidence,
            r.Prediction.bet_side, r.Prediction.entry_odds, r.Prediction.recommended_stake,
            r.Match.actual_outcome,
            r.CLVEntry.clv if r.CLVEntry else "",
            r.CLVEntry.profit if r.CLVEntry else "",
            r.Prediction.timestamp.isoformat() if r.Prediction.timestamp else "",
        ])

    output.seek(0)
    filename = f"vit_predictions_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── 6. Summary (single-call dashboard data) ───────────────────────────
@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    """Single endpoint returning all key metrics for the analytics dashboard."""
    total_q  = await db.execute(select(func.count()).select_from(Prediction))
    total    = total_q.scalar() or 0

    settled_q = await db.execute(
        select(func.count()).select_from(Prediction)
        .join(Match, Match.id == Prediction.match_id)
        .where(Match.actual_outcome.isnot(None))
    )
    settled  = settled_q.scalar() or 0

    clv_q = await db.execute(
        select(func.avg(CLVEntry.clv)).select_from(CLVEntry)
        .where(CLVEntry.clv.isnot(None))
    )
    avg_clv = round(float(clv_q.scalar() or 0), 4)

    edge_q = await db.execute(
        select(func.avg(Prediction.vig_free_edge)).select_from(Prediction)
        .where(Prediction.vig_free_edge.isnot(None))
        .where(Prediction.vig_free_edge > 0)
    )
    avg_edge = round(float(edge_q.scalar() or 0), 4)

    bankroll_data = {}
    try:
        from app.services.bankroll import BankrollManager
        bm = BankrollManager(db)
        await bm.load_state()
        bankroll_data = bm.bankroll.to_dict()
    except Exception:
        pass

    return {
        "total_predictions": total,
        "settled":           settled,
        "pending":           total - settled,
        "avg_clv":           avg_clv,
        "avg_edge":          avg_edge,
        "bankroll":          bankroll_data,
        "version":           VERSION,
    }


# ── 7. System Metrics (H1) ────────────────────────────────────────────
@router.get("/system")
async def get_system_metrics(db: AsyncSession = Depends(get_db)):
    """Platform-wide health metrics: predictions, users, economy, validators."""
    from datetime import timedelta

    total_preds = (await db.execute(select(func.count()).select_from(Prediction))).scalar() or 0
    total_matches = (await db.execute(select(func.count()).select_from(Match))).scalar() or 0
    settled_matches = (
        await db.execute(select(func.count()).select_from(Match).where(Match.actual_outcome.isnot(None)))
    ).scalar() or 0

    settled_preds_q = (
        select(func.count()).select_from(Prediction)
        .join(Match, Match.id == Prediction.match_id)
        .where(Match.actual_outcome.isnot(None))
        .where(Prediction.bet_side.isnot(None))
    )
    settled_preds = (await db.execute(settled_preds_q)).scalar() or 0

    correct_preds_q = (
        select(func.count()).select_from(Prediction)
        .join(Match, Match.id == Prediction.match_id)
        .where(Match.actual_outcome.isnot(None))
        .where(Prediction.bet_side.isnot(None))
        .where(func.lower(Prediction.bet_side) == func.lower(Match.actual_outcome))
    )
    correct_preds = (await db.execute(correct_preds_q)).scalar() or 0

    accuracy = round(correct_preds / settled_preds, 4) if settled_preds > 0 else 0

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    active_users = (
        await db.execute(
            select(func.count()).select_from(User)
            .where(User.last_login >= thirty_days_ago)
        )
    ).scalar() or 0

    active_validators = 0
    total_staked = 0.0
    try:
        from app.modules.blockchain.models import ValidatorProfile
        active_validators = (
            await db.execute(
                select(func.count()).select_from(ValidatorProfile)
                .where(ValidatorProfile.status == "active")
            )
        ).scalar() or 0
        staked_q = (await db.execute(select(func.sum(ValidatorProfile.stake_amount)).select_from(ValidatorProfile))).scalar()
        total_staked = float(staked_q or 0)
    except Exception:
        pass

    platform_volume = 0.0
    try:
        from app.modules.wallet.models import WalletTransaction
        vol_q = (
            await db.execute(
                select(func.sum(WalletTransaction.amount))
                .select_from(WalletTransaction)
                .where(WalletTransaction.direction == "DEBIT")
            )
        ).scalar()
        platform_volume = float(vol_q or 0)
    except Exception:
        pass

    total_profit = float((await db.execute(select(func.sum(CLVEntry.profit)).select_from(CLVEntry))).scalar() or 0)

    vitcoin_price = 0.001
    try:
        from app.modules.wallet.pricing import VITCoinPricingEngine
        engine = VITCoinPricingEngine(db)
        prices = await engine.get_current_price()
        vitcoin_price = float(prices.get("usd", 0.001))
    except Exception:
        pass

    return {
        "predictions": {
            "total": total_preds,
            "settled": settled_preds,
            "pending": total_preds - settled_preds,
            "accuracy": accuracy,
        },
        "matches": {
            "total": total_matches,
            "settled": settled_matches,
            "active": total_matches - settled_matches,
        },
        "users": {
            "total": total_users,
            "active_30d": active_users,
            "validators": active_validators,
        },
        "economy": {
            "total_staked_vit": total_staked,
            "platform_volume": platform_volume,
            "vitcoin_price_usd": vitcoin_price,
            "total_profit": total_profit,
        },
        "version": VERSION,
    }


# ── 8. Validator Leaderboard (H3) ─────────────────────────────────────
@router.get("/leaderboard/validators")
async def get_validator_leaderboard(
    sort_by: str = Query(default="trust_score", enum=["trust_score", "accuracy", "stake", "predictions"]),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Validator leaderboard ranked by trust score, accuracy, stake, or prediction volume."""
    try:
        from app.modules.blockchain.models import ValidatorProfile, ValidatorPrediction

        q = (
            select(ValidatorProfile, User)
            .join(User, User.id == ValidatorProfile.user_id)
        )
        if sort_by == "trust_score":
            q = q.order_by(ValidatorProfile.trust_score.desc())
        elif sort_by == "accuracy":
            q = q.order_by(ValidatorProfile.accurate_predictions.desc())
        elif sort_by == "stake":
            q = q.order_by(ValidatorProfile.stake_amount.desc())
        elif sort_by == "predictions":
            q = q.order_by(ValidatorProfile.total_predictions.desc())

        result = await db.execute(q.limit(limit))
        rows = result.all()

        leaderboard = []
        for rank, (vp, user) in enumerate(rows, 1):
            acc = round(vp.accurate_predictions / vp.total_predictions, 4) if vp.total_predictions > 0 else 0
            reward_q = await db.execute(
                select(func.sum(ValidatorPrediction.reward_earned))
                .where(ValidatorPrediction.validator_id == vp.id)
            )
            total_reward = float(reward_q.scalar() or 0)
            leaderboard.append({
                "rank": rank,
                "username": user.username,
                "trust_score": float(vp.trust_score),
                "stake_amount": float(vp.stake_amount),
                "accuracy_rate": acc,
                "total_predictions": vp.total_predictions,
                "accurate_predictions": vp.accurate_predictions,
                "influence_score": float(vp.influence_score),
                "reward_earned": total_reward,
                "status": vp.status,
                "joined_at": vp.joined_at.isoformat() if vp.joined_at else None,
            })

        return {"leaderboard": leaderboard, "sort_by": sort_by, "total": len(leaderboard), "version": VERSION}
    except Exception as e:
        logger.warning(f"Validator leaderboard error: {e}")
        return {"leaderboard": [], "sort_by": sort_by, "total": 0, "version": VERSION}


# ── 9. User Leaderboard (H2) ──────────────────────────────────────────
@router.get("/leaderboard/users")
async def get_user_leaderboard(
    sort_by: str = Query(default="roi", enum=["roi", "profit", "win_rate", "bets"]),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """User performance leaderboard from staking history."""
    try:
        from app.modules.blockchain.models import UserStake

        q = await db.execute(
            select(
                UserStake.user_id,
                func.count(UserStake.id).label("total_bets"),
                func.sum(UserStake.stake_amount).label("total_staked"),
                func.sum(UserStake.payout_amount).label("total_payout"),
                func.count(
                    case((UserStake.payout_amount > UserStake.stake_amount, 1))
                ).label("wins"),
            ).group_by(UserStake.user_id)
        )
        rows = q.all()

        if not rows:
            return {"leaderboard": [], "sort_by": sort_by, "total": 0, "version": VERSION}

        leaderboard = []
        for row in rows:
            user_q = await db.execute(select(User).where(User.id == row.user_id))
            user = user_q.scalar_one_or_none()
            if not user:
                continue
            total_staked = float(row.total_staked or 0)
            total_payout = float(row.total_payout or 0)
            profit = total_payout - total_staked
            roi = round(profit / total_staked, 4) if total_staked > 0 else 0
            wins = int(row.wins or 0)
            total_bets = int(row.total_bets or 0)
            win_rate = round(wins / total_bets, 4) if total_bets > 0 else 0
            leaderboard.append({
                "username": user.username,
                "total_bets": total_bets,
                "wins": wins,
                "win_rate": win_rate,
                "total_staked": round(total_staked, 2),
                "profit": round(profit, 2),
                "roi": roi,
            })

        if sort_by == "roi":
            leaderboard.sort(key=lambda x: x["roi"], reverse=True)
        elif sort_by == "profit":
            leaderboard.sort(key=lambda x: x["profit"], reverse=True)
        elif sort_by == "win_rate":
            leaderboard.sort(key=lambda x: x["win_rate"], reverse=True)
        elif sort_by == "bets":
            leaderboard.sort(key=lambda x: x["total_bets"], reverse=True)

        for i, entry in enumerate(leaderboard[:limit], 1):
            entry["rank"] = i

        return {"leaderboard": leaderboard[:limit], "sort_by": sort_by, "total": len(leaderboard), "version": VERSION}
    except Exception as e:
        logger.warning(f"User leaderboard error: {e}")
        return {"leaderboard": [], "sort_by": sort_by, "total": 0, "version": VERSION}


# ── 10. My Performance (H2) ───────────────────────────────────────────
@router.get("/user/me")
async def get_my_analytics(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Current user's personal performance analytics from staking history."""
    try:
        from app.modules.blockchain.models import UserStake

        agg_q = await db.execute(
            select(
                func.count(UserStake.id).label("total_bets"),
                func.sum(UserStake.stake_amount).label("total_staked"),
                func.sum(UserStake.payout_amount).label("total_payout"),
                func.count(
                    case((UserStake.payout_amount > UserStake.stake_amount, 1))
                ).label("wins"),
            ).where(UserStake.user_id == current_user.id)
        )
        row = agg_q.one_or_none()
        total_staked = float(row.total_staked or 0) if row else 0
        total_payout = float(row.total_payout or 0) if row else 0
        profit = total_payout - total_staked
        total_bets = int(row.total_bets or 0) if row else 0
        wins = int(row.wins or 0) if row else 0

        recent_q = await db.execute(
            select(UserStake)
            .where(UserStake.user_id == current_user.id)
            .order_by(UserStake.id.desc())
            .limit(20)
        )
        recent_stakes = recent_q.scalars().all()

        side_dist: dict = {}
        for s in recent_stakes:
            side = s.prediction or "unknown"
            if side not in side_dist:
                side_dist[side] = {"count": 0, "staked": 0.0}
            side_dist[side]["count"] += 1
            side_dist[side]["staked"] = round(side_dist[side]["staked"] + float(s.stake_amount), 2)

        return {
            "total_bets": total_bets,
            "wins": wins,
            "losses": total_bets - wins,
            "win_rate": round(wins / total_bets, 4) if total_bets > 0 else 0,
            "total_staked": round(total_staked, 2),
            "total_payout": round(total_payout, 2),
            "profit": round(profit, 2),
            "roi": round(profit / total_staked, 4) if total_staked > 0 else 0,
            "side_distribution": [
                {"side": k, "count": v["count"], "staked": v["staked"]} for k, v in side_dist.items()
            ],
            "version": VERSION,
        }
    except Exception as e:
        logger.warning(f"User analytics error: {e}")
        return {
            "total_bets": 0, "wins": 0, "losses": 0, "win_rate": 0,
            "total_staked": 0, "total_payout": 0, "profit": 0, "roi": 0,
            "side_distribution": [], "version": VERSION,
        }

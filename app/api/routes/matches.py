from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.db.database import get_db
from app.db.models import Match, Prediction

router = APIRouter(prefix="/matches", tags=["matches"])


def _fmt_match(m: Match, pred: Optional[Prediction] = None) -> dict:
    odds_home = m.opening_odds_home or m.closing_odds_home
    odds_draw = m.opening_odds_draw or m.closing_odds_draw
    odds_away = m.opening_odds_away or m.closing_odds_away

    edge = None
    if pred and pred.vig_free_edge is not None:
        edge = pred.vig_free_edge
    elif odds_home and pred and pred.home_prob:
        market_prob = 1.0 / odds_home
        edge = round(float(pred.home_prob) - market_prob, 4)

    return {
        "match_id": m.id,
        "external_id": m.external_id,
        "home_team": m.home_team,
        "away_team": m.away_team,
        "league": m.league or "unknown",
        "kickoff_time": m.kickoff_time.isoformat() if m.kickoff_time else None,
        "status": m.status or "upcoming",
        "odds": {
            "home": float(odds_home) if odds_home else None,
            "draw": float(odds_draw) if odds_draw else None,
            "away": float(odds_away) if odds_away else None,
        },
        "home_goals": m.home_goals,
        "away_goals": m.away_goals,
        "actual_outcome": m.actual_outcome,
        "home_prob": float(pred.home_prob) if pred and pred.home_prob else None,
        "draw_prob": float(pred.draw_prob) if pred and pred.draw_prob else None,
        "away_prob": float(pred.away_prob) if pred and pred.away_prob else None,
        "over_25_prob": float(pred.over_25_prob) if pred and pred.over_25_prob else None,
        "btts_prob": float(pred.btts_prob) if pred and pred.btts_prob else None,
        "confidence": float(pred.confidence) if pred and pred.confidence else None,
        "bet_side": pred.bet_side if pred else None,
        "edge": edge,
        "entry_odds": float(pred.entry_odds) if pred and pred.entry_odds else None,
    }


@router.get("/upcoming")
async def get_upcoming_matches(
    league: Optional[str] = Query(None),
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    future = now + timedelta(days=days)

    q = select(Match).where(
        and_(
            Match.kickoff_time >= now,
            Match.kickoff_time <= future,
            or_(Match.status == "upcoming", Match.status == "SCHEDULED", Match.status.is_(None)),
        )
    )
    if league:
        q = q.where(Match.league.ilike(f"%{league}%"))
    q = q.order_by(Match.kickoff_time).limit(limit)

    result = await db.execute(q)
    matches = result.scalars().all()

    match_ids = [m.id for m in matches]
    preds_map: dict = {}
    if match_ids:
        pred_q = await db.execute(
            select(Prediction)
            .where(Prediction.match_id.in_(match_ids))
            .order_by(Prediction.timestamp.desc())
        )
        for p in pred_q.scalars().all():
            if p.match_id not in preds_map:
                preds_map[p.match_id] = p

    return {
        "count": len(matches),
        "matches": [_fmt_match(m, preds_map.get(m.id)) for m in matches],
    }


@router.get("/explore")
async def explore_matches(
    league: Optional[str] = Query(None),
    min_edge: float = Query(0.0, ge=0),
    min_confidence: float = Query(0.0, ge=0, le=1),
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    future = now + timedelta(days=days)

    q = (
        select(Match, Prediction)
        .outerjoin(Prediction, Match.id == Prediction.match_id)
        .where(Match.kickoff_time >= now)
        .where(Match.kickoff_time <= future)
        .where(or_(Match.status == "upcoming", Match.status == "SCHEDULED", Match.status.is_(None)))
    )
    if league:
        q = q.where(Match.league.ilike(f"%{league}%"))
    q = q.order_by(Match.kickoff_time, Prediction.timestamp.desc())

    result = await db.execute(q)
    rows = result.all()

    seen: set = set()
    formatted = []
    for row in rows:
        m, pred = row.Match, row.Prediction
        if m.id in seen:
            continue
        seen.add(m.id)

        conf = float(pred.confidence or 0) if pred else 0.0
        edge_val = 0.0
        if pred and pred.vig_free_edge is not None:
            edge_val = float(pred.vig_free_edge)

        if conf < min_confidence or edge_val < min_edge:
            continue

        formatted.append(_fmt_match(m, pred))

    return {"count": len(formatted), "matches": formatted[:limit]}


@router.get("/live")
async def get_live_matches(db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    q = select(Match).where(
        and_(
            Match.kickoff_time <= now,
            Match.kickoff_time >= now - timedelta(hours=3),
            Match.actual_outcome.is_(None),
            or_(Match.status == "live", Match.status == "IN_PLAY", Match.status == "LIVE"),
        )
    ).order_by(Match.kickoff_time.desc()).limit(20)

    result = await db.execute(q)
    matches = result.scalars().all()

    return {
        "count": len(matches),
        "matches": [_fmt_match(m) for m in matches],
    }


@router.get("/recent")
async def get_recent_matches(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Match, Prediction)
        .join(Prediction, Match.id == Prediction.match_id)
        .order_by(Prediction.timestamp.desc())
        .limit(limit)
    )
    result = await db.execute(q)
    rows = result.all()

    seen: set = set()
    formatted = []
    for row in rows:
        m, pred = row.Match, row.Prediction
        if m.id in seen:
            continue
        seen.add(m.id)
        formatted.append(_fmt_match(m, pred))

    return {"count": len(formatted), "matches": formatted}


@router.get("/{match_id}")
async def get_match_detail(match_id: int, db: AsyncSession = Depends(get_db)):
    match_q = await db.execute(select(Match).where(Match.id == match_id))
    match = match_q.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    pred_q = await db.execute(
        select(Prediction)
        .where(Prediction.match_id == match_id)
        .order_by(Prediction.timestamp.desc())
    )
    preds = pred_q.scalars().all()
    latest_pred = preds[0] if preds else None

    return {
        "match": _fmt_match(match, latest_pred),
        "predictions_count": len(preds),
        "predictions": [
            {
                "home_prob": float(p.home_prob or 0),
                "draw_prob": float(p.draw_prob or 0),
                "away_prob": float(p.away_prob or 0),
                "bet_side": p.bet_side,
                "confidence": float(p.confidence or 0),
                "edge": float(p.vig_free_edge or 0),
                "entry_odds": float(p.entry_odds or 0),
                "recommended_stake": float(p.recommended_stake or 0),
                "timestamp": p.timestamp.isoformat() if p.timestamp else None,
            }
            for p in preds[:10]
        ],
    }

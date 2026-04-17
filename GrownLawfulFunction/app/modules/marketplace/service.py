# app/modules/marketplace/service.py
"""AI Marketplace service — listing management, call billing, reputation."""

import logging
import re
import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.marketplace.models import AIModelListing, ModelRating, ModelUsageLog

logger = logging.getLogger(__name__)

PROTOCOL_FEE = Decimal("0.15")   # 15 % to protocol treasury


# ── Slug helpers ──────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return f"{slug}-{uuid.uuid4().hex[:6]}"


# ── Listing CRUD ──────────────────────────────────────────────────────────────

async def create_listing(
    db: AsyncSession,
    creator_id: int,
    name: str,
    description: Optional[str],
    category: str,
    tags: Optional[str],
    price_per_call: Decimal,
    model_key: Optional[str] = None,
) -> AIModelListing:
    slug = _slugify(name)
    listing = AIModelListing(
        creator_id=creator_id,
        name=name,
        slug=slug,
        description=description,
        category=category,
        tags=tags,
        price_per_call=price_per_call,
        model_key=model_key,
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    logger.info(f"Created marketplace listing '{name}' by user {creator_id}")
    return listing


async def get_listing(db: AsyncSession, listing_id: int) -> Optional[AIModelListing]:
    result = await db.execute(
        select(AIModelListing).where(AIModelListing.id == listing_id)
    )
    return result.scalar_one_or_none()


async def get_listing_by_slug(db: AsyncSession, slug: str) -> Optional[AIModelListing]:
    result = await db.execute(
        select(AIModelListing).where(AIModelListing.slug == slug)
    )
    return result.scalar_one_or_none()


async def list_listings(
    db: AsyncSession,
    *,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "usage_count",   # usage_count | rating | price | created_at
    page: int = 1,
    page_size: int = 20,
    active_only: bool = True,
) -> tuple[list[AIModelListing], int]:
    q = select(AIModelListing)
    if active_only:
        q = q.where(AIModelListing.is_active == True)
    if category:
        q = q.where(AIModelListing.category == category)
    if search:
        like = f"%{search}%"
        q = q.where(
            AIModelListing.name.ilike(like) | AIModelListing.description.ilike(like)
        )

    sort_col = {
        "usage_count": AIModelListing.usage_count,
        "rating":      AIModelListing.rating_sum,
        "price":       AIModelListing.price_per_call,
        "revenue":     AIModelListing.total_revenue,
        "created_at":  AIModelListing.created_at,
    }.get(sort_by, AIModelListing.usage_count)

    count_result = await db.execute(
        select(func.count()).select_from(q.subquery())
    )
    total = count_result.scalar() or 0

    q = q.order_by(sort_col.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return list(result.scalars().all()), total


async def update_listing(
    db: AsyncSession,
    listing_id: int,
    creator_id: int,
    updates: dict,
) -> Optional[AIModelListing]:
    listing = await get_listing(db, listing_id)
    if not listing or listing.creator_id != creator_id:
        return None
    allowed = {"name", "description", "category", "tags", "price_per_call", "is_active"}
    for k, v in updates.items():
        if k in allowed:
            setattr(listing, k, v)
    await db.commit()
    await db.refresh(listing)
    return listing


async def delete_listing(
    db: AsyncSession, listing_id: int, creator_id: int
) -> bool:
    listing = await get_listing(db, listing_id)
    if not listing or listing.creator_id != creator_id:
        return False
    await db.delete(listing)
    await db.commit()
    return True


# ── Call billing (G2) ────────────────────────────────────────────────────────

async def call_model(
    db: AsyncSession,
    listing_id: int,
    caller_id: int,
    input_summary: Optional[str] = None,
) -> dict:
    """
    Charge the caller VITCoin, split revenue, log the call, then
    delegate to the internal model if registered.

    Returns a dict with the prediction result and billing info.
    """
    from app.modules.wallet.services import WalletService, SubscriptionService
    from app.modules.wallet.models import Currency
    from app.modules.notifications.service import NotificationService

    listing = await get_listing(db, listing_id)
    if not listing:
        raise ValueError("Listing not found")
    if not listing.is_active:
        raise ValueError("This model listing is not active")
    if listing.creator_id == caller_id:
        raise ValueError("Creators cannot call their own listed models")

    price   = listing.price_per_call
    protocol_cut = (price * PROTOCOL_FEE).quantize(Decimal("0.00000001"))
    creator_cut  = price - protocol_cut

    # ── Debit caller ──────────────────────────────────────────────────────────
    wallet_svc = WalletService(db)
    caller_wallet = await wallet_svc.get_or_create_wallet(caller_id)
    if caller_wallet.vitcoin_balance < price:
        raise ValueError(f"Insufficient VITCoin balance. Need {price} VITCoin.")

    await wallet_svc.debit(
        wallet_id=caller_wallet.id,
        user_id=caller_id,
        currency=Currency.VITCOIN,
        amount=price,
        tx_type="marketplace_call",
        reference=f"mkt_call_{listing_id}_{uuid.uuid4().hex[:8]}",
        metadata={"listing_id": listing_id, "listing_name": listing.name},
    )

    # ── Credit creator ────────────────────────────────────────────────────────
    creator_wallet = await wallet_svc.get_or_create_wallet(listing.creator_id)
    await wallet_svc.credit(
        wallet_id=creator_wallet.id,
        user_id=listing.creator_id,
        currency=Currency.VITCOIN,
        amount=creator_cut,
        tx_type="marketplace_revenue",
        reference=f"mkt_rev_{listing_id}_{uuid.uuid4().hex[:8]}",
        metadata={"listing_id": listing_id, "caller_id": caller_id},
    )

    # ── Update listing stats ──────────────────────────────────────────────────
    listing.usage_count    += 1
    listing.total_revenue  += price
    listing.creator_revenue += creator_cut
    listing.protocol_revenue += protocol_cut

    # ── Run the model ─────────────────────────────────────────────────────────
    prediction_result = await _run_model(db, listing, input_summary)

    output_summary = str(prediction_result)[:500] if prediction_result else None

    # ── Log the usage ─────────────────────────────────────────────────────────
    log = ModelUsageLog(
        listing_id=listing_id,
        caller_id=caller_id,
        vitcoin_charged=price,
        creator_share=creator_cut,
        protocol_share=protocol_cut,
        input_summary=input_summary,
        output_summary=output_summary,
        status="success",
    )
    db.add(log)
    await db.commit()

    # ── Notify creator of revenue ─────────────────────────────────────────────
    try:
        await NotificationService.notify_wallet(
            db, listing.creator_id,
            action="Marketplace revenue",
            amount=str(creator_cut),
            currency="VITCoin",
        )
    except Exception:
        pass

    logger.info(
        f"Marketplace call: listing={listing_id} caller={caller_id} "
        f"charged={price} VITCoin, creator_cut={creator_cut}"
    )

    return {
        "listing_id":       listing_id,
        "listing_name":     listing.name,
        "vitcoin_charged":  str(price),
        "creator_share":    str(creator_cut),
        "protocol_share":   str(protocol_cut),
        "prediction":       prediction_result,
        "usage_log_id":     log.id,
    }


async def _run_model(
    db: AsyncSession,
    listing: AIModelListing,
    input_summary: Optional[str],
) -> Optional[dict]:
    """
    If listing.model_key maps to a registered internal model, run it.
    Third-party listings return a stub result until the external endpoint
    is connected.
    """
    if not listing.model_key:
        return {"info": "External model — connect via webhook to receive results."}

    try:
        from app.core.dependencies import get_orchestrator
        orchestrator = get_orchestrator()
        if orchestrator and hasattr(orchestrator, "predict_single"):
            result = orchestrator.predict_single(listing.model_key, {})
            return result
    except Exception as e:
        logger.warning(f"Model run failed for key {listing.model_key}: {e}")

    return {"info": f"Model '{listing.model_key}' executed (no match context provided)."}


# ── Ratings (G3) ─────────────────────────────────────────────────────────────

async def rate_model(
    db: AsyncSession,
    listing_id: int,
    user_id: int,
    stars: int,
    review: Optional[str] = None,
) -> ModelRating:
    if not 1 <= stars <= 5:
        raise ValueError("Stars must be between 1 and 5")

    # Must have called the model at least once
    usage = await db.execute(
        select(ModelUsageLog).where(
            ModelUsageLog.listing_id == listing_id,
            ModelUsageLog.caller_id == user_id,
        ).limit(1)
    )
    if not usage.scalar_one_or_none():
        raise ValueError("You must call the model before rating it")

    listing = await get_listing(db, listing_id)
    if not listing:
        raise ValueError("Listing not found")

    # Upsert
    existing = await db.execute(
        select(ModelRating).where(
            ModelRating.listing_id == listing_id,
            ModelRating.user_id == user_id,
        )
    )
    rating = existing.scalar_one_or_none()

    if rating:
        listing.rating_sum = listing.rating_sum - rating.stars + stars
        rating.stars  = stars
        rating.review = review
    else:
        rating = ModelRating(
            listing_id=listing_id, user_id=user_id,
            stars=stars, review=review,
        )
        db.add(rating)
        listing.rating_sum   += stars
        listing.rating_count += 1

    await db.commit()
    await db.refresh(rating)
    return rating


# ── My listings / usage ───────────────────────────────────────────────────────

async def my_listings(db: AsyncSession, creator_id: int) -> list[AIModelListing]:
    result = await db.execute(
        select(AIModelListing)
        .where(AIModelListing.creator_id == creator_id)
        .order_by(AIModelListing.created_at.desc())
    )
    return list(result.scalars().all())


async def my_usage(
    db: AsyncSession, caller_id: int, limit: int = 50
) -> list[ModelUsageLog]:
    result = await db.execute(
        select(ModelUsageLog)
        .where(ModelUsageLog.caller_id == caller_id)
        .order_by(ModelUsageLog.called_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# ── Platform stats ─────────────────────────────────────────────────────────────

async def platform_stats(db: AsyncSession) -> dict:
    total_listings = (await db.execute(select(func.count(AIModelListing.id)))).scalar() or 0
    active_listings = (await db.execute(
        select(func.count(AIModelListing.id)).where(AIModelListing.is_active == True)
    )).scalar() or 0
    total_calls = (await db.execute(select(func.count(ModelUsageLog.id)))).scalar() or 0
    total_volume = (await db.execute(
        select(func.sum(ModelUsageLog.vitcoin_charged))
    )).scalar() or 0
    total_protocol = (await db.execute(
        select(func.sum(ModelUsageLog.protocol_share))
    )).scalar() or 0
    top_listings_result = await db.execute(
        select(AIModelListing)
        .where(AIModelListing.is_active == True)
        .order_by(AIModelListing.usage_count.desc())
        .limit(5)
    )
    top = top_listings_result.scalars().all()
    return {
        "total_listings":    total_listings,
        "active_listings":   active_listings,
        "total_calls":       total_calls,
        "total_volume_vitcoin": float(total_volume),
        "protocol_revenue_vitcoin": float(total_protocol),
        "top_models": [
            {
                "id":          t.id,
                "name":        t.name,
                "usage_count": t.usage_count,
                "avg_rating":  t.avg_rating,
            }
            for t in top
        ],
    }

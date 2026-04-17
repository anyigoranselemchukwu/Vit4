# app/modules/marketplace/routes.py
"""AI Marketplace REST API — Module G."""

import logging
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_admin
from app.db.database import get_db
from app.db.models import User
from app.modules.marketplace import service as svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class ListingCreate(BaseModel):
    name:           str              = Field(..., min_length=3, max_length=128)
    description:    Optional[str]   = None
    category:       str              = Field(default="prediction")
    tags:           Optional[str]   = None
    price_per_call: Decimal          = Field(default=Decimal("1.0"), ge=0)
    model_key:      Optional[str]   = None


class ListingUpdate(BaseModel):
    name:           Optional[str]    = None
    description:    Optional[str]   = None
    category:       Optional[str]   = None
    tags:           Optional[str]   = None
    price_per_call: Optional[Decimal] = None
    is_active:      Optional[bool]  = None


class RateModel(BaseModel):
    stars:  int             = Field(..., ge=1, le=5)
    review: Optional[str]  = None


class CallModel(BaseModel):
    input_summary: Optional[str] = Field(None, max_length=500)


def _fmt_listing(l) -> dict:
    return {
        "id":              l.id,
        "creator_id":      l.creator_id,
        "name":            l.name,
        "slug":            l.slug,
        "description":     l.description,
        "category":        l.category,
        "tags":            l.tags,
        "price_per_call":  str(l.price_per_call),
        "model_key":       l.model_key,
        "usage_count":     l.usage_count,
        "avg_rating":      l.avg_rating,
        "rating_count":    l.rating_count,
        "total_revenue":   str(l.total_revenue),
        "creator_revenue": str(l.creator_revenue),
        "is_active":       l.is_active,
        "is_verified":     l.is_verified,
        "created_at":      l.created_at.isoformat() if l.created_at else None,
    }


# ── Marketplace endpoints ──────────────────────────────────────────────────────

@router.get("/models", summary="Browse marketplace listings")
async def browse_listings(
    category:  Optional[str] = None,
    search:    Optional[str] = None,
    sort_by:   str = Query(default="usage_count", enum=["usage_count", "rating", "price", "revenue", "created_at"]),
    page:      int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db:        AsyncSession = Depends(get_db),
    _:         User = Depends(get_current_user),
):
    listings, total = await svc.list_listings(
        db, category=category, search=search,
        sort_by=sort_by, page=page, page_size=page_size,
    )
    return {
        "items":      [_fmt_listing(l) for l in listings],
        "total":      total,
        "page":       page,
        "page_size":  page_size,
        "pages":      (total + page_size - 1) // page_size if page_size else 1,
    }


@router.post("/models", summary="List a new AI model", status_code=201)
async def create_listing(
    body:           ListingCreate,
    db:             AsyncSession = Depends(get_db),
    current_user:   User = Depends(get_current_user),
):
    listing = await svc.create_listing(
        db,
        creator_id=current_user.id,
        name=body.name,
        description=body.description,
        category=body.category,
        tags=body.tags,
        price_per_call=body.price_per_call,
        model_key=body.model_key,
    )
    return _fmt_listing(listing)


@router.get("/models/{listing_id}", summary="Get listing details")
async def get_listing(
    listing_id: int,
    db:         AsyncSession = Depends(get_db),
    _:          User = Depends(get_current_user),
):
    listing = await svc.get_listing(db, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return _fmt_listing(listing)


@router.patch("/models/{listing_id}", summary="Update your listing")
async def update_listing(
    listing_id:   int,
    body:         ListingUpdate,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    listing = await svc.update_listing(db, listing_id, current_user.id, updates)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found or not yours")
    return _fmt_listing(listing)


@router.delete("/models/{listing_id}", summary="Remove your listing")
async def delete_listing(
    listing_id:   int,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok = await svc.delete_listing(db, listing_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Listing not found or not yours")
    return {"deleted": True}


@router.post("/models/{listing_id}/call", summary="Call a listed model (pays VITCoin)")
async def call_model(
    listing_id:   int,
    body:         CallModel,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = await svc.call_model(
            db,
            listing_id=listing_id,
            caller_id=current_user.id,
            input_summary=body.input_summary,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/models/{listing_id}/rate", summary="Rate a model you've used")
async def rate_model(
    listing_id:   int,
    body:         RateModel,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        rating = await svc.rate_model(
            db,
            listing_id=listing_id,
            user_id=current_user.id,
            stars=body.stars,
            review=body.review,
        )
        return {
            "id":         rating.id,
            "listing_id": rating.listing_id,
            "stars":      rating.stars,
            "review":     rating.review,
            "created_at": rating.created_at.isoformat() if rating.created_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-listings", summary="My listed models")
async def my_listings(
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listings = await svc.my_listings(db, current_user.id)
    return [_fmt_listing(l) for l in listings]


@router.get("/my-usage", summary="My model call history")
async def my_usage(
    limit: int = Query(default=50, ge=1, le=200),
    db:    AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = await svc.my_usage(db, current_user.id, limit=limit)
    return [
        {
            "id":              log.id,
            "listing_id":      log.listing_id,
            "vitcoin_charged": str(log.vitcoin_charged),
            "creator_share":   str(log.creator_share),
            "protocol_share":  str(log.protocol_share),
            "input_summary":   log.input_summary,
            "output_summary":  log.output_summary,
            "status":          log.status,
            "called_at":       log.called_at.isoformat() if log.called_at else None,
        }
        for log in logs
    ]


@router.get("/stats", summary="Platform marketplace statistics")
async def marketplace_stats(
    db: AsyncSession = Depends(get_db),
    _:  User = Depends(get_current_user),
):
    return await svc.platform_stats(db)


# ── Admin endpoints ────────────────────────────────────────────────────────────

@router.patch("/admin/models/{listing_id}/verify", summary="Admin: verify a listing")
async def admin_verify(
    listing_id: int,
    db:         AsyncSession = Depends(get_db),
    _:          User = Depends(get_current_admin),
):
    listing = await svc.get_listing(db, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing.is_verified = True
    await db.commit()
    return {"verified": True, "listing_id": listing_id}


@router.patch("/admin/models/{listing_id}/suspend", summary="Admin: suspend a listing")
async def admin_suspend(
    listing_id: int,
    db:         AsyncSession = Depends(get_db),
    _:          User = Depends(get_current_admin),
):
    listing = await svc.get_listing(db, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing.is_active = False
    await db.commit()
    return {"suspended": True, "listing_id": listing_id}

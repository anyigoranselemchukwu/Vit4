# app/api/routes/subscription.py
# VIT Sports Intelligence — Subscription Plans & Feature Gating
# Modular payment-ready architecture (Stripe integration ready)

import hashlib
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import UserSubscription, AuditLog

router = APIRouter(prefix="/subscription", tags=["subscription"])

# ── Plan Definitions ─────────────────────────────────────────────────────────
PLANS = {
    "free": {
        "name": "free",
        "display_name": "Free",
        "price_monthly": 0.0,
        "price_yearly": 0.0,
        "prediction_limit_daily": 5,
        "features": {
            "predictions": True,
            "basic_history": True,
            "advanced_analytics": False,
            "ai_insights": False,
            "accumulator_builder": False,
            "model_breakdown": False,
            "telegram_alerts": False,
            "bankroll_tools": False,
            "csv_upload": False,
            "priority_support": False,
        },
        "description": "Get started with basic predictions",
        "limits": {
            "predictions_per_day": 5,
            "history_rows": 20,
        }
    },
    "pro": {
        "name": "pro",
        "display_name": "Pro",
        "price_monthly": 19.99,
        "price_yearly": 179.99,
        "prediction_limit_daily": 50,
        "features": {
            "predictions": True,
            "basic_history": True,
            "advanced_analytics": True,
            "ai_insights": True,
            "accumulator_builder": True,
            "model_breakdown": True,
            "telegram_alerts": False,
            "bankroll_tools": True,
            "csv_upload": True,
            "priority_support": False,
        },
        "description": "Full access to AI insights and analytics",
        "limits": {
            "predictions_per_day": 50,
            "history_rows": 500,
        }
    },
    "elite": {
        "name": "elite",
        "display_name": "Elite",
        "price_monthly": 49.99,
        "price_yearly": 449.99,
        "prediction_limit_daily": None,
        "features": {
            "predictions": True,
            "basic_history": True,
            "advanced_analytics": True,
            "ai_insights": True,
            "accumulator_builder": True,
            "model_breakdown": True,
            "telegram_alerts": True,
            "bankroll_tools": True,
            "csv_upload": True,
            "priority_support": True,
        },
        "description": "Unlimited everything + Telegram alerts + priority support",
        "limits": {
            "predictions_per_day": None,
            "history_rows": None,
        }
    }
}


def _hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


def get_plan(plan_name: str) -> dict:
    return PLANS.get(plan_name, PLANS["free"])


async def get_user_plan(api_key: str, db: AsyncSession) -> dict:
    """Return the full plan definition for a given API key."""
    if not api_key:
        return PLANS["free"]
    key_hash = _hash_api_key(api_key)
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.api_key_hash == key_hash)
    )
    sub = result.scalar_one_or_none()
    if not sub or sub.status != "active":
        return PLANS["free"]
    return PLANS.get(sub.plan_name, PLANS["free"])


async def require_feature(feature: str, api_key: str, db: AsyncSession):
    """Raise 403 if the user's plan doesn't include a feature."""
    plan = await get_user_plan(api_key, db)
    if not plan["features"].get(feature, False):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "feature_gated",
                "feature": feature,
                "current_plan": plan["name"],
                "upgrade_to": "pro" if plan["name"] == "free" else "elite",
                "message": f"'{feature}' requires a {('Pro' if plan['name'] == 'free' else 'Elite')} plan. Upgrade to unlock.",
            }
        )


# ── Schemas ────────────────────────────────────────────────────────────────
class UpgradePlanRequest(BaseModel):
    plan: str
    payment_token: Optional[str] = None  # Stripe token (future)


class AdminSetPlanRequest(BaseModel):
    api_key_target: str
    plan: str


# ── Routes ────────────────────────────────────────────────────────────────
@router.get("/plans")
async def list_plans():
    """Public: list all subscription plans."""
    return {"plans": list(PLANS.values())}


@router.get("/my-plan")
async def get_my_plan(request: Request, db: AsyncSession = Depends(get_db)):
    """Return current user's plan details."""
    api_key = request.headers.get("x-api-key", "")
    plan = await get_user_plan(api_key, db)

    key_hash = _hash_api_key(api_key) if api_key else None
    sub = None
    if key_hash:
        result = await db.execute(
            select(UserSubscription).where(UserSubscription.api_key_hash == key_hash)
        )
        sub = result.scalar_one_or_none()

    return {
        "plan": plan,
        "subscription": {
            "status": sub.status if sub else "none",
            "period_end": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
            "stripe_customer_id": sub.stripe_customer_id if sub else None,
        } if sub else None,
        "usage": {
            "predictions_today": sub.prediction_count_today if sub else 0,
            "limit_today": plan["limits"]["predictions_per_day"],
        }
    }


@router.post("/upgrade")
async def upgrade_plan(
    body: UpgradePlanRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Upgrade plan. Currently supports direct plan assignment.
    When payment_token is provided, this is the Stripe integration hook.
    """
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {body.plan}")

    api_key = request.headers.get("x-api-key", "")
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required to manage subscription")

    key_hash = _hash_api_key(api_key)

    result = await db.execute(
        select(UserSubscription).where(UserSubscription.api_key_hash == key_hash)
    )
    sub = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if body.payment_token:
        # TODO: Stripe integration — charge card and get subscription_id
        # stripe_sub = await stripe_client.create_subscription(body.payment_token, body.plan)
        # sub.stripe_subscription_id = stripe_sub.id
        # sub.stripe_customer_id = stripe_sub.customer
        pass

    if sub:
        sub.plan_name = body.plan
        sub.status = "active"
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=30)
    else:
        sub = UserSubscription(
            api_key_hash=key_hash,
            plan_name=body.plan,
            status="active",
            current_period_start=now,
            current_period_end=now + timedelta(days=30),
        )
        db.add(sub)

    audit = AuditLog(
        action="subscription_upgrade",
        actor=key_hash[:8] + "...",
        resource="subscription",
        details={"plan": body.plan, "has_payment_token": bool(body.payment_token)},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "plan": PLANS[body.plan],
        "message": f"Successfully upgraded to {PLANS[body.plan]['display_name']} plan.",
        "payment_integration": "stripe_ready",
    }


@router.post("/admin/set-plan")
async def admin_set_plan(
    body: AdminSetPlanRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint: manually set a plan for any API key."""
    admin_key = os.getenv("API_KEY", "")
    req_key = request.headers.get("x-api-key", "")
    if admin_key and req_key != admin_key:
        raise HTTPException(status_code=403, detail="Admin access required")

    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {body.plan}")

    key_hash = _hash_api_key(body.api_key_target)
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.api_key_hash == key_hash)
    )
    sub = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if sub:
        sub.plan_name = body.plan
        sub.status = "active"
        sub.current_period_end = now + timedelta(days=365)
    else:
        sub = UserSubscription(
            api_key_hash=key_hash,
            plan_name=body.plan,
            status="active",
            current_period_start=now,
            current_period_end=now + timedelta(days=365),
        )
        db.add(sub)

    audit = AuditLog(
        action="admin_set_plan",
        actor="admin",
        resource="subscription",
        details={"target_key_hash": key_hash[:8] + "...", "plan": body.plan},
        ip_address=request.client.host if request.client else None,
        status="success",
    )
    db.add(audit)
    await db.commit()
    return {"success": True, "plan": body.plan}

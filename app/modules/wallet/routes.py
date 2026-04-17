# app/modules/wallet/routes.py
"""User wallet API endpoints."""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.api.deps import get_current_user
from app.modules.wallet.services import WalletService, WithdrawalService, SubscriptionService
from app.modules.wallet.pricing import VITCoinPricingEngine
from app.modules.wallet.models import (
    Currency, WalletSubscriptionPlan, WalletTransaction, WithdrawalRequest,
    VITCoinPriceHistory, PlatformConfig,
)

router = APIRouter(prefix="/api/wallet", tags=["Wallet"])


# ── Request / Response schemas ─────────────────────────────────────────

class DepositInitiateRequest(BaseModel):
    currency: str = Field(..., description="NGN, USD, USDT, PI, VITCoin")
    amount: float = Field(..., gt=0)
    method: str = Field(..., description="paystack, stripe, crypto, pi")


class DepositVerifyRequest(BaseModel):
    reference: str
    currency: str


class ConvertRequest(BaseModel):
    from_currency: str
    to_currency: str
    amount: float = Field(..., gt=0)


class WithdrawRequest(BaseModel):
    currency: str
    amount: float = Field(..., gt=0)
    destination: str
    destination_type: str = Field(..., description="bank_account, usdt_address, pi_wallet, paypal")


class SubscribeRequest(BaseModel):
    plan_id: str
    currency: str


class WalletResponse(BaseModel):
    ngn_balance: float
    usd_balance: float
    usdt_balance: float
    pi_balance: float
    vitcoin_balance: float
    is_frozen: bool
    kyc_verified: bool


# ── Endpoints ──────────────────────────────────────────────────────────

@router.get("/me", response_model=WalletResponse)
async def get_my_wallet(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's wallet balances."""
    service = WalletService(db)
    wallet = await service.get_or_create_wallet(current_user.id)
    return WalletResponse(
        ngn_balance=float(wallet.ngn_balance),
        usd_balance=float(wallet.usd_balance),
        usdt_balance=float(wallet.usdt_balance),
        pi_balance=float(wallet.pi_balance),
        vitcoin_balance=float(wallet.vitcoin_balance),
        is_frozen=wallet.is_frozen,
        kyc_verified=wallet.kyc_verified,
    )


@router.get("/transactions")
async def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    transaction_type: Optional[str] = None,
    currency: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated transaction history."""
    service = WalletService(db)
    currency_filter = Currency(currency) if currency else None
    total, transactions = await service.get_transaction_history(
        user_id=current_user.id,
        limit=limit,
        offset=(page - 1) * limit,
        transaction_type=Currency(transaction_type) if transaction_type else None,
        currency=currency_filter,
        status=status,
        date_from=date_from,
        date_to=date_to,
    )
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "transactions": [
            {
                "id": t.id,
                "type": t.type,
                "currency": t.currency,
                "amount": float(t.amount),
                "direction": t.direction,
                "status": t.status,
                "reference": t.reference,
                "fee_amount": float(t.fee_amount),
                "created_at": t.created_at.isoformat(),
            }
            for t in transactions
        ],
    }


@router.post("/deposit/initiate")
async def initiate_deposit(
    request: DepositInitiateRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initiate a deposit (returns payment link or address)."""
    import uuid as _uuid
    service = WalletService(db)
    await service.get_or_create_wallet(current_user.id)
    ref = f"DEP-{current_user.id}-{_uuid.uuid4().hex[:8].upper()}"
    return {
        "status": "pending",
        "reference": ref,
        "payment_link": "https://paystack.com/pay/vit-sports",
        "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
        "currency": request.currency,
        "amount": request.amount,
        "method": request.method,
    }


@router.post("/deposit/verify")
async def verify_deposit(
    request: DepositVerifyRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify a completed deposit."""
    return {
        "status": "confirmed",
        "amount": 100.00,
        "currency": request.currency,
        "reference": request.reference,
    }


@router.post("/convert")
async def convert_currency(
    request: ConvertRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Convert between currencies."""
    try:
        from_cur = Currency(request.from_currency)
        to_cur = Currency(request.to_currency)
    except ValueError:
        raise HTTPException(400, "Invalid currency")

    service = WalletService(db)
    wallet = await service.get_or_create_wallet(current_user.id)

    result = await db.execute(select(PlatformConfig).where(PlatformConfig.key == "conversion_fee_pct"))
    fee_config = result.scalar_one_or_none()
    fee_pct = Decimal(str(fee_config.value.get("value", 1.5))) if fee_config else Decimal("1.5")

    try:
        debit_tx, credit_tx, converted_amount = await service.convert_currency(
            wallet_id=wallet.id,
            user_id=current_user.id,
            from_currency=from_cur,
            to_currency=to_cur,
            amount=Decimal(str(request.amount)),
            conversion_fee_pct=fee_pct,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    await db.commit()
    updated = await service.get_or_create_wallet(current_user.id)
    return {
        "from_currency": request.from_currency,
        "to_currency": request.to_currency,
        "from_amount": request.amount,
        "to_amount": float(converted_amount),
        "fee": float(debit_tx.fee_amount),
        "fee_percent": float(fee_pct),
        "new_balances": {
            "ngn": float(updated.ngn_balance),
            "usd": float(updated.usd_balance),
            "usdt": float(updated.usdt_balance),
            "pi": float(updated.pi_balance),
            "vitcoin": float(updated.vitcoin_balance),
        },
    }


@router.post("/withdraw")
async def withdraw(
    request: WithdrawRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Request a withdrawal."""
    try:
        currency = Currency(request.currency)
    except ValueError:
        raise HTTPException(400, "Invalid currency")

    wallet_service = WalletService(db)
    withdrawal_service = WithdrawalService(db, wallet_service)
    wallet = await wallet_service.get_or_create_wallet(current_user.id)

    result = await db.execute(select(PlatformConfig).where(PlatformConfig.key == "auto_withdrawal_limits"))
    limits_config = result.scalar_one_or_none()
    role = getattr(current_user, "role", "viewer")
    if limits_config:
        auto_approve_limit = Decimal(str(limits_config.value.get(role, 0)))
    else:
        auto_approve_limit = Decimal("0")

    try:
        wr = await withdrawal_service.create_withdrawal_request(
            user_id=current_user.id,
            wallet_id=wallet.id,
            currency=currency,
            amount=Decimal(str(request.amount)),
            destination=request.destination,
            destination_type=request.destination_type,
            auto_approve_limit=auto_approve_limit,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    await db.commit()
    return {
        "request_id": str(wr.id),
        "status": wr.status,
        "estimated_processing": "24-48 hours" if wr.status == "pending" else "immediate",
        "amount": float(wr.amount),
        "net_amount": float(wr.net_amount),
        "fee": float(wr.fee_amount),
    }


@router.get("/withdraw/status/{request_id}")
async def get_withdrawal_status(
    request_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get status of a withdrawal request."""
    result = await db.execute(
        select(WithdrawalRequest).where(
            WithdrawalRequest.id == request_id,
            WithdrawalRequest.user_id == current_user.id,
        )
    )
    withdrawal = result.scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(404, "Withdrawal request not found")
    return {
        "request_id": str(withdrawal.id),
        "status": withdrawal.status,
        "amount": float(withdrawal.amount),
        "net_amount": float(withdrawal.net_amount),
        "fee": float(withdrawal.fee_amount),
        "requested_at": withdrawal.requested_at.isoformat(),
        "processed_at": withdrawal.processed_at.isoformat() if withdrawal.processed_at else None,
    }


@router.post("/subscribe")
async def subscribe(
    request: SubscribeRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Subscribe to a wallet plan."""
    try:
        currency = Currency(request.currency)
    except ValueError:
        raise HTTPException(400, "Invalid currency")

    result = await db.execute(
        select(WalletSubscriptionPlan).where(
            WalletSubscriptionPlan.id == request.plan_id,
            WalletSubscriptionPlan.is_active == True,
        )
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(404, "Plan not found or inactive")

    price_map = {
        "NGN": plan.price_ngn, "USD": plan.price_usd,
        "USDT": plan.price_usdt, "PI": plan.price_pi,
        "VITCoin": plan.price_vitcoin,
    }
    price = price_map.get(request.currency)
    if not price or price <= 0:
        raise HTTPException(400, "Plan not available in this currency")

    wallet_service = WalletService(db)
    subscription_service = SubscriptionService(db, wallet_service)
    wallet = await wallet_service.get_or_create_wallet(current_user.id)

    try:
        sub_result = await subscription_service.subscribe(
            user_id=current_user.id, wallet_id=wallet.id,
            plan_id=plan.id, currency=currency, price=price,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    await db.commit()
    return {
        "subscription_id": sub_result["subscription_id"],
        "plan_name": plan.name,
        "currency": request.currency,
        "amount": float(price),
        "expires_at": sub_result["expires_at"].isoformat(),
        "auto_renew": True,
    }


@router.get("/plans")
async def list_plans(db: AsyncSession = Depends(get_db)):
    """List all active subscription plans."""
    result = await db.execute(
        select(WalletSubscriptionPlan).where(WalletSubscriptionPlan.is_active == True)
    )
    plans = result.scalars().all()
    return [
        {
            "id": p.id, "name": p.name, "description": p.description,
            "features": p.features,
            "price_ngn": float(p.price_ngn), "price_usd": float(p.price_usd),
            "price_usdt": float(p.price_usdt), "price_pi": float(p.price_pi),
            "price_vitcoin": float(p.price_vitcoin),
            "duration_days": p.duration_days,
        }
        for p in plans
    ]


@router.get("/vitcoin-price")
async def get_vitcoin_price(db: AsyncSession = Depends(get_db)):
    """Get current VITCoin price."""
    pricing = VITCoinPricingEngine(db)
    prices = await pricing.get_current_price()

    result = await db.execute(
        select(VITCoinPriceHistory).order_by(VITCoinPriceHistory.calculated_at.desc()).limit(1)
    )
    last = result.scalar_one_or_none()
    next_update = (last.calculated_at + timedelta(hours=6)).isoformat() if last else None

    return {
        "price_usd": float(prices["usd"]),
        "price_ngn": float(prices["ngn"]),
        "price_usdt": float(prices["usdt"]),
        "price_pi": float(prices["pi"]),
        "circulating_supply": float(await pricing.get_circulating_supply()),
        "rolling_revenue_usd": float(await pricing.get_rolling_revenue()),
        "calculated_at": last.calculated_at.isoformat() if last else None,
        "next_update_at": next_update,
    }

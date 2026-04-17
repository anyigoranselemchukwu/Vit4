# app/wallet/webhooks.py

import hmac
import hashlib
import os
from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.db.database import get_db
from app.wallet.models import Transaction, Wallet
from app.wallet.constants import TransactionTypeEnum

router = APIRouter()


# ============================================
# HELPERS
# ============================================

async def credit_wallet(db: AsyncSession, tx: Transaction):
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == tx.user_id)
    )
    wallet = result.scalar_one()

    field = f"{tx.currency.value.lower()}_balance"
    setattr(wallet, field, getattr(wallet, field) + tx.amount)

    tx.status = "confirmed"
    tx.processed_at = datetime.utcnow()

    await db.commit()


# ============================================
# PAYSTACK WEBHOOK
# ============================================

@router.post("/paystack")
async def paystack_webhook(request: Request, db: AsyncSession = get_db()):
    body = await request.body()
    signature = request.headers.get("x-paystack-signature")

    secret = os.getenv("PAYSTACK_WEBHOOK_SECRET")

    computed = hmac.new(
        secret.encode(),
        body,
        hashlib.sha512
    ).hexdigest()

    if computed != signature:
        raise HTTPException(400, "Invalid signature")

    payload = await request.json()

    event = payload.get("event")

    if event == "charge.success":
        reference = payload["data"]["reference"]

        result = await db.execute(
            select(Transaction).where(Transaction.reference == reference)
        )
        tx = result.scalar_one_or_none()

        if tx and tx.status != "confirmed":
            await credit_wallet(db, tx)

    return {"status": "ok"}


# ============================================
# STRIPE WEBHOOK
# ============================================

@router.post("/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = get_db()):
    payload = await request.json()

    event_type = payload.get("type")

    if event_type == "payment_intent.succeeded":
        reference = payload["data"]["object"]["id"]

        result = await db.execute(
            select(Transaction).where(Transaction.reference == reference)
        )
        tx = result.scalar_one_or_none()

        if tx and tx.status != "confirmed":
            await credit_wallet(db, tx)

    return {"status": "ok"}


# ============================================
# USDT WEBHOOK (INTERNAL LISTENER)
# ============================================

@router.post("/usdt")
async def usdt_webhook(data: dict, db: AsyncSession = get_db()):
    tx_hash = data.get("tx_hash")
    amount = data.get("amount")
    confirmations = data.get("confirmations")

    min_conf = int(os.getenv("USDT_MIN_CONFIRMATIONS", 3))

    if confirmations < min_conf:
        return {"status": "waiting_confirmations"}

    result = await db.execute(
        select(Transaction).where(Transaction.reference == tx_hash)
    )
    tx = result.scalar_one_or_none()

    if tx and tx.status != "confirmed":
        await credit_wallet(db, tx)

    return {"status": "confirmed"}


# ============================================
# PI NETWORK WEBHOOK
# ============================================

@router.post("/pi")
async def pi_webhook(data: dict, db: AsyncSession = get_db()):
    reference = data.get("payment_id")
    approved = data.get("approved")

    if not approved:
        return {"status": "not_approved"}

    result = await db.execute(
        select(Transaction).where(Transaction.reference == reference)
    )
    tx = result.scalar_one_or_none()

    if tx and tx.status != "confirmed":
        await credit_wallet(db, tx)

    return {"status": "confirmed"}
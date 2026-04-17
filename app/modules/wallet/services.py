# app/modules/wallet/services.py
"""Wallet business logic and transaction handling."""

import logging
import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.modules.wallet.models import (
    Wallet, WalletTransaction, WalletSubscriptionPlan, WalletUserSubscription,
    Currency, WithdrawalRequest,
)

logger = logging.getLogger(__name__)


class WalletService:
    """Core wallet operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_wallet(self, user_id: int) -> Wallet:
        result = await self.db.execute(select(Wallet).where(Wallet.user_id == user_id))
        wallet = result.scalar_one_or_none()
        if not wallet:
            wallet = Wallet(user_id=user_id)
            self.db.add(wallet)
            await self.db.flush()
            logger.info(f"Created wallet for user {user_id}")
        return wallet

    async def get_balance(self, wallet_id: str, currency: Currency) -> Decimal:
        result = await self.db.execute(select(Wallet).where(Wallet.id == wallet_id))
        wallet = result.scalar_one_or_none()
        if not wallet:
            return Decimal("0.00000000")
        balance_map = {
            Currency.NGN: wallet.ngn_balance,
            Currency.USD: wallet.usd_balance,
            Currency.USDT: wallet.usdt_balance,
            Currency.PI: wallet.pi_balance,
            Currency.VITCOIN: wallet.vitcoin_balance,
        }
        return balance_map.get(currency, Decimal("0.00000000"))

    async def credit(
        self,
        wallet_id: str,
        user_id: int,
        currency: Currency,
        amount: Decimal,
        tx_type: str,
        reference: Optional[str] = None,
        metadata: Optional[Dict] = None,
        fee_amount: Decimal = Decimal("0.00000000"),
        fee_currency: Optional[str] = None,
    ) -> WalletTransaction:
        if amount <= 0:
            raise ValueError("Amount must be positive")
        result = await self.db.execute(select(Wallet).where(Wallet.id == wallet_id).with_for_update())
        wallet = result.scalar_one_or_none()
        if not wallet:
            raise ValueError(f"Wallet {wallet_id} not found")
        if wallet.is_frozen:
            raise ValueError("Wallet is frozen")
        balance_attr = f"{currency.value.lower()}_balance"
        setattr(wallet, balance_attr, getattr(wallet, balance_attr) + amount)
        tx = WalletTransaction(
            user_id=user_id, wallet_id=wallet_id,
            type=tx_type, currency=currency.value,
            amount=amount, direction="credit", status="confirmed",
            reference=reference, fee_amount=fee_amount,
            fee_currency=fee_currency,
            tx_metadata=metadata, processed_at=datetime.utcnow(),
        )
        self.db.add(tx)
        await self.db.flush()
        logger.info(f"Credited {amount} {currency.value} to wallet {wallet_id}")
        return tx

    async def debit(
        self,
        wallet_id: str,
        user_id: int,
        currency: Currency,
        amount: Decimal,
        tx_type: str,
        reference: Optional[str] = None,
        metadata: Optional[Dict] = None,
        fee_amount: Decimal = Decimal("0.00000000"),
        fee_currency: Optional[str] = None,
    ) -> WalletTransaction:
        if amount <= 0:
            raise ValueError("Amount must be positive")
        result = await self.db.execute(select(Wallet).where(Wallet.id == wallet_id).with_for_update())
        wallet = result.scalar_one_or_none()
        if not wallet:
            raise ValueError(f"Wallet {wallet_id} not found")
        if wallet.is_frozen:
            raise ValueError("Wallet is frozen")
        balance_attr = f"{currency.value.lower()}_balance"
        current = getattr(wallet, balance_attr)
        if current < amount:
            raise ValueError(f"Insufficient {currency.value} balance")
        setattr(wallet, balance_attr, current - amount)
        tx = WalletTransaction(
            user_id=user_id, wallet_id=wallet_id,
            type=tx_type, currency=currency.value,
            amount=amount, direction="debit", status="confirmed",
            reference=reference, fee_amount=fee_amount,
            fee_currency=fee_currency,
            tx_metadata=metadata, processed_at=datetime.utcnow(),
        )
        self.db.add(tx)
        await self.db.flush()
        logger.info(f"Debited {amount} {currency.value} from wallet {wallet_id}")
        return tx

    async def convert_currency(
        self,
        wallet_id: str,
        user_id: int,
        from_currency: Currency,
        to_currency: Currency,
        amount: Decimal,
        conversion_fee_pct: Decimal,
    ) -> Tuple[WalletTransaction, WalletTransaction, Decimal]:
        if from_currency == to_currency:
            raise ValueError("Cannot convert same currency")
        debit_tx = await self.debit(
            wallet_id=wallet_id, user_id=user_id,
            currency=from_currency, amount=amount, tx_type="conversion",
        )
        rate = Decimal("1.0")
        fee = amount * (conversion_fee_pct / Decimal("100"))
        converted_amount = (amount * rate) - fee
        credit_tx = await self.credit(
            wallet_id=wallet_id, user_id=user_id,
            currency=to_currency, amount=converted_amount, tx_type="conversion",
            fee_amount=fee, fee_currency=from_currency.value,
            metadata={
                "from_currency": from_currency.value,
                "to_currency": to_currency.value,
                "original_amount": float(amount),
                "converted_amount": float(converted_amount),
                "rate": float(rate),
                "fee_pct": float(conversion_fee_pct),
            },
        )
        return debit_tx, credit_tx, converted_amount

    async def get_transaction_history(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        transaction_type: Optional[Currency] = None,
        currency: Optional[Currency] = None,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> Tuple[int, list]:
        query = select(WalletTransaction).where(WalletTransaction.user_id == user_id)
        if transaction_type:
            query = query.where(WalletTransaction.type == transaction_type.value)
        if currency:
            query = query.where(WalletTransaction.currency == currency.value)
        if status:
            query = query.where(WalletTransaction.status == status)
        if date_from:
            query = query.where(WalletTransaction.created_at >= date_from)
        if date_to:
            query = query.where(WalletTransaction.created_at <= date_to)
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar_one()
        query = query.order_by(WalletTransaction.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        return total, result.scalars().all()


class WithdrawalService:
    """Withdrawal request handling."""

    def __init__(self, db: AsyncSession, wallet_service: WalletService):
        self.db = db
        self.wallet_service = wallet_service

    async def create_withdrawal_request(
        self,
        user_id: int,
        wallet_id: str,
        currency: Currency,
        amount: Decimal,
        destination: str,
        destination_type: str,
        auto_approve_limit: Decimal,
    ) -> WithdrawalRequest:
        balance = await self.wallet_service.get_balance(wallet_id, currency)
        if balance < amount:
            raise ValueError(f"Insufficient {currency.value} balance")
        fee_amount = Decimal("0.00")
        net_amount = amount - fee_amount
        auto_approved = amount <= auto_approve_limit
        status = "auto_approved" if auto_approved else "pending"
        request = WithdrawalRequest(
            user_id=user_id, wallet_id=wallet_id,
            currency=currency.value, amount=amount,
            fee_amount=fee_amount, net_amount=net_amount,
            destination=destination, destination_type=destination_type,
            status=status, auto_approved=auto_approved,
        )
        self.db.add(request)
        await self.db.flush()
        if auto_approved:
            await self.wallet_service.debit(
                wallet_id=wallet_id, user_id=user_id,
                currency=currency, amount=amount, tx_type="withdrawal",
                metadata={"withdrawal_request_id": str(request.id)},
                fee_amount=fee_amount, fee_currency=currency.value,
            )
            request.processed_at = datetime.utcnow()
            request.status = "processed"
        logger.info(f"Created withdrawal request {request.id} for user {user_id}")
        return request


class SubscriptionService:
    """Subscription management."""

    def __init__(self, db: AsyncSession, wallet_service: WalletService):
        self.db = db
        self.wallet_service = wallet_service

    async def subscribe(
        self,
        user_id: int,
        wallet_id: str,
        plan_id: str,
        currency: Currency,
        price: Decimal,
    ) -> dict:
        transaction = await self.wallet_service.debit(
            wallet_id=wallet_id, user_id=user_id,
            currency=currency, amount=price, tx_type="subscription",
        )
        now = datetime.utcnow()
        subscription = WalletUserSubscription(
            user_id=user_id, plan_id=plan_id,
            currency_paid=currency.value, amount_paid=price,
            started_at=now, expires_at=now + timedelta(days=30),
            auto_renew=True, status="active",
            renewal_tx_id=transaction.id,
        )
        self.db.add(subscription)
        await self.db.flush()
        logger.info(f"User {user_id} subscribed to plan {plan_id}")
        return {
            "subscription_id": str(subscription.id),
            "transaction_id": str(transaction.id),
            "expires_at": subscription.expires_at,
        }

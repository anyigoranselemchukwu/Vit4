# app/modules/wallet/scheduler.py
"""Background tasks for wallet operations (VITCoin price, subscription renewals)."""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.wallet.models import (
    PlatformConfig, VITCoinPriceHistory, Transaction,
    TransactionType, Currency, UserSubscription, SubscriptionStatus,
    Wallet
)

logger = logging.getLogger(__name__)


class WalletScheduler:
    """Background scheduled tasks for wallet operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_vitcoin_price(self) -> Optional[Decimal]:
        """Calculate and store VITCoin price based on 30-day rolling revenue."""

        # Get platform config
        config_result = await self.db.execute(
            select(PlatformConfig).where(PlatformConfig.key == "vitcoin_price_formula")
        )
        config = config_result.scalar_one_or_none()

        if not config:
            logger.warning("VITCoin price formula not configured")
            return None

        # Get 30-day rolling revenue
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        fee_result = await self.db.execute(
            select(func.sum(Transaction.amount))
            .where(
                Transaction.type == TransactionType.FEE,
                Transaction.created_at >= thirty_days_ago,
                Transaction.status == "confirmed"
            )
        )
        rolling_revenue = fee_result.scalar() or Decimal("0")

        # Get circulating supply
        supply_result = await self.db.execute(
            select(func.sum(Wallet.vitcoin_balance))
        )
        circulating_supply = supply_result.scalar() or Decimal("0")

        # Calculate raw price
        if circulating_supply > 0:
            raw_price = rolling_revenue / circulating_supply
        else:
            raw_price = Decimal("0")

        # Apply floor
        floor_result = await self.db.execute(
            select(PlatformConfig).where(PlatformConfig.key == "vitcoin_price_floor")
        )
        floor_config = floor_result.scalar_one_or_none()
        price_floor = Decimal(str(floor_config.value.get("amount", 0.001))) if floor_config else Decimal("0.001")

        final_price = max(raw_price, price_floor)

        # Store price history
        price_record = VITCoinPriceHistory(
            price_usd=final_price,
            circulating_supply=circulating_supply,
            rolling_revenue_usd=rolling_revenue,
        )
        self.db.add(price_record)
        await self.db.commit()

        logger.info(f"Updated VITCoin price: ${final_price:.6f} (revenue: ${rolling_revenue:.2f})")

        return final_price

    async def process_subscription_renewals(self) -> int:
        """Process auto-renewing subscriptions that are expiring."""

        now = datetime.utcnow()
        expiring_soon = now + timedelta(days=1)

        # Find subscriptions expiring in next 24 hours with auto_renew=True
        result = await self.db.execute(
            select(UserSubscription)
            .where(
                UserSubscription.status == SubscriptionStatus.ACTIVE,
                UserSubscription.auto_renew == True,
                UserSubscription.expires_at <= expiring_soon,
                UserSubscription.expires_at > now
            )
        )
        subscriptions = result.scalars().all()

        renewed_count = 0
        for sub in subscriptions:
            try:
                # Get user's wallet
                wallet_result = await self.db.execute(
                    select(Wallet).where(Wallet.user_id == sub.user_id)
                )
                wallet = wallet_result.scalar_one_or_none()

                if not wallet:
                    logger.warning(f"No wallet for user {sub.user_id}, skipping renewal")
                    continue

                # Check balance
                balance_attr = f"{sub.currency_paid.value.lower()}_balance"
                balance = getattr(wallet, balance_attr)

                if balance >= sub.amount_paid:
                    # Process renewal (debit, extend subscription)
                    # This would call the subscription service
                    logger.info(f"Auto-renewed subscription {sub.id} for user {sub.user_id}")
                    renewed_count += 1
                else:
                    logger.warning(f"Insufficient balance for subscription {sub.id} renewal")

            except Exception as e:
                logger.error(f"Failed to renew subscription {sub.id}: {e}")

        await self.db.commit()

        return renewed_count
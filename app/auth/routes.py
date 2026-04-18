# app/auth/routes.py
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import User
from app.modules.wallet.models import Wallet
from app.auth.jwt_utils import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


# ── Schemas ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("username")
    @classmethod
    def username_clean(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    role: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Helpers ───────────────────────────────────────────────────────────

def _is_first_user() -> bool:
    """If no admin exists yet, the first registered user becomes admin."""
    return False  # Checked per-request below


# ── Endpoints ─────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing_email = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing_email.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    existing_username = await db.execute(select(User).where(User.username == body.username))
    if existing_username.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")

    # First user ever becomes admin
    user_count = await db.execute(select(User))
    is_first = user_count.first() is None

    user = User(
        email=body.email.lower(),
        username=body.username,
        hashed_password=hash_password(body.password),
        role="admin" if is_first else "user",
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()  # assigns user.id without committing

    # Auto-create wallet with 100 VITCoin onboarding bonus
    wallet = Wallet(
        id=str(uuid.uuid4()),
        user_id=user.id,
        vitcoin_balance=Decimal("100.00000000"),
    )
    db.add(wallet)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        username=user.username,
        role=user.role,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        username=user.username,
        role=user.role,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    new_refresh = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        user_id=user.id,
        username=user.username,
        role=user.role,
    )


@router.get("/me")
async def me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.core.roles import get_permissions_for_admin_role
    admin_role = getattr(user, "admin_role", None)
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "admin_role": admin_role,
        "subscription_tier": getattr(user, "subscription_tier", "viewer") or "viewer",
        "is_banned": getattr(user, "is_banned", False),
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at,
        "last_login": user.last_login,
        "permissions": get_permissions_for_admin_role(admin_role) if admin_role else [],
    }

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.merchant import Merchant
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    session: AsyncSession = Depends(get_db),
):
    """
    Register a new merchant and owner account.
    Atomically creates the merchant organization and its root administrator.
    """
    user, token = await AuthService.register(session, data)
    user_resp = AuthService.format_user_response(user, business_name=data.resolved_business_name)
    return TokenResponse(
        token=token,
        access_token=token,
        token_type="bearer",
        user=user_resp,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    session: AsyncSession = Depends(get_db),
):
    """
    Authenticate merchant credentials and issue a signed JWT access token.
    """
    user, token = await AuthService.login(session, data)
    merchant = await session.get(Merchant, user.merchant_id)
    business_name = merchant.business_name if merchant else "Merchant"
    user_resp = AuthService.format_user_response(user, business_name=business_name)

    return TokenResponse(
        token=token,
        access_token=token,
        token_type="bearer",
        user=user_resp,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieve authenticated user profile and merchant organization details.
    """
    merchant = await session.get(Merchant, current_user.merchant_id)
    business_name = merchant.business_name if merchant else "Merchant"
    return AuthService.format_user_response(current_user, business_name=business_name)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Invalidate session (client-side token removal & audit recording).
    """
    return {"success": True, "message": "Successfully logged out."}

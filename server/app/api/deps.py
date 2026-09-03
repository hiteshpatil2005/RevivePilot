import uuid
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.merchant import Merchant

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency that extracts the Bearer JWT token, validates it,
    loads the User model, checks status, and enforces authentication.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed user ID in token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or disabled.",
        )

    return user


async def get_current_customer(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    session: AsyncSession = Depends(get_db),
):
    """
    Dependency that extracts the Bearer JWT token, validates it,
    loads the Customer model, checks merchant affiliation, and enforces customer authorization.
    """
    from app.models.customer import Customer

    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired customer authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate customer role or customer_id claim
    is_customer = payload.get("role") == "customer" or "customer_id" in payload
    if not is_customer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token does not have customer scope authorization.",
        )

    try:
        customer_id = uuid.UUID(payload.get("customer_id") or payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed customer ID in token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    customer = await session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Customer profile associated with token does not exist.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify merchant scoping in token
    token_merchant_id = payload.get("merchant_id")
    if token_merchant_id:
        try:
            if customer.merchant_id != uuid.UUID(token_merchant_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-merchant customer access violation.",
                )
        except (ValueError, TypeError):
            pass

    return customer

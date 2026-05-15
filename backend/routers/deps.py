from typing import Generator, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from pydantic import ValidationError

from backend.core.config import settings
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import User
from backend.schemas.auth import TokenPayload
from backend.repositories.user_repository import UserRepository

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user_repo = UserRepository(db)
    user = user_repo.get(id=token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

from backend.infrastructure.database.models import FieldAccess, FieldAccessRole, UserRole

# Define role hierarchy for field-level access
ACCESS_LEVELS = {
    FieldAccessRole.VIEWER: 1,
    FieldAccessRole.EDITOR: 2,
    FieldAccessRole.OWNER: 3
}

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_active_user)):
        # Handle both string and enum comparison
        user_role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
        if user_role_str not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role {user_role_str} is not authorized to access this resource"
            )
        return user

class FieldPermissionChecker:
    """
    Modular permission checker for specific field access.
    Admins bypass checks.
    """
    def __init__(self, required_level: FieldAccessRole):
        self.required_level = required_level

    def __call__(
        self,
        field_id: str,
        user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ):
        # 1. Global Admin bypass
        user_role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
        if user_role_str == UserRole.ADMIN.value:
            return True

        # 2. Check specific field access
        access = db.query(FieldAccess).filter(
            FieldAccess.field_id == field_id,
            FieldAccess.user_id == user.id,
            FieldAccess.is_active == True
        ).first()

        if not access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this field"
            )

        # 3. Verify hierarchy
        if ACCESS_LEVELS[access.access_role] < ACCESS_LEVELS[self.required_level]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Minimum required access: {self.required_level.value}. Your access: {access.access_role.value}"
            )

        return True

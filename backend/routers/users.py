from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import User as UserModel
from backend.schemas.user import User, UserUpdate
from backend.repositories.user_repository import UserRepository
from backend.routers.deps import get_current_active_user

router = APIRouter()

@router.get("/me", response_model=User)
def get_me(
    current_user: UserModel = Depends(get_current_active_user),
) -> Any:
    return current_user


@router.patch("/me", response_model=User)
def update_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: UserModel = Depends(get_current_active_user),
) -> Any:
    user_repo = UserRepository(db)

    if user_in.email and user_in.email != current_user.email:
        existing_user = user_repo.get_by_email(email=user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="The user with this email already exists.",
            )

    return user_repo.update(db_obj=current_user, obj_in=user_in)
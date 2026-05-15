from backend.schemas.admin import AdminCreateUserRequest
from backend.schemas.user import UserCreate
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import uuid

from backend.infrastructure.database.database import get_db
from backend.routers.deps import get_current_active_user, RoleChecker
from backend.infrastructure.database.models import User, UserRole, Field, Analysis, AuditLog
from backend.services.audit_service import AuditService
from backend.repositories.user_repository import UserRepository

router = APIRouter()
admin_only = RoleChecker(["ADMIN"])

@router.get("/stats")
def get_system_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """
    Logical System Overview (Business metrics).
    """
    total_users = db.query(func.count(User.id)).scalar()
    total_fields = db.query(func.count(Field.id)).scalar()
    total_analyses = db.query(func.count(Analysis.id)).scalar()
    
    # Simple weekly growth (placeholder logic)
    return {
        "summary": {
            "users": total_users,
            "fields": total_fields,
            "analyses": total_analyses
        },
        "status": "operational"
    }

@router.get("/users")
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.patch("/users/{user_id}")
def update_user_by_admin(
    user_id: uuid.UUID,
    updates: Dict[str, Any],
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_values = {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "is_active": user.is_active
    }

    if "email" in updates:
        existing = db.query(User).filter(
            User.email == updates["email"],
            User.id != user_id
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")

        user.email = updates["email"]

    if "full_name" in updates:
        user.full_name = updates["full_name"]

    if "role" in updates:
        user.role = UserRole(updates["role"])

    if "is_active" in updates:
        user.is_active = updates["is_active"]

    db.commit()
    db.refresh(user)

    return user


@router.post("/users")
def create_user_by_admin(
    request: AdminCreateUserRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    user_repo = UserRepository(db)

    existing = user_repo.get_by_email(email=request.email)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    return user_repo.create(obj_in=UserCreate(
        email=request.email,
        full_name=request.full_name,
        password=request.password,
        role=request.role
    ))


@router.delete("/users/{user_id}")
def delete_user_by_admin(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Admin cannot delete own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"status": "success", "message": "User deleted"}


@router.get("/audit")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return logs



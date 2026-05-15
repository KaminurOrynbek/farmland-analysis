from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import uuid

from backend.infrastructure.database.database import get_db
from backend.routers.deps import get_current_active_user, RoleChecker
from backend.infrastructure.database.models import User, UserRole, Field, Analysis, AuditLog
from backend.services.audit_service import AuditService

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
def update_user_status(
    user_id: uuid.UUID,
    updates: Dict[str, Any],
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    audit = AuditService(db)
    old_values = {"role": user.role.value, "is_active": user.is_active}
    
    if "role" in updates:
        user.role = UserRole(updates["role"])
    if "is_active" in updates:
        user.is_active = updates["is_active"]
        
    db.commit()
    
    audit.log_action(
        user_id=current_admin.id,
        action="UPDATE_USER",
        entity_type="USER",
        entity_id=user.id,
        old_values=old_values,
        new_values={"role": user.role.value, "is_active": user.is_active}
    )
    
    return user

@router.get("/audit")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return logs

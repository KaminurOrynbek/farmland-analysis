from datetime import datetime, timedelta
import os
from typing import Any, Dict, List
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.infrastructure.celery.celery_app import celery_app
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import Analysis, AnalysisStatus, AuditLog, Field, User, UserRole
from backend.infrastructure.database.repositories import redis_client
from backend.repositories.user_repository import UserRepository
from backend.routers.deps import RoleChecker
from backend.schemas.admin import AdminCreateUserRequest
from backend.schemas.user import UserCreate
from backend.services.audit_service import AuditService
from backend.infrastructure.storage.storage_provider import get_storage

router = APIRouter()
admin_only = RoleChecker(["ADMIN"])


def _serialize_user(user: User) -> Dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "is_active": bool(user.is_active),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None
    }


def _serialize_audit_log(log: AuditLog) -> Dict[str, Any]:
    return {
        "id": log.id,
        "user_id": log.user_id,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "action": log.action,
        "old_values": log.old_values,
        "new_values": log.new_values,
        "metadata": log.metadata_json,
        "created_at": log.created_at.isoformat() if log.created_at else None
    }


def _to_iso_day(value: Any) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _build_daily_series(
    rows: List[Any],
    start_date,
    value_key: str
) -> List[Dict[str, Any]]:
    counts_by_day = {
        _to_iso_day(day_value): count
        for day_value, count in rows
    }

    series = []
    for day_offset in range(7):
        current_day = start_date + timedelta(days=day_offset)
        day_key = current_day.isoformat()
        series.append({
            "date": day_key,
            value_key: counts_by_day.get(day_key, 0)
        })

    return series


def _get_weekly_stats(db: Session) -> Dict[str, Any]:
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=6)
    start_datetime = datetime.combine(start_date, datetime.min.time())

    user_rows = (
        db.query(func.date(User.created_at), func.count(User.id))
        .filter(User.created_at >= start_datetime)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
        .all()
    )

    field_rows = (
        db.query(func.date(Field.created_at), func.count(Field.id))
        .filter(Field.created_at >= start_datetime)
        .group_by(func.date(Field.created_at))
        .order_by(func.date(Field.created_at))
        .all()
    )

    analysis_rows = (
        db.query(func.date(Analysis.created_at), func.count(Analysis.id))
        .filter(Analysis.created_at >= start_datetime)
        .group_by(func.date(Analysis.created_at))
        .order_by(func.date(Analysis.created_at))
        .all()
    )

    return {
        "field_creations": _build_daily_series(field_rows, start_date, "count"),
        "analysis_runs": _build_daily_series(analysis_rows, start_date, "count"),
        "user_registrations": _build_daily_series(user_rows, start_date, "count")
    }


def _get_role_breakdown(db: Session) -> Dict[str, int]:
    role_rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    role_counts = {
        role.value if hasattr(role, "value") else str(role): count
        for role, count in role_rows
    }

    return {
        UserRole.ADMIN.value: role_counts.get(UserRole.ADMIN.value, 0),
        UserRole.FARMER.value: role_counts.get(UserRole.FARMER.value, 0),
        UserRole.AGRONOMIST.value: role_counts.get(UserRole.AGRONOMIST.value, 0)
    }


def _format_size_label(size_bytes: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    value = float(size_bytes)
    unit_index = 0

    while value >= 1024 and unit_index < len(units) - 1:
        value /= 1024
        unit_index += 1

    precision = 0 if unit_index == 0 else 2
    return f"{value:.{precision}f} {units[unit_index]}"


def _get_storage_usage() -> Dict[str, Any]:
    buckets = [settings.MINIO_BUCKET_RAW, settings.MINIO_BUCKET_RESULTS]

    try:
        storage = get_storage()
        s3_client = storage.s3
    except Exception as exc:
        return {
            "status": "unavailable",
            "provider": "MinIO / S3-compatible",
            "total_objects": 0,
            "total_size_bytes": 0,
            "total_size_label": "Unavailable",
            "buckets": [],
            "error": str(exc)
        }

    bucket_summaries = []
    total_size_bytes = 0
    total_objects = 0
    overall_status = "operational"

    for bucket_name in buckets:
        try:
            paginator = s3_client.get_paginator("list_objects_v2")
            object_count = 0
            size_bytes = 0

            for page in paginator.paginate(Bucket=bucket_name):
                for obj in page.get("Contents", []):
                    object_count += 1
                    size_bytes += int(obj.get("Size") or 0)

            total_size_bytes += size_bytes
            total_objects += object_count
            bucket_summaries.append({
                "bucket": bucket_name,
                "status": "available",
                "objects": object_count,
                "size_bytes": size_bytes,
                "size_label": _format_size_label(size_bytes)
            })
        except Exception as exc:
            overall_status = "degraded"
            bucket_summaries.append({
                "bucket": bucket_name,
                "status": "unavailable",
                "objects": 0,
                "size_bytes": 0,
                "size_label": "Unavailable",
                "error": str(exc)
            })

    return {
        "status": overall_status,
        "provider": "MinIO / S3-compatible",
        "total_objects": total_objects,
        "total_size_bytes": total_size_bytes,
        "total_size_label": _format_size_label(total_size_bytes),
        "buckets": bucket_summaries
    }


def _get_celery_status(db: Session) -> Dict[str, Any]:
    pending_statuses = [
        AnalysisStatus.PENDING,
        AnalysisStatus.INGESTING,
        AnalysisStatus.PROCESSING
    ]

    in_progress_jobs = (
        db.query(func.count(Analysis.id))
        .filter(Analysis.status.in_(pending_statuses))
        .scalar()
    )

    failed_jobs = (
        db.query(func.count(Analysis.id))
        .filter(Analysis.status == AnalysisStatus.FAILED)
        .scalar()
    )

    try:
        broker_connected = bool(redis_client.ping())
        default_queue_depth = int(redis_client.llen("celery"))
        inspector = celery_app.control.inspect(timeout=1.0)
        ping_response = inspector.ping() or {}
        reserved_response = inspector.reserved() or {}
        scheduled_response = inspector.scheduled() or {}

        reserved_jobs = sum(len(items or []) for items in reserved_response.values())
        scheduled_jobs = sum(len(items or []) for items in scheduled_response.values())

        return {
            "status": "operational" if broker_connected else "degraded",
            "broker": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            "active_workers": len(ping_response),
            "queues": [
                {
                    "name": "celery",
                    "pending_jobs": default_queue_depth,
                    "reserved_jobs": reserved_jobs,
                    "scheduled_jobs": scheduled_jobs
                }
            ],
            "jobs": {
                "in_progress": in_progress_jobs or 0,
                "failed": failed_jobs or 0
            }
        }
    except Exception as exc:
        return {
            "status": "unavailable",
            "active_workers": 0,
            "queues": [
                {
                    "name": "celery",
                    "pending_jobs": 0,
                    "reserved_jobs": 0,
                    "scheduled_jobs": 0
                }
            ],
            "jobs": {
                "in_progress": in_progress_jobs or 0,
                "failed": failed_jobs or 0
            },
            "error": str(exc)
        }


@router.get("/stats")
def get_system_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    """
    Logical System Overview (Business metrics + operational monitoring).
    """
    total_users = db.query(func.count(User.id)).scalar()
    total_fields = db.query(func.count(Field.id)).scalar()
    total_analyses = db.query(func.count(Analysis.id)).scalar()
    blocked_users = db.query(func.count(User.id)).filter(User.is_active == False).scalar()

    return {
        "summary": {
            "users": total_users or 0,
            "fields": total_fields or 0,
            "analyses": total_analyses or 0,
            "blocked_users": blocked_users or 0
        },
        "status": "operational",
        "role_breakdown": _get_role_breakdown(db),
        "weekly": _get_weekly_stats(db),
        "resources": {
            "celery": _get_celery_status(db),
            "storage": _get_storage_usage()
        }
    }


@router.get("/users")
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialize_user(user) for user in users]


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

    if user_id == current_admin.id:
        if "is_active" in updates and not updates["is_active"]:
            raise HTTPException(status_code=400, detail="Admin cannot block own account")
        if "role" in updates and updates["role"] != UserRole.ADMIN.value:
            raise HTTPException(status_code=400, detail="Admin cannot remove own admin role")

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
        user.is_active = bool(updates["is_active"])

    db.commit()
    db.refresh(user)

    AuditService(db).log_action(
        user_id=current_admin.id,
        action="ADMIN_USER_UPDATED",
        entity_type="user",
        entity_id=user.id,
        old_values=old_values,
        new_values={
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "is_active": user.is_active
        }
    )

    return _serialize_user(user)


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

    created_user = user_repo.create(obj_in=UserCreate(
        email=request.email,
        full_name=request.full_name,
        password=request.password,
        role=request.role
    ))

    AuditService(db).log_action(
        user_id=current_admin.id,
        action="ADMIN_USER_CREATED",
        entity_type="user",
        entity_id=created_user.id,
        new_values=_serialize_user(created_user)
    )

    return _serialize_user(created_user)


@router.patch("/users/{user_id}/deactivate")
def delete_user_by_admin(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Admin cannot deactivate own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_active:
        return {"status": "success", "message": "User is already deactivated"}

    old_values = _serialize_user(user)

    db.query(User).filter(User.id == user_id).update(
        {
            User.is_active: False,
            User.updated_at: datetime.utcnow()
        },
        synchronize_session=False
    )

    db.commit()

    db.refresh(user)

    AuditService(db).log_action(
        user_id=current_admin.id,
        action="ADMIN_USER_DEACTIVATED",
        entity_type="user",
        entity_id=user.id,
        old_values=old_values,
        new_values=_serialize_user(user)
    )

    return {"status": "success", "message": "User deactivated"}

@router.get("/audit")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_only)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [_serialize_audit_log(log) for log in logs]

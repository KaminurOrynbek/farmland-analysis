from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import json
from jose import JWTError, jwt
from pydantic import ValidationError

from backend.schemas.analysis import AnalysisRequest
from backend.schemas.auth import TokenPayload
from backend.core.config import settings
from backend.infrastructure.database.database import get_db
from backend.routers.deps import get_current_active_user, FieldPermissionChecker
from backend.infrastructure.database.models import User, FieldAccessRole
from backend.services.analysis_service import AnalysisService
from backend.core.websocket_manager import manager
from backend.repositories.user_repository import UserRepository
from backend.infrastructure.database.database import SessionLocal
from backend.services.audit_service import AuditService
from backend.services.season_service import resolve_monitoring_window

router = APIRouter()

@router.post("/analyze")
async def run_field_analysis(
    request: AnalysisRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Triggers the end-to-end processing pipeline for a specific field.
    """
    # Verify permission: EDITOR level required
    permission_checker = FieldPermissionChecker(FieldAccessRole.EDITOR)
    permission_checker(str(request.field_id), current_user, db)

    try:
        from backend.infrastructure.celery.celery_dispatcher import CeleryJobDispatcher
        dispatcher = CeleryJobDispatcher()
        service = AnalysisService(db, dispatcher)
        start, end, resolved_season = resolve_monitoring_window(
            season_year=request.season_year,
            start_date=request.start_date,
            end_date=request.end_date
        )
        
        result = service.run_analysis(
            user=current_user,
            field_id=request.field_id,
            start_date=start,
            end_date=end,
            season_year=resolved_season,
            satellite_source=request.satellite_source,
            satellite_acquisition_date=request.satellite_acquisition_date,
            cloud_coverage=request.cloud_coverage,
            quality_flags=request.quality_flags
        )

        analysis_id = result.get("analysis_id") if isinstance(result, dict) else None
        if analysis_id:
            AuditService(db).log_action(
                user_id=current_user.id,
                action="ANALYSIS_STARTED",
                entity_type="analysis",
                entity_id=analysis_id,
                metadata={
                    "field_id": str(request.field_id),
                    "start_date": start.isoformat(),
                    "end_date": end.isoformat(),
                    "season_year": resolved_season,
                    "satellite_source": request.satellite_source,
                    "satellite_acquisition_date": request.satellite_acquisition_date.isoformat() if request.satellite_acquisition_date else None
                }
            )

        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")

@router.get("/history")
async def get_analysis_history(
    field_id: Optional[str] = Query(default=None),
    season_year: Optional[int] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves analysis history for the current authenticated user.
    """
    try:
        from backend.infrastructure.celery.celery_dispatcher import CeleryJobDispatcher
        dispatcher = CeleryJobDispatcher()
        service = AnalysisService(db, dispatcher)
        data = service.get_history(
            user=current_user,
            limit=50,
            field_id=field_id,
            season_year=season_year,
            start_date=start_date,
            end_date=end_date
        )
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analysis history: {str(e)}")

@router.get("/status/{analysis_id}")
async def get_analysis_status(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Polls the status and progress of a specific analysis job.
    Uses Read-Aside caching with Redis.
    """
    # 1. Try Redis first
    from backend.infrastructure.database.repositories import redis_client
    cached_status = redis_client.get(f"analysis_status:{analysis_id}")
    if cached_status:
        return json.loads(cached_status)

    # 2. Fallback to DB
    from backend.infrastructure.celery.celery_dispatcher import CeleryJobDispatcher
    dispatcher = CeleryJobDispatcher()
    service = AnalysisService(db, dispatcher)
    analysis = service.repo.get_by_id(analysis_id)
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis job not found")

    # Verify permission: VIEWER level required
    permission_checker = FieldPermissionChecker(FieldAccessRole.VIEWER)
    permission_checker(str(analysis.field_id), current_user, db)

    return {
        "analysis_id": analysis.id,
        "status": str(analysis.status.value) if hasattr(analysis.status, 'value') else str(analysis.status),
        "progress": analysis.progress_percent,
        "stage": analysis.current_stage,
        "results": analysis.analysis_results if analysis.progress_percent == 100 else None,
        "error": analysis.error_message
    }

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...)
):
    """
    Real-time updates via WebSockets.
    """
    db = SessionLocal()

    try:
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            token_data = TokenPayload(**payload)
        except (JWTError, ValidationError):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        user = UserRepository(db).get(id=token_data.sub)

        if not user or not user.is_active or str(user.id) != user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(websocket, user_id)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket, user_id)
    finally:
        db.close()

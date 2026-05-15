from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import json

from backend.schemas.analysis import AnalysisRequest
from backend.infrastructure.database.database import get_db
from backend.routers.deps import get_current_active_user, FieldPermissionChecker
from backend.infrastructure.database.models import User, FieldAccessRole
from backend.services.analysis_service import AnalysisService
from backend.core.websocket_manager import manager

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
        
        # Fallback to an arbitrary summer window if dates aren't provided
        start = request.start_date if request.start_date else "2023-05-01"
        end = request.end_date if request.end_date else "2023-08-30"
        
        result = service.run_analysis(
            user=current_user,
            field_id=request.field_id,
            start_date=start,
            end_date=end
        )
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")

@router.get("/history")
async def get_analysis_history(
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
        data = service.get_history(user=current_user, limit=20)
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
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    Real-time updates via WebSockets.
    """
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
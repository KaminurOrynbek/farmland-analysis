from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from backend.schemas.analysis import AnalysisRequest
from backend.infrastructure.database.database import get_db
from backend.routers.deps import get_current_active_user
from backend.infrastructure.database.models import User
from backend.services.analysis_service import AnalysisService

router = APIRouter()

@router.post("/analyze")
async def run_field_analysis(
    request: AnalysisRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Triggers the end-to-end processing pipeline for a specific field.
    Requires the field to be already saved in the database and owned by the user.
    """
    try:
        service = AnalysisService(db)
        
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
        service = AnalysisService(db)
        data = service.get_history(user=current_user, limit=20)

        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analysis history: {str(e)}")
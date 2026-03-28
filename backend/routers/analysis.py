from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.schemas.analysis import AnalysisRequest
from backend.use_cases.analyze_field import AnalyzeFieldUseCase
from backend.infrastructure.database.database import get_db

router = APIRouter()

@router.post("/analyze")
async def run_field_analysis(request: AnalysisRequest, db: Session = Depends(get_db)):
    """
    Triggers the end-to-end processing pipeline for a specific field.
    Requires the field to be already saved in the database.
    """
    try:
        use_case = AnalyzeFieldUseCase(db)
        # Fallback to an arbitrary summer window if dates aren't provided
        start = request.start_date if getattr(request, 'start_date', None) else "2023-05-01"
        end = request.end_date if getattr(request, 'end_date', None) else "2023-08-30"
        
        result = use_case.execute(
            field_id=request.field_id,
            start_date=start,
            end_date=end
        )
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")

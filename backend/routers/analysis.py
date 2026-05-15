from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.schemas.analysis import AnalysisRequest
from backend.use_cases.analyze_field import AnalyzeFieldUseCase
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.repositories import AnalysisRepository

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


@router.get("/history")
async def get_analysis_history(db: Session = Depends(get_db)):
    try:
        repo = AnalysisRepository(db)
        rows = repo.get_history(limit=20)

        return {
            "status": "success",
            "data": [
                {
                    "analysis_id": analysis.id,
                    "field_id": field.id,
                    "field_name": field.name,
                    "area_ha": field.area_ha,
                    "analysis_date": analysis.created_at.isoformat() if analysis.created_at else None,
                    "status": analysis.status,

                    "crop_type": ml.crop_type_prediction if ml else None,
                    "confidence": ml.confidence_score if ml else None,
                    "vegetation_health": ml.vegetation_health_index if ml else None,
                    "risk_level": ml.risk_level if ml else None,

                    "ndvi_value": indices.ndvi_mean if indices else None,
                    "evi_value": indices.evi_mean if indices else None,
                    "stress_zones_count": indices.stress_zones_detected if indices else 0,
                }
                for analysis, field, indices, ml in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analysis history: {str(e)}")
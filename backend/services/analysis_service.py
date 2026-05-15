from sqlalchemy.orm import Session
from typing import Dict, Any, List
from backend.infrastructure.database.repositories import AnalysisRepository, FieldRepository
from backend.use_cases.analyze_field import AnalyzeFieldUseCase
from backend.infrastructure.database.models import User
from fastapi import HTTPException

class AnalysisService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AnalysisRepository(db)
        self.field_repo = FieldRepository(db)

    def run_analysis(self, user: User, field_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """
        Orchestrates field analysis, ensuring the user has access to the field.
        """
        # 1. Check access
        field = self.field_repo.get(field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        
        # Verify ownership (or EDITOR access in the future)
        if str(field.owner_id) != str(user.id):
             # For now, only owner can analyze. Later we can check FieldAccess table.
             from backend.infrastructure.database.models import FieldAccess
             access = self.db.query(FieldAccess).filter(
                 FieldAccess.field_id == field_id,
                 FieldAccess.user_id == user.id,
                 FieldAccess.access_role.in_(["OWNER", "EDITOR"])
             ).first()
             if not access:
                 raise HTTPException(status_code=403, detail="Not authorized to analyze this field")

        # 2. Create Analysis Record in DB first (Job Tracking Pattern)
        analysis_record = self.repo.create_analysis(field_id=field_id, image_id=None)

        # 3. Trigger Asynchronous Task with the Analysis ID
        from backend.infrastructure.celery.tasks import run_analysis_task
        task = run_analysis_task.delay(field_id, start_date, end_date, analysis_id=analysis_record.id)

        # 4. Save Task ID to the record
        analysis_record.celery_task_id = task.id
        self.db.commit()

        return {
            "status": "Processing",
            "message": "Analysis started in background.",
            "field_id": field_id,
            "analysis_id": analysis_record.id,
            "task_id": task.id
        }

    def get_history(self, user: User, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Retrieves analysis history for the user.
        """
        rows = self.repo.get_history(user_id=str(user.id), limit=limit)
        
        result = []
        for analysis, field, indices, ml in rows:
            result.append({
                "analysis_id": analysis.id,
                "field_id": field.id,
                "field_name": field.name,
                "area_ha": float(field.area_ha) if field.area_ha else 0.0,
                "analysis_date": analysis.created_at.isoformat() if analysis.created_at else None,
                "status": str(analysis.status.value) if hasattr(analysis.status, 'value') else str(analysis.status),

                "crop_type": ml.crop_type_prediction if ml else None,
                "confidence": ml.confidence_score if ml else None,
                "vegetation_health": ml.vegetation_health_index if ml else None,
                "risk_level": ml.risk_level if ml else None,

                "ndvi_value": indices.ndvi_mean if indices else None,
                "evi_value": indices.evi_mean if indices else None,
                "stress_zones_count": indices.stress_zones_detected if indices else 0,
            })
        return result

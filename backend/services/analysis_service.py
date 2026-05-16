from sqlalchemy.orm import Session
from typing import Dict, Any, List
from backend.infrastructure.database.repositories import AnalysisRepository, FieldRepository
from backend.infrastructure.database.models import User
from backend.core.interfaces import JobDispatcher
from fastapi import HTTPException

class AnalysisService:
    def __init__(self, db: Session, dispatcher: JobDispatcher):
        self.db = db
        self.repo = AnalysisRepository(db)
        self.field_repo = FieldRepository(db)
        self.dispatcher = dispatcher

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

        # 2. Create Analysis Record in DB (Job Tracking Pattern)
        analysis_record = self.repo.create_analysis(field_id=field_id, image_id=None)

        # 3. Dispatch job to Worker with rich context (Worker handles ALL data I/O)
        task_id = self.dispatcher.dispatch(
            "run_analysis_task",
            payload={
                "job_id": str(analysis_record.id),
                "field_id": field_id,
                "params": {
                    "start_date": start_date,
                    "end_date": end_date,
                },
                "output_prefix": f"results/{analysis_record.id}/"
            }
        )

        # 4. Save Task ID for traceability
        analysis_record.celery_task_id = task_id
        self.db.commit()

        return {
            "status": "Accepted",
            "message": "Analysis job queued. Worker will handle data ingestion and processing.",
            "field_id": field_id,
            "analysis_id": analysis_record.id,
        }

    def get_history(self, user: User, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Retrieves analysis history for the user.
        """
        rows = self.repo.get_history(user_id=user.id, limit=limit)
        
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
                "stress_area_percentage": indices.stress_area_percentage if indices else 0,
                "assessment": ml.agronomic_assessment if ml else None,

            })
        return result

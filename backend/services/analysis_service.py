from datetime import date
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from backend.infrastructure.database.repositories import AnalysisRepository, FieldRepository
from backend.infrastructure.database.models import User
from backend.core.interfaces import JobDispatcher
from fastapi import HTTPException
from backend.services.season_service import resolve_monitoring_window, normalize_season_year


def _serialize_datetime(value) -> Optional[str]:
    return value.isoformat() if value else None


def _serialize_date(value) -> Optional[str]:
    return value.isoformat() if value else None


def _serialize_analysis_row(analysis, field, indices, ml) -> Dict[str, Any]:
    predicted_class = None

    if ml and ml.crop_type_prediction:
        predicted_class = ml.crop_type_prediction
    elif analysis.analysis_results:
        predicted_class = analysis.analysis_results.get("predicted_class")

    confidence = None
    if ml and ml.confidence_score is not None:
        confidence = ml.confidence_score
    elif analysis.analysis_results:
        confidence = analysis.analysis_results.get("confidence")

    risk_level = None
    if ml and ml.risk_level:
        risk_level = ml.risk_level
    elif analysis.analysis_results:
        risk_level = analysis.analysis_results.get("risk_level")

    quality_flags = analysis.quality_flags
    if quality_flags == []:
        quality_flags = None

    return {
        "analysis_id": str(analysis.id),
        "field_id": str(field.id),
        "field_name": field.name,
        "area_ha": float(field.area_ha) if field.area_ha else 0.0,
        "analysis_date": _serialize_datetime(analysis.completed_at or analysis.created_at),
        "analysis_created_at": _serialize_datetime(analysis.created_at),
        "status": analysis.status.value if hasattr(analysis.status, "value") else str(analysis.status),
        "season_year": analysis.season_year or normalize_season_year(start_date=analysis.requested_start_date, end_date=analysis.requested_end_date),
        "start_date": _serialize_date(analysis.requested_start_date),
        "end_date": _serialize_date(analysis.requested_end_date),
        "satellite_acquisition_date": _serialize_date(analysis.satellite_acquisition_date),
        "satellite_source": analysis.satellite_source,
        "ndvi_value": indices.ndvi_mean if indices else None,
        "evi_value": indices.evi_mean if indices else None,
        "predicted_class": predicted_class,
        "eurosat_class": predicted_class,
        "confidence": confidence,
        "risk_level": risk_level,
        "cloud_coverage": analysis.cloud_coverage,
        "quality_flags": quality_flags,
        "field_metadata": {
            "crop_type": field.crop_type,
            "planting_date": _serialize_date(field.planting_date),
            "season_year": field.season_year
        }
    }

class AnalysisService:
    def __init__(self, db: Session, dispatcher: JobDispatcher):
        self.db = db
        self.repo = AnalysisRepository(db)
        self.field_repo = FieldRepository(db)
        self.dispatcher = dispatcher

    def run_analysis(
        self,
        user: User,
        field_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        season_year: Optional[int] = None,
        satellite_source: Optional[str] = None,
        satellite_acquisition_date: Optional[date] = None,
        cloud_coverage: Optional[float] = None,
        quality_flags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Orchestrates field analysis, ensuring the user has access to the field.
        """
        user_role = user.role.value if hasattr(user.role, 'value') else str(user.role)
        requested_start, requested_end, resolved_season = resolve_monitoring_window(
            season_year=season_year,
            start_date=start_date,
            end_date=end_date
        )

        # 1. Check access
        field = self.field_repo.get(field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        
        # Verify ownership (or EDITOR access in the future)
        if user_role != "ADMIN" and str(field.owner_id) != str(user.id):
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
        analysis_record = self.repo.create_analysis(
            field_id=field_id,
            image_id=None,
            metadata={
                "season_year": resolved_season,
                "start_date": requested_start,
                "end_date": requested_end,
                "satellite_source": satellite_source,
                "satellite_acquisition_date": satellite_acquisition_date,
                "cloud_coverage": cloud_coverage,
                "quality_flags": quality_flags
            }
        )

        # 3. Dispatch job to Worker with rich context (Worker handles ALL data I/O)
        task_id = self.dispatcher.dispatch(
            "run_analysis_task",
            payload={
                "job_id": str(analysis_record.id),
                "field_id": field_id,
                "params": {
                    "start_date": requested_start.isoformat(),
                    "end_date": requested_end.isoformat(),
                    "season_year": resolved_season,
                    "satellite_source": satellite_source,
                    "satellite_acquisition_date": satellite_acquisition_date.isoformat() if satellite_acquisition_date else None,
                    "cloud_coverage": cloud_coverage,
                    "quality_flags": quality_flags,
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
            "field_id": str(field_id),
            "analysis_id": str(analysis_record.id),
            "season_year": resolved_season,
            "start_date": requested_start.isoformat(),
            "end_date": requested_end.isoformat()
        }

    def get_history(
        self,
        user: User,
        limit: int = 20,
        field_id: Optional[str] = None,
        season_year: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves analysis history for the user.
        """
        user_role = user.role.value if hasattr(user.role, 'value') else str(user.role)
        rows = self.repo.get_history(
            user_id=user.id,
            limit=limit,
            include_all=user_role == "ADMIN",
            field_id=field_id,
            season_year=season_year,
            start_date=start_date,
            end_date=end_date
        )

        return [
            _serialize_analysis_row(analysis, field, indices, ml)
            for analysis, field, indices, ml in rows
        ]

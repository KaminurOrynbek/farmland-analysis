import os
import json
import redis
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.infrastructure.database.models import User, Field, Analysis, AnalysisStatus, AnalysisType, SatelliteImage, SpectralIndices, MLPrediction
from backend.core.config import settings
from uuid import UUID



# Initialize Redis client for caching status
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

class FieldRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: UUID,
        name: str,
        geometry: dict,
        area_ha: float,
        crop_type: str = None,
        planting_date = None,
        season_year: int = None
    ) -> Field:
        from shapely.geometry import shape
        from geoalchemy2.shape import from_shape
        
        # Convert GeoJSON dict to WKT/EWKB for PostGIS
        if "geometry" in geometry:
            geom_obj = shape(geometry["geometry"])
        else:
            geom_obj = shape(geometry)

        db_field = Field(
            owner_id=user_id,
            name=name,
            boundary_geom=from_shape(geom_obj, srid=4326),
            area_ha=area_ha,
            crop_type=crop_type,
            planting_date=planting_date,
            season_year=season_year
        )
        self.db.add(db_field)
        self.db.commit()
        self.db.refresh(db_field)
        return db_field
        
    def get(self, field_id: str) -> Field:
        return self.db.query(Field).filter(Field.id == field_id).first()
        
    def get_by_user(self, user_id: str):
        return self.db.query(Field).filter(Field.owner_id == user_id).all()

    def check_access(self, user_id: str, field_id: str, required_roles: list = ["OWNER", "EDITOR", "VIEWER"]) -> bool:
        """ Checks if user has any of the required roles for the field. """
        from backend.infrastructure.database.models import FieldAccess
        access = self.db.query(FieldAccess).filter(
            FieldAccess.field_id == field_id,
            FieldAccess.user_id == user_id,
            FieldAccess.access_role.in_(required_roles)
        ).first()
        return access is not None

class AnalysisRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_satellite_image(self, field_id: str, platform: str, start_date, end_date, url) -> SatelliteImage:
        image = SatelliteImage(
            field_id=field_id,
            platform=platform,
            acquisition_start_date=start_date,
            acquisition_end_date=end_date,
            download_url=url
        )
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def get_by_id(self, analysis_id: str) -> Analysis:
        return self.db.query(Analysis).filter(Analysis.id == analysis_id).first()

    def update_progress(self, analysis_id: str, percent: int, stage: str, status=None):
        from backend.infrastructure.database.models import AnalysisStatus

        analysis = self.get_by_id(analysis_id)

        if analysis:
            analysis.progress_percent = percent
            analysis.current_stage = stage

            if status is not None:
                analysis.status = status
            elif percent >= 100:
                analysis.status = AnalysisStatus.DONE
            elif percent > 0:
                analysis.status = AnalysisStatus.PROCESSING

            event = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "stage": stage,
                "progress": percent
            }

            if not analysis.event_log:
                analysis.event_log = []

            new_log = list(analysis.event_log)
            new_log.append(event)
            analysis.event_log = new_log

            self.db.commit()

            cache_data = {
                "analysis_id": str(analysis_id),
                "status": analysis.status.value if hasattr(analysis.status, "value") else str(analysis.status),
                "progress": percent,
                "stage": stage,
                "event": event
            }

            redis_client.setex(
                f"analysis_status:{analysis_id}",
                3600,
                json.dumps(cache_data)
            )

            redis_client.publish("analysis_updates", json.dumps(cache_data))

    def create_analysis(self, field_id: str, image_id: str = None, metadata: dict = None) -> Analysis:
        metadata = metadata or {}

        # In this architecture, analysis has a many-to-many link to images via AnalysisImage
        analysis = Analysis(
            field_id=field_id,
            status=AnalysisStatus.PROCESSING,
            analysis_type=AnalysisType.CROP_CLASSIFICATION,
            season_year=metadata.get("season_year"),
            requested_start_date=metadata.get("start_date"),
            requested_end_date=metadata.get("end_date"),
            satellite_acquisition_date=metadata.get("satellite_acquisition_date"),
            satellite_source=metadata.get("satellite_source"),
            cloud_coverage=metadata.get("cloud_coverage"),
            quality_flags=metadata.get("quality_flags"),
            started_at=datetime.now(timezone.utc)        
        )
        self.db.add(analysis)
        self.db.flush() # Get the analysis ID

        if image_id:
            from backend.infrastructure.database.models import AnalysisImage
            link = AnalysisImage(
                analysis_id=analysis.id,
                satellite_image_id=image_id
            )
            self.db.add(link)

        self.db.commit()
        self.db.refresh(analysis)
        return analysis
        
    def save_results(self, analysis_id: str, indices_data: dict, ml_data: dict, analysis_metadata: dict = None):
        analysis_metadata = analysis_metadata or {}

        indices = SpectralIndices(
            analysis_id=analysis_id,
            ndvi_mean=indices_data.get("ndvi_mean"),
            evi_mean=indices_data.get("evi_mean"),
            ndvi_min=indices_data.get("ndvi_min"),
            ndvi_max=indices_data.get("ndvi_max"),
            stress_zones_detected=indices_data.get("stress_zones_count", 0),
            stress_area_percentage=indices_data.get("stress_area_percentage", 0)
        )
        self.db.add(indices)

        ml_pred = MLPrediction(
            analysis_id=analysis_id,
            crop_type_prediction=ml_data.get("predicted_class") or ml_data.get("crop_type"),
            confidence_score=ml_data.get("confidence"),
            vegetation_health_index=ml_data.get("vegetation_signal_score"),
            risk_level=ml_data.get("risk_level"),
            agronomic_assessment=None
        )
        self.db.add(ml_pred)

        analysis = self.db.query(Analysis).filter(Analysis.id == analysis_id).first()

        if analysis:
            analysis.status = AnalysisStatus.DONE
            analysis.completed_at = datetime.now(timezone.utc)
            analysis.quality_flags = analysis_metadata.get("quality_flags")

            if analysis.started_at:
                started_at = analysis.started_at
                if started_at.tzinfo is None:
                    started_at = started_at.replace(tzinfo=timezone.utc)

                analysis.processing_time_ms = int(
                    (analysis.completed_at - started_at).total_seconds() * 1000
                )

            analysis.analysis_results = {
                "ndvi_value": indices_data.get("ndvi_mean"),
                "evi_value": indices_data.get("evi_mean"),
                "predicted_class": ml_data.get("predicted_class") or ml_data.get("crop_type"),
                "confidence": ml_data.get("confidence"),
                "risk_level": ml_data.get("risk_level"),
                "quality_flags": analysis_metadata.get("quality_flags")
            }

        self.db.commit()

    def get_history(
        self,
        user_id: str,
        limit: int = 20,
        include_all: bool = False,
        field_id: str = None,
        season_year: int = None,
        start_date = None,
        end_date = None
    ):
        from backend.infrastructure.database.models import FieldAccess

        query = (
            self.db.query(Analysis, Field, SpectralIndices, MLPrediction)
            .join(Field, Analysis.field_id == Field.id)
            .outerjoin(SpectralIndices, SpectralIndices.analysis_id == Analysis.id)
            .outerjoin(MLPrediction, MLPrediction.analysis_id == Analysis.id)
        )

        if not include_all:
            query = query.join(
                FieldAccess,
                (FieldAccess.field_id == Field.id)
                & (FieldAccess.user_id == user_id)
                & (FieldAccess.is_active.is_(True))
            )

        if field_id:
            query = query.filter(Field.id == field_id)

        if season_year is not None:
            query = query.filter(Analysis.season_year == season_year)

        effective_start = func.coalesce(Analysis.requested_start_date, func.date(Analysis.created_at))
        effective_end = func.coalesce(Analysis.requested_end_date, func.date(Analysis.created_at))

        if start_date is not None:
            query = query.filter(effective_end >= start_date)

        if end_date is not None:
            query = query.filter(effective_start <= end_date)

        return (
            query
            .order_by(Analysis.created_at.desc())
            .limit(limit)
            .all()
        )

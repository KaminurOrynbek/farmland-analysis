from sqlalchemy.orm import Session
from backend.infrastructure.database.models import User, Field, Analysis, SatelliteImage, SpectralIndices, MLPrediction

class FieldRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: str, name: str, geometry: dict, area_ha: float) -> Field:
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
            area_ha=area_ha
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

    def create_analysis(self, field_id: str, image_id: str) -> Analysis:
        # In this architecture, analysis has a many-to-many link to images via AnalysisImage
        analysis = Analysis(
            field_id=field_id,
            status="Processing",
            analysis_type="HEALTH_ANALYSIS" # Default type
        )
        self.db.add(analysis)
        self.db.flush() # Get the analysis ID

        from backend.infrastructure.database.models import AnalysisImage
        link = AnalysisImage(analysis_id=analysis.id, satellite_image_id=image_id)
        self.db.add(link)
        
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def save_results(self, analysis_id: str, indices_data: dict, ml_data: dict):
        # Save Spectral Indices
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
        
        # Save ML Predictions
        ml_pred = MLPrediction(
            analysis_id=analysis_id,
            crop_type_prediction=ml_data.get("crop_type"),
            confidence_score=ml_data.get("confidence"),
            vegetation_health_index=ml_data.get("vegetation_health_score"), # Value for index
            risk_level=ml_data.get("risk_level"),
            agronomic_assessment=ml_data.get("assessment")
        )
        self.db.add(ml_pred)
        
        # Update Analysis Status
        analysis = self.db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if analysis:
            analysis.status = "Completed"
            
        self.db.commit()
    
    def get_history(self, user_id: str, limit: int = 20):
        return (
            self.db.query(Analysis, Field, SpectralIndices, MLPrediction)
            .join(Field, Analysis.field_id == Field.id)
            .outerjoin(SpectralIndices, SpectralIndices.analysis_id == Analysis.id)
            .outerjoin(MLPrediction, MLPrediction.analysis_id == Analysis.id)
            .filter(Field.owner_id == user_id)
            .order_by(Analysis.created_at.desc())
            .limit(limit)
            .all()
        )
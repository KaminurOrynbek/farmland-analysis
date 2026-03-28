from sqlalchemy.orm import Session
from backend.infrastructure.database.models import User, Field, Analysis, SatelliteImage, SpectralIndices, MLPrediction

class FieldRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: str, name: str, geometry: dict, area_ha: float) -> Field:
        db_field = Field(
            user_id=user_id,
            name=name,
            boundary_geometry=geometry,
            area_ha=area_ha
        )
        self.db.add(db_field)
        self.db.commit()
        self.db.refresh(db_field)
        return db_field
        
    def get(self, field_id: str) -> Field:
        return self.db.query(Field).filter(Field.id == field_id).first()
        
    def get_by_user(self, user_id: str):
        return self.db.query(Field).filter(Field.user_id == user_id).all()

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
        analysis = Analysis(
            field_id=field_id,
            satellite_image_id=image_id,
            status="Processing"
        )
        self.db.add(analysis)
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
            stress_zones_detected=indices_data.get("stress_zones_count", 0)
        )
        self.db.add(indices)
        
        # Save ML Predictions
        ml_pred = MLPrediction(
            analysis_id=analysis_id,
            crop_type_prediction=ml_data.get("crop_type"),
            confidence_score=ml_data.get("confidence"),
            vegetation_health_index=ml_data.get("vegetation_health"),
            risk_level=ml_data.get("risk_level")
        )
        self.db.add(ml_pred)
        
        # Update Analysis Status
        analysis = self.db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if analysis:
            analysis.status = "Completed"
            
        self.db.commit()

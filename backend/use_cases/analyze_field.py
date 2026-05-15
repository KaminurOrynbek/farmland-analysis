import os
import urllib.request
import tempfile
from datetime import datetime
from sqlalchemy.orm import Session

from backend.infrastructure.database.repositories import FieldRepository, AnalysisRepository
from backend.infrastructure.satellite.gee_client import GEEClient
from backend.infrastructure.geospatial.raster_processor import RasterProcessor
from backend.infrastructure.ml.resnet_adapter import get_ml_adapter
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping

class AnalyzeFieldUseCase:
    def __init__(self, db_session: Session):
        self.field_repo = FieldRepository(db_session)
        self.analysis_repo = AnalysisRepository(db_session)
        
        # Instantiate adapters mapping to our external systems
        self.gee_client = GEEClient()
        self.raster_processor = RasterProcessor()
        self.ml_adapter = get_ml_adapter()
        
    def execute(self, field_id: str, start_date: str, end_date: str) -> dict:
        """
        Orchestrates the Clean Architecture pipeline for assessing a farmland field.
        """
        # 1. Domain: Fetch field from DB
        field = self.field_repo.get(field_id)
        if not field:
            raise ValueError(f"Field with ID {field_id} not found in database.")

        # 2. Infra: Start DB Analysis tracking
        sat_image = self.analysis_repo.create_satellite_image(
            field_id=field.id,
            platform="Sentinel-2",
            start_date=datetime.strptime(start_date, "%Y-%m-%d").date(),
            end_date=datetime.strptime(end_date, "%Y-%m-%d").date(),
            url=""
        )
        analysis_record = self.analysis_repo.create_analysis(field.id, sat_image.id)

        try:
            # 3. Infra: Fetch imagery URL from GEE
            print(f"Requesting GEE composite for field {field.name}...")
            geometry_dict = mapping(to_shape(field.boundary_geom))
            download_url = self.gee_client.get_median_composite_url(
                geometry_dict=geometry_dict,
                start_date=start_date,
                end_date=end_date
            )
            
            # Update satellite record with the fetched URL
            sat_image.download_url = download_url
            self.analysis_repo.db.commit()

            # 4. Process Imagery Locally
            print("Downloading composite TIFF locally...")
            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp_tif:
                urllib.request.urlretrieve(download_url, tmp_tif.name)
                tif_path = tmp_tif.name

            # 5. Infra: Calculate Exact Spectral Indices (NDVI, EVI)
            print("Calculating exact surface reflectance spectral indices...")
            indices_result = self.raster_processor.calculate_spectral_indices(tif_path)

            # 6. Infra: ML Model Inference (PyTorch ResNet-50)
            print("Running ResNet-50 model inference...")
            ml_result = self.ml_adapter.predict(tif_path)
            
            # 7. Domain: Save everything back to DB
            ndvi_mean = indices_result.get("ndvi_mean", 0)
            evi_mean = indices_result.get("evi_mean", None)

            if ndvi_mean >= 0.6:
                vegetation_health = 85
                risk_level = "Low"
            elif ndvi_mean >= 0.3:
                vegetation_health = 55
                risk_level = "Medium"
            else:
                vegetation_health = 25
                risk_level = "High"

            ml_result["vegetation_health"] = vegetation_health
            ml_result["risk_level"] = risk_level

            self.analysis_repo.save_results(analysis_record.id, indices_result, ml_result)

            if os.path.exists(tif_path):
                os.remove(tif_path)

            return {
                "status": "success",
                "crop_type": ml_result["crop_type"],
                "predicted_class": ml_result["predicted_class"],
                "confidence": ml_result["confidence"],
                "ndvi_value": ndvi_mean,
                "evi_value": evi_mean,
                "vegetation_health": vegetation_health,
                "risk_level": risk_level,
                "analyzed_area": field.area_ha,
                "stress_zones_count": indices_result.get("stress_zones_count", 0),
                "message": "Analysis completed using ResNet-50 classification and NDVI/EVI spectral indices."
            }
            
        except Exception as e:
            analysis_record.status = "Failed"
            self.analysis_repo.db.commit()
            raise RuntimeError(f"Analysis pipeline failed: {str(e)}")

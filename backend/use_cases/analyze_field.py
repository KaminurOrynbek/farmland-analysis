import os
import urllib.request
import tempfile
import logging
import json
from datetime import datetime
from sqlalchemy.orm import Session

from backend.infrastructure.database.repositories import FieldRepository, AnalysisRepository
from backend.infrastructure.database.models import AnalysisStatus
from backend.infrastructure.satellite.gee_client import GEEClient
from backend.infrastructure.geospatial.raster_processor import RasterProcessor
from backend.infrastructure.ml.resnet_adapter import get_ml_adapter
from backend.core.interfaces import FileStorage
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping

logger = logging.getLogger(__name__)

class AnalyzeFieldUseCase:
    def __init__(self, db_session: Session, storage: FileStorage):
        self.field_repo = FieldRepository(db_session)
        self.analysis_repo = AnalysisRepository(db_session)
        self.storage = storage 
        
        self.gee_client = GEEClient()
        self.raster_processor = RasterProcessor()
        self.ml_adapter = get_ml_adapter()
        
    def _log(self, level: str, job_id: str, phase: str, message: str, **kwargs):
        """Helper for Structured JSON Logging."""
        log_data = {
            "job_id": job_id,
            "phase": phase,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        log_data.update(kwargs)
        log_str = json.dumps(log_data)
        if level.upper() == "INFO":
            logger.info(log_str)
        elif level.upper() == "ERROR":
            logger.error(log_str)
        elif level.upper() == "WARNING":
            logger.warning(log_str)
            
    def execute(self, job_id: str, field_id: str, params: dict, output_prefix: str) -> dict:
        """
        Orchestrates the Clean Architecture pipeline for assessing a farmland field.
        Implements strict Job State Model and Idempotency.
        """
        self._log("INFO", job_id, "INIT", "Starting analysis execution pipeline.")
        
        field = self.field_repo.get(field_id)
        analysis = self.analysis_repo.get_by_id(job_id)
        
        if not field or not analysis:
            self._log("ERROR", job_id, "VALIDATION", "Validation failed: Field or Job not found.")
            raise ValueError("Field or Job not found.")

        try:
            # --- PHASE 1: DATA INGESTION (Idempotent via physical check) ---
            if not analysis.input_key or not self.storage.exists(analysis.input_key):
                self._log("INFO", job_id, "INGESTION_CHECK", "No valid input data found in S3. Starting ingestion from GEE.")
                self._ingest_data(analysis, field, params, job_id)
            else:
                self._log("INFO", job_id, "INGESTION_CHECK", "Data already ingested and verified in S3. Skipping ingestion.", input_key=analysis.input_key)

            # --- PHASE 2: PROCESSING (Idempotent via physical check) ---
            if not analysis.result_key or not self.storage.exists(analysis.result_key):
                self._log("INFO", job_id, "PROCESSING_CHECK", "Starting ML processing phase.")
                return self._process_data(analysis, field, job_id)
            else:
                self._log("INFO", job_id, "PROCESSING_CHECK", "Job already processed (result_key verified in S3). Skipping.")
                return {"status": "already_done", "job_id": job_id}
                
        except Exception as e:
            self._log("ERROR", job_id, "PIPELINE_FAILED", f"Pipeline failed: {str(e)}", error=str(e))
            self._update_job_state(analysis, AnalysisStatus.FAILED, analysis.progress_percent, f"Failed: {str(e)}")
            raise RuntimeError(f"Analysis pipeline failed: {str(e)}")

    def _ingest_data(self, analysis, field, params: dict, job_id: str):
        """Handles downloading from satellite provider and uploading to our Storage Source of Truth."""
        self._update_job_state(analysis, AnalysisStatus.INGESTING, 10, "Fetching raw data from satellite provider...")
        tmp_tif_path = None
        try:
            start_date = params.get("start_date", "2023-05-01")
            end_date = params.get("end_date", "2023-08-30")
            
            geometry_dict = mapping(to_shape(field.boundary_geom))
            download_url = self.gee_client.get_median_composite_url(
                geometry_dict=geometry_dict, start_date=start_date, end_date=end_date
            )
            
            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp_tif:
                urllib.request.urlretrieve(download_url, tmp_tif.name)
                tmp_tif_path = tmp_tif.name
                
            self._update_job_state(analysis, AnalysisStatus.INGESTING, 30, "Uploading raw image to cloud storage...")
            input_key = f"raw/{job_id}.tif"
            self.storage.upload(tmp_tif_path, input_key)
            
            # Save state
            analysis.input_key = input_key
            self.analysis_repo.db.commit()
            self._log("INFO", job_id, "INGESTION_DONE", "Ingestion successful.", input_key=input_key)
            
        finally:
            if tmp_tif_path and os.path.exists(tmp_tif_path):
                os.remove(tmp_tif_path)

    def _process_data(self, analysis, field, job_id: str) -> dict:
        """Handles downloading from Storage, ML inference, and DB updates."""
        self._update_job_state(analysis, AnalysisStatus.PROCESSING, 40, "Downloading imagery from cloud storage...")
        tmp_tif_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp_tif:
                tmp_tif_path = tmp_tif.name
                
            self.storage.download(analysis.input_key, tmp_tif_path)
            
            self._update_job_state(analysis, AnalysisStatus.PROCESSING, 50, "Calculating spectral indices...")
            indices_result = self.raster_processor.calculate_spectral_indices(tmp_tif_path)

            self._update_job_state(analysis, AnalysisStatus.PROCESSING, 70, "Performing ML classification...")
            ml_result = self.ml_adapter.predict(tmp_tif_path)
            
            self._update_job_state(analysis, AnalysisStatus.PROCESSING, 90, "Generating expert assessment...")
            ndvi_mean = indices_result.get("ndvi_mean", 0)
            
            from backend.services.agronomic_service import AgronomicService
            assessment = AgronomicService.generate_assessment(
                ndvi=ndvi_mean, stress_percentage=indices_result.get("stress_area_percentage", 0), crop_type=ml_result["crop_type"]
            )
            
            vegetation_health = assessment["overall_status"]
            ml_result["vegetation_health_score"] = 85 if vegetation_health == "Healthy" else 55 if vegetation_health == "Warning" else 25
            ml_result["risk_level"] = "High" if vegetation_health == "Critical" else "Medium" if vegetation_health == "Warning" else "Low"
            ml_result["assessment"] = assessment

            # Generate pseudo result file to represent validated DONE status
            self._update_job_state(analysis, AnalysisStatus.PROCESSING, 95, "Uploading results metadata to storage...")
            result_key = f"results/{job_id}_metadata.json"
            with tempfile.NamedTemporaryFile(mode='w', suffix=".json", delete=False) as tmp_meta:
                json.dump(ml_result, tmp_meta)
                tmp_meta_path = tmp_meta.name
                
            self.storage.upload(tmp_meta_path, result_key)
            os.remove(tmp_meta_path)
            
            analysis.result_key = result_key
            self.analysis_repo.save_results(job_id, indices_result, ml_result)
            self._update_job_state(analysis, AnalysisStatus.DONE, 100, "Analysis completed successfully.")
            self._log("INFO", job_id, "PROCESSING_DONE", "Processing successful.", result_key=result_key)

            return {
                "status": "success",
                "job_id": job_id,
                "input_key": analysis.input_key,
                "result_key": analysis.result_key,
                "crop_type": ml_result["crop_type"],
                "health": vegetation_health
            }
        finally:
            if tmp_tif_path and os.path.exists(tmp_tif_path):
                os.remove(tmp_tif_path)

    def _update_job_state(self, analysis, status: AnalysisStatus, progress: int, stage: str):
        analysis.status = status
        self.analysis_repo.update_progress(str(analysis.id), progress, stage)

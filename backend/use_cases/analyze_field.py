import os
import urllib.request
import tempfile
import logging
import json
from datetime import datetime, timezone
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

def _derive_risk_level(
    ndvi_mean: float | None,
    evi_mean: float | None,
    stress_percentage: float | None
) -> str:
    if ndvi_mean is None or evi_mean is None:
        return "Unknown"

    stress_percentage = float(stress_percentage or 0)
    stress_ratio = min(stress_percentage / 100, 1)

    vegetation_health_score = (
        0.40 * ndvi_mean +
        0.40 * evi_mean +
        0.20 * (1 - stress_ratio)
    )

    if (
        vegetation_health_score < 0.35
        or ndvi_mean < 0.25
        or evi_mean < 0.20
        or stress_percentage >= 25
    ):
        return "High"

    if (
        vegetation_health_score < 0.55
        or ndvi_mean < 0.50
        or evi_mean < 0.35
        or stress_percentage >= 10
    ):
        return "Medium"

    return "Low"


def _build_quality_flags(indices_result: dict, ml_result: dict) -> list | None:
    flags = list(indices_result.get("quality_flags") or [])

    confidence = ml_result.get("confidence")
    if confidence is not None and float(confidence) < 0.55:
        flags.append("LOW_CLASSIFICATION_CONFIDENCE")

    return flags or None

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
            "timestamp": datetime.now(timezone.utc).isoformat()
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
            
            self._update_job_state(analysis, AnalysisStatus.PROCESSING, 90, "Preparing screening metadata...")
            ndvi_mean = indices_result.get("ndvi_mean")
            evi_mean = indices_result.get("evi_mean")
            stress_percentage = indices_result.get("stress_area_percentage", 0)
            predicted_class = ml_result.get("predicted_class") or ml_result.get("crop_type")
            quality_flags = _build_quality_flags(indices_result, ml_result)

            ml_result["predicted_class"] = predicted_class
            ml_result["crop_type"] = predicted_class
            ml_result["risk_level"] = _derive_risk_level(ndvi_mean, evi_mean,stress_percentage)
            ml_result["quality_flags"] = quality_flags

            # Generate pseudo result file to represent validated DONE status
            self._update_job_state(analysis, AnalysisStatus.PROCESSING, 95, "Uploading results metadata to storage...")
            result_key = f"results/{job_id}_metadata.json"
            with tempfile.NamedTemporaryFile(mode='w', suffix=".json", delete=False) as tmp_meta:
                json.dump(
                    {
                        "predicted_class": predicted_class,
                        "confidence": ml_result.get("confidence"),
                        "risk_level": ml_result.get("risk_level"),
                        "quality_flags": quality_flags,
                        "ndvi_value": indices_result.get("ndvi_mean"),
                        "evi_value": indices_result.get("evi_mean")
                    },
                    tmp_meta
                )
                tmp_meta_path = tmp_meta.name
                
            self.storage.upload(tmp_meta_path, result_key)
            os.remove(tmp_meta_path)
            
            analysis.result_key = result_key
            self.analysis_repo.save_results(
                job_id,
                indices_result,
                ml_result,
                analysis_metadata={"quality_flags": quality_flags}
            )
            self._update_job_state(analysis, AnalysisStatus.DONE, 100, "Analysis completed successfully.")
            self._log("INFO", job_id, "PROCESSING_DONE", "Processing successful.", result_key=result_key)

            return {
                "status": "success",
                "job_id": job_id,
                "input_key": analysis.input_key,
                "result_key": analysis.result_key,
                "predicted_class": predicted_class,
                "risk_level": ml_result["risk_level"]
            }
        finally:
            if tmp_tif_path and os.path.exists(tmp_tif_path):
                os.remove(tmp_tif_path)

    def _update_job_state(self, analysis, status: AnalysisStatus, progress: int, stage: str):
        analysis.status = status
        self.analysis_repo.update_progress(str(analysis.id), progress, stage)

from backend.infrastructure.celery.celery_app import celery_app
from backend.infrastructure.database.database import SessionLocal
from backend.use_cases.analyze_field import AnalyzeFieldUseCase
from backend.infrastructure.database.repositories import FieldRepository, AnalysisRepository
from backend.infrastructure.satellite.gee_client import GEEClient
from backend.infrastructure.ml.resnet_adapter import get_ml_adapter
from backend.infrastructure.geospatial.raster_processor import RasterProcessor

@celery_app.task(bind=True, name="run_analysis_task")
def run_analysis_task(self, field_id: str, start_date: str, end_date: str, analysis_id: str):
    """
    Background task to run the full analysis pipeline with progress updates.
    """
    db = SessionLocal()
    try:
        self.update_state(state='PROGRESS', meta={'progress': 10, 'status': 'Initializing environment...'})
        
        # Initialize dependencies
        field_repo = FieldRepository(db)
        analysis_repo = AnalysisRepository(db)
        gee_client = GEEClient()
        ml_adapter = get_ml_adapter()
        raster_processor = RasterProcessor()
        
        use_case = AnalyzeFieldUseCase(
            field_repo=field_repo,
            analysis_repo=analysis_repo,
            gee_client=gee_client,
            ml_adapter=ml_adapter,
            raster_processor=raster_processor
        )
        
        # We pass analysis_id to the use case so it can update the DB directly
        result = use_case.execute(field_id, start_date, end_date, analysis_id=analysis_id)
        
        print(f"Task {self.request.id}: Analysis completed successfully.")
        return result
        
    except Exception as e:
        print(f"Task {self.request.id}: Failed with error: {str(e)}")
        # In case of failure, the use_case already handles some DB updates, 
        # but we could add more robust retry logic here.
        raise self.retry(exc=e, countdown=10, max_retries=3)
    finally:
        db.close()

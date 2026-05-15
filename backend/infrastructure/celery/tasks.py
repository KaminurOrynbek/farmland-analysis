from backend.infrastructure.celery.celery_app import celery_app
from backend.infrastructure.database.database import SessionLocal
from backend.use_cases.analyze_field import AnalyzeFieldUseCase

@celery_app.task(
    bind=True, 
    name="run_analysis_task",
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True, # Exponential backoff (e.g. 30s, 60s, 120s)
    retry_backoff_max=600, # Cap at 10 minutes
    retry_jitter=True # Add randomness to prevent thundering herd
)
def run_analysis_task(self, job_id: str, field_id: str, params: dict, output_prefix: str):
    """
    Background task to run the full analysis pipeline.
    Implements production-ready exponential backoff retries.
    """
    db = SessionLocal()
    try:
        from backend.infrastructure.storage.storage_provider import get_storage
        storage = get_storage()

        use_case = AnalyzeFieldUseCase(db_session=db, storage=storage)

        result = use_case.execute(
            job_id=job_id,
            field_id=field_id,
            params=params,
            output_prefix=output_prefix
        )

        print(f"Task {self.request.id}: Analysis {job_id} completed successfully.")
        return result

    except Exception as e:
        print(f"Task {self.request.id}: Failed with error: {str(e)}. Retrying...")
        # celery will auto-retry based on the decorator settings
        raise
    finally:
        db.close()

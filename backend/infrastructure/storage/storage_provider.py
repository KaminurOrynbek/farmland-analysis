from backend.core.config import settings
from backend.infrastructure.storage.s3_storage import S3FileStorage

def get_storage() -> S3FileStorage:
    """
    Dependency factory for FileStorage implementation.
    Reads credentials from centralized Settings — no hardcoded values.
    """
    return S3FileStorage(
        endpoint_url=settings.MINIO_URL,
        access_key=settings.MINIO_ROOT_USER,
        secret_key=settings.MINIO_ROOT_PASSWORD,
        default_bucket=settings.MINIO_BUCKET_RAW
    )

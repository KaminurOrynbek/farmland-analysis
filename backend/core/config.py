import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

    PROJECT_NAME: str = "Farmland Image Analysis System"
    VERSION: str = "1.0.0"
    
    # Database Settings (PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/farmland")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7") # Change in production!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    
    # External APIs
    EE_PROJECT_ID: str = os.getenv("EE_PROJECT_ID", "farmland-499012")
    EE_CREDENTIALS_PATH: str = os.getenv("EE_CREDENTIALS_PATH", "gee_service_account.json")
    EE_SERVICE_ACCOUNT: str = os.getenv("EE_SERVICE_ACCOUNT", "your-service-account@project.iam.gserviceaccount.com")
    
    # Machine Learning
    RESNET_WEIGHTS_PATH: str = os.getenv(
        "RESNET_WEIGHTS_PATH",
        "backend/infrastructure/ml/models/best_resnet_satellite_model.pth"
    )

    ML_ARTIFACTS_PATH: str = os.getenv(
        "ML_ARTIFACTS_PATH",
        "backend/infrastructure/ml/models/ml_artifacts.json"
    )

    # Object Storage (MinIO / S3-compatible)
    MINIO_URL: str = os.getenv("MINIO_URL", "http://minio:9000")
    MINIO_ROOT_USER: str = os.getenv("MINIO_ROOT_USER", "admin")
    MINIO_ROOT_PASSWORD: str = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
    MINIO_BUCKET_RAW: str = os.getenv("MINIO_BUCKET_RAW", "satellite-data")
    MINIO_BUCKET_RESULTS: str = os.getenv("MINIO_BUCKET_RESULTS", "analysis-results")
        
settings = Settings()

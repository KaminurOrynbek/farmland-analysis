import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Farmland Image Analysis System"
    VERSION: str = "1.0.0"
    
    # Database Settings (PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/farmland")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7") # Change in production!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    
    # External APIs
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
        
    class Config:
        env_file = ".env"

settings = Settings()

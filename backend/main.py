from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import core architecture modules
from backend.core.config import settings
from backend.infrastructure.database.database import engine, Base
# Import all models so SQLAlchemy discovers them and creates the tables
from backend.infrastructure.database import models

from backend.routers import health, satellite, geo, analysis

# Automatically generate database tables 
# (In production, you'd use Alembic migrations instead of create_all)
try:
    print(f"Connecting to Database: {settings.DATABASE_URL.split('@')[-1]}")
    Base.metadata.create_all(bind=engine)
    print("Database synced successfully.")
except Exception as e:
    print(f"CRITICAL WARNING: Database connection failed. Please ensure PostgreSQL is running. Error: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for agricultural farmland analysis using satellite imagery and geospatial data. Powered by Clean Architecture.",
    version=settings.VERSION
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with specific React origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(geo.router, prefix="/api/geo", tags=["Geospatial"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
# satellite.router logic is now mostly absorbed by analysis automatically, 
# but kept here if direct manual fetching is needed
try:
    app.include_router(satellite.router, prefix="/api/satellite", tags=["Satellite"])
except Exception:
    pass

@app.get("/")
async def root():
    return {"message": "Welcome to Farmland Image Analysis API (Clean Architecture + PostgreSQL)"}

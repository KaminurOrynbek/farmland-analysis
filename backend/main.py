from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
import asyncio

# Import core architecture modules
from backend.core.config import settings
from backend.infrastructure.database.database import engine, Base
from backend.infrastructure.database import models
from backend.routers import health, satellite, geo, analysis, auth, admin, comments
from backend.core.websocket_manager import redis_listener

# Automatically generate database tables
try:
    print(f"Connecting to Database: {settings.DATABASE_URL.split('@')[-1]}")
    Base.metadata.create_all(bind=engine)
    print("Database synced successfully.")
except Exception as e:
    print(f"CRITICAL WARNING: Database connection failed. Error: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for agricultural farmland analysis.",
    version=settings.VERSION
)

@app.on_event("startup")
async def startup_event():
    # Start the Redis listener as a background task
    asyncio.create_task(redis_listener())

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Internal Server Error", "detail": str(exc)},
    )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(geo.router, prefix="/api/geo", tags=["Geospatial"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(comments.router, prefix="/api/fields", tags=["Field Comments"])

try:
    app.include_router(satellite.router, prefix="/api/satellite", tags=["Satellite"])
except Exception:
    pass

@app.get("/")
async def root():
    return {"message": "Welcome to Farmland Image Analysis API"}

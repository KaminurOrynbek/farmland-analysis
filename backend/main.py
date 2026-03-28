from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import health, satellite, geo, analysis

app = FastAPI(
    title="Farmland Image Analysis System API",
    description="Backend API for agricultural farmland analysis using satellite imagery and geospatial data.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(satellite.router, prefix="/api", tags=["Satellite"])
app.include_router(geo.router, prefix="/api", tags=["Geospatial"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])

@app.get("/")
async def root():
    return {"message": "Welcome to Farmland Image Analysis System API", "docs": "/docs"}

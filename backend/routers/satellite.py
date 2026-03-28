from fastapi import APIRouter, HTTPException
from backend.schemas.satellite import SatelliteRetrievalRequest, SatelliteRetrievalResponse
from backend.services.satellite_service import satellite_service

router = APIRouter()

@router.post("/fetch-satellite-data", response_model=SatelliteRetrievalResponse)
async def fetch_satellite_data(request: SatelliteRetrievalRequest):
    """
    Endpoint to trigger satellite data retrieval (simulation).
    """
    try:
        metadata = satellite_service.fetch_satellite_metadata(
            dataset=request.dataset,
            bbox=request.bbox
        )
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

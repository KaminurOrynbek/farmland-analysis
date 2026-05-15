from fastapi import APIRouter, HTTPException, Depends
from backend.schemas.satellite import SatelliteRetrievalRequest, SatelliteRetrievalResponse
from backend.services.satellite_service import satellite_service
from backend.routers.deps import get_current_active_user
from backend.infrastructure.database.models import User

router = APIRouter()

@router.post("/fetch-satellite-data", response_model=SatelliteRetrievalResponse)
async def fetch_satellite_data(
    request: SatelliteRetrievalRequest,
    current_user: User = Depends(get_current_active_user)
):
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

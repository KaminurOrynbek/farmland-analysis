from datetime import date
from pydantic import BaseModel
from typing import List, Optional

class SatelliteRetrievalRequest(BaseModel):
    dataset: str
    bbox: List[float]
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    season_year: Optional[int] = None

class SatelliteRetrievalResponse(BaseModel):
    dataset: str
    satellite_source: str
    acquisition_date: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    season_year: Optional[int] = None
    resolution: str
    bbox: List[float]
    cloud_coverage: Optional[float] = None
    quality_flags: Optional[List[str]] = None
    status: str

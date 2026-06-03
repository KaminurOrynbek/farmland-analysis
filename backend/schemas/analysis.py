from datetime import date
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

class AnalysisRequest(BaseModel):
    field_id: Optional[str] = None
    bbox: Optional[List[float]] = None
    parameters: Optional[Dict[str, Any]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    season_year: Optional[int] = None
    satellite_source: Optional[str] = None
    satellite_acquisition_date: Optional[date] = None
    cloud_coverage: Optional[float] = None
    quality_flags: Optional[List[str]] = None

from pydantic import BaseModel
from typing import Dict, Any, Optional

class AnalysisRequest(BaseModel):
    image_id: str
    parameters: Optional[Dict[str, Any]] = None

class AnalysisResult(BaseModel):
    status: str
    vegetation_health: int
    crop_type: str
    confidence: float
    analyzed_area: float
    stress_zones_count: int
    ndvi_value: float
    risk_level: str

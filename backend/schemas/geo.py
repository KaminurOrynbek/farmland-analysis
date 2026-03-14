from pydantic import BaseModel
from typing import List, Dict, Any

class GeoData(BaseModel):
    type: str
    features: List[Dict[str, Any]]

class GeoJSONUploadResponse(BaseModel):
    status: str
    feature_count: int
    detected_type: str
    message: str

from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class GeoData(BaseModel):
    type: str
    features: List[Dict[str, Any]]

class FieldGeometry(BaseModel):
    feature_index: int
    geometry_type: str
    bounds: List[float]
    centroid: List[float]
    area_m2: float
    area_ha: float

class GeoJSONUploadResponse(BaseModel):
    status: str
    features: int
    bbox: List[float]
    crs: str
    total_area_m2: float
    total_area_ha: float
    field_geometries: List[FieldGeometry]
    message: str

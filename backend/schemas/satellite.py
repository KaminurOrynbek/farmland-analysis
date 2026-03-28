from pydantic import BaseModel
from typing import List

class SatelliteRetrievalRequest(BaseModel):
    dataset: str
    bbox: List[float]

class SatelliteRetrievalResponse(BaseModel):
    dataset: str
    acquisition_date: str
    resolution: str
    bbox: List[float]
    status: str

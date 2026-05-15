from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid

from backend.infrastructure.database.database import get_db
from backend.infrastructure.database import models
from backend.infrastructure.database.repositories import FieldRepository
from backend.services.geo_service import process_geojson_upload
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping

router = APIRouter()

class CreateFieldRequest(BaseModel):
    name: Optional[str] = "Unnamed Field"
    geometry: Dict[str, Any]
    area_ha: Optional[float] = 0.0

@router.post("/fields")
def save_field_boundary(request: CreateFieldRequest, db: Session = Depends(get_db)):
    """
    Saves uploaded GeoJSON to the PostgreSQL database so it can be analyzed.
    """
    try:
        repo = FieldRepository(db)
        # Using a mock user ID for prototype until JWT Auth UseCase is fully wired
        demo_user_id = str(uuid.UUID("00000000-0000-0000-0000-000000000000"))
        
        # Guard: Ensure the user actually exists in Postgres to prevent Foreign Key constraints
        user = db.query(models.User).filter(models.User.id == demo_user_id).first()
        if not user:
            new_user = models.User(id=demo_user_id, email="demo@example.com", password_hash="empty")
            db.add(new_user)
            db.commit()
        
        metadata = process_geojson_upload({
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": request.geometry,
                    "properties": {}
                }
            ]
        })

        calculated_area_ha = metadata["total_area_ha"]

        field = repo.create(
            user_id=demo_user_id,
            name=request.name,
            geometry=request.geometry,
            area_ha=calculated_area_ha
        )
        
        return {
            "status": "success",
            "message": "Field successfully saved to Database",
            "data": {
                "field_id": field.id,
                "name": field.name,
                "area_ha": field.area_ha
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fields")
def get_all_fields(db: Session = Depends(get_db)):
    """ Retrieves fields for the React Map """
    try:
        repo = FieldRepository(db)
        # In a real app, grab from JWT token depending on the user
        demo_user_id = "00000000-0000-0000-0000-000000000000"
        fields = repo.get_by_user(demo_user_id)
        
        return {
            "status": "success",
            "data": [
                {
                    "id": f.id,
                    "name": f.name,
                    "area_ha": float(f.area_ha) if f.area_ha else 0.0,
                    "geometry": mapping(to_shape(f.boundary_geom)) if f.boundary_geom else None
                } for f in fields
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

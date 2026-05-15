from sqlalchemy.orm import Session
from typing import Dict, Any, List
from backend.infrastructure.database.repositories import FieldRepository
from backend.services.geo_service import process_geojson_upload
from backend.infrastructure.database.models import User
from shapely.geometry import mapping
from geoalchemy2.shape import to_shape

class FieldService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = FieldRepository(db)

    def create_field(self, user: User, name: str, geometry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes geometry and saves a new field for the user.
        """
        # 1. Process GeoJSON (calculate area, etc)
        # We wrap the geometry in a FeatureCollection as expected by the geo_service
        metadata = process_geojson_upload({
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": geometry,
                    "properties": {}
                }
            ]
        })

        calculated_area_ha = metadata["total_area_ha"]

        # 2. Create in DB
        field = self.repo.create(
            user_id=str(user.id),
            name=name,
            geometry=geometry,
            area_ha=calculated_area_ha
        )
        
        return {
            "id": field.id,
            "name": field.name,
            "area_ha": float(field.area_ha) if field.area_ha else 0.0,
            "geometry": field.boundary_geom
        }

    def get_user_fields(self, user: User) -> List[Dict[str, Any]]:
        """
        Retrieves all fields belonging to the user.
        """
        fields = self.repo.get_by_user(str(user.id))
        
        result = []
        for f in fields:
            # Since boundary_geom is JSONB, we just return it directly
            result.append({
                "id": f.id,
                "name": f.name,
                "area_ha": float(f.area_ha) if f.area_ha else 0.0,
                "geometry": f.boundary_geom
            })
        return result

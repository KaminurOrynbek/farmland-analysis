import json
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from backend.services.geo_service import get_field_boundaries
from backend.schemas.geo import GeoJSONUploadResponse

router = APIRouter()

@router.get("/geo/boundaries")
async def boundaries():
    # Placeholder for fetching field boundaries
    return get_field_boundaries()

@router.post("/upload-geojson", response_model=GeoJSONUploadResponse)
async def upload_geojson(file: UploadFile = File(...)):
    # Validate extension
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ["geojson", "json"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only .geojson and .json files are allowed."
        )

    try:
        content = await file.read()
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON format."
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error reading file."
        )
    finally:
        await file.close()

    # Basic GeoJSON validation
    detected_type = data.get("type", "Unknown")
    features = data.get("features", [])
    
    if not isinstance(features, list):
        # Could be a single Feature or Geometry, but FeatureCollection is preferred
        if detected_type == "Feature":
            features = [data]
        else:
            features = []

    if not features and detected_type != "Feature":
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GeoJSON structure. Expected a FeatureCollection or Feature."
        )

    return {
        "status": "success",
        "feature_count": len(features),
        "detected_type": detected_type,
        "message": "GeoJSON uploaded successfully"
    }

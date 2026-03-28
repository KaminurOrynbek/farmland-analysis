import json
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from backend.services.geo_service import get_field_boundaries, process_geojson_upload
from backend.schemas.geo import GeoJSONUploadResponse

router = APIRouter()

@router.get("/geo/boundaries")
async def boundaries():
    return get_field_boundaries()

@router.post("/upload-geojson", response_model=GeoJSONUploadResponse)
async def upload_geojson(file: UploadFile = File(...)):
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
    finally:
        await file.close()

    try:
        metadata = process_geojson_upload(data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {
        "status": "success",
        "message": "GeoJSON processed successfully",
        **metadata
    }

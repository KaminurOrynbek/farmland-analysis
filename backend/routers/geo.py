from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import uuid

from backend.infrastructure.database.database import get_db
from backend.routers.deps import get_current_active_user
from backend.infrastructure.database.models import User
from backend.services.field_service import FieldService

router = APIRouter()

class CreateFieldRequest(BaseModel):
    name: Optional[str] = "Unnamed Field"
    geometry: Dict[str, Any]

class ShareFieldRequest(BaseModel):
    field_id: uuid.UUID
    email: str
    role: str = "VIEWER" # OWNER, EDITOR, VIEWER

@router.post("/fields")
def save_field_boundary(
    request: CreateFieldRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Saves uploaded GeoJSON to the PostgreSQL database so it can be analyzed.
    """
    try:
        service = FieldService(db)
        field_data = service.create_field(
            user=current_user,
            name=request.name,
            geometry=request.geometry
        )
        
        return {
            "status": "success",
            "message": "Field successfully saved to Database",
            "data": field_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save field: {str(e)}")

@router.get("/fields")
def get_all_fields(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """ Retrieves fields for the React Map """
    try:
        service = FieldService(db)
        fields = service.get_user_fields(current_user)
        
        return {
            "status": "success",
            "data": fields
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch fields: {str(e)}")

@router.post("/fields/share")
def share_field(
    request: ShareFieldRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Shares a field with another user by email.
    """
    try:
        service = FieldService(db)
        result = service.share_field(
            owner=current_user,
            field_id=request.field_id,
            target_user_email=request.email,
            role=request.role
        )
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to share field: {str(e)}")

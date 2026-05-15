from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid

from backend.infrastructure.database.database import get_db
from backend.routers.deps import get_current_active_user, FieldPermissionChecker
from backend.infrastructure.database.models import User, FieldAccessRole, FieldComment

router = APIRouter()

@router.post("/{field_id}/comments", dependencies=[Depends(FieldPermissionChecker(FieldAccessRole.EDITOR))])
def add_field_comment(
    field_id: uuid.UUID,
    comment_text: str,
    markers: List[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """ Adds a comment with optional map markers (Editor level) """
    new_comment = FieldComment(
        field_id=field_id,
        author_id=current_user.id,
        comment=comment_text,
        markers=markers
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

@router.get("/{field_id}/comments", dependencies=[Depends(FieldPermissionChecker(FieldAccessRole.VIEWER))])
def get_field_comments(
    field_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """ Retrieves all comments for a field (Viewer level) """
    comments = (
        db.query(FieldComment)
        .filter(FieldComment.field_id == field_id)
        .order_by(FieldComment.created_at.desc())
        .all()
    )
    return comments

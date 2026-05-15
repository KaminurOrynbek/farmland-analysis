from sqlalchemy.orm import Session
from backend.infrastructure.database.models import AuditLog
from typing import Any, Dict, Optional
import uuid

class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log_action(
        self,
        user_id: uuid.UUID,
        action: str,
        entity_type: str,
        entity_id: uuid.UUID,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Records a security or business event in the audit_logs table.
        """
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            metadata_json=metadata
        )
        self.db.add(log_entry)
        self.db.commit()
        return log_entry

from sqlalchemy.orm import Session, aliased
from sqlalchemy import or_
from typing import Dict, Any, List, Optional
from uuid import UUID
from backend.infrastructure.database.repositories import FieldRepository
from backend.services.geo_service import process_geojson_upload
from backend.infrastructure.database.models import User, FieldAccess, Field
from backend.infrastructure.database.models import FieldAccessRole as Role
from backend.services.audit_service import AuditService
from fastapi import HTTPException

class FieldService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = FieldRepository(db)

    def create_field(
        self,
        user: User,
        name: str,
        geometry: Dict[str, Any],
        crop_type: Optional[str] = None,
        planting_date = None,
        season_year: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Processes geometry and saves a new field for the user.
        """
        metadata = process_geojson_upload({
            "type": "FeatureCollection",
            "features": [{"type": "Feature", "geometry": geometry, "properties": {}}]
        })

        calculated_area_ha = metadata["total_area_ha"]

        field = self.repo.create(
            user_id=user.id,
            name=name,
            geometry=geometry,
            area_ha=calculated_area_ha,
            crop_type=crop_type,
            planting_date=planting_date,
            season_year=season_year
        )

        # Automatically grant OWNER access to the creator in the field_access table
        access = FieldAccess(
            field_id=field.id,
            user_id=user.id,
            access_role=Role.OWNER 
        )
        self.db.add(access)
        self.db.commit()

        AuditService(self.db).log_action(
            user_id=user.id,
            action="FIELD_CREATED",
            entity_type="field",
            entity_id=field.id,
            new_values={
                "name": field.name,
                "area_ha": float(field.area_ha) if field.area_ha else 0.0,
                "owner_id": str(user.id)
            }
        )
        
        from geoalchemy2.shape import to_shape
        from shapely.geometry import mapping
        
        return {
            "id": field.id,
            "name": field.name,
            "area_ha": float(field.area_ha) if field.area_ha else 0.0,
            "geometry": mapping(to_shape(field.boundary_geom)),
            "role": "OWNER",
            "crop_type": field.crop_type,
            "planting_date": field.planting_date.isoformat() if field.planting_date else None,
            "season_year": field.season_year
        }

    def get_user_fields(self, user: User) -> List[Dict[str, Any]]:
        """
        Retrieves all fields belonging to the user or where they have access.
        """
        from geoalchemy2.shape import to_shape
        from shapely.geometry import mapping

        user_role = user.role.value if hasattr(user.role, "value") else str(user.role)
        owner_alias = aliased(User)

        if user_role == "ADMIN":
            all_fields = (
                self.db.query(Field, owner_alias.id, owner_alias.email, owner_alias.full_name)
                .join(owner_alias, Field.owner_id == owner_alias.id)
                .order_by(Field.created_at.desc())
                .all()
            )

            return [
                {
                    "id": field.id,
                    "name": field.name,
                    "area_ha": float(field.area_ha) if field.area_ha else 0.0,
                    "geometry": mapping(to_shape(field.boundary_geom)),
                    "role": "ADMIN",
                    "owner_id": owner_id,
                    "owner_email": owner_email,
                    "owner_name": owner_name,
                    "crop_type": field.crop_type,
                    "planting_date": field.planting_date.isoformat() if field.planting_date else None,
                    "season_year": field.season_year,
                    "created_at": field.created_at.isoformat() if field.created_at else None
                }
                for field, owner_id, owner_email, owner_name in all_fields
            ]

        fields_with_access = (
            self.db.query(
                Field,
                FieldAccess.access_role,
                owner_alias.id,
                owner_alias.email,
                owner_alias.full_name
            )
            .join(FieldAccess, Field.id == FieldAccess.field_id)
            .join(owner_alias, Field.owner_id == owner_alias.id)
            .filter(FieldAccess.user_id == user.id)
            .order_by(Field.created_at.desc())
            .all()
        )

        result = []
        for f, role, owner_id, owner_email, owner_name in fields_with_access:
            role_str = role.value if hasattr(role, 'value') else str(role)
            result.append({
                "id": f.id,
                "name": f.name,
                "area_ha": float(f.area_ha) if f.area_ha else 0.0,
                "geometry": mapping(to_shape(f.boundary_geom)),
                "role": role_str,
                "owner_id": owner_id,
                "owner_email": owner_email,
                "owner_name": owner_name,
                "crop_type": f.crop_type,
                "planting_date": f.planting_date.isoformat() if f.planting_date else None,
                "season_year": f.season_year,
                "created_at": f.created_at.isoformat() if f.created_at else None
            })
        return result

    def share_field(self, owner: User, field_id: UUID, target_user_email: str, role: str) -> Dict[str, Any]:
        """
        Shares a field with another user.
        """
        owner_role = owner.role.value if hasattr(owner.role, "value") else str(owner.role)

        # 1. Check if field exists and current user is OWNER
        field = self.db.query(Field).filter(Field.id == field_id).first()
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        
        if owner_role != "ADMIN" and field.owner_id != owner.id:
            # Check if user has OWNER role in field_access (just in case)
            access = self.db.query(FieldAccess).filter(
                FieldAccess.field_id == field_id, 
                FieldAccess.user_id == owner.id,
                FieldAccess.access_role == Role.OWNER
            ).first()
            if not access:
                raise HTTPException(status_code=403, detail="Only owners can share fields")

        # 2. Find target user
        from backend.infrastructure.database.models import User as UserModel
        target_user = self.db.query(UserModel).filter(UserModel.email == target_user_email).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User to share with not found")

        # 3. Create or update access
        existing_access = self.db.query(FieldAccess).filter(
            FieldAccess.field_id == field_id,
            FieldAccess.user_id == target_user.id
        ).first()

        action = "FIELD_SHARED"

        if existing_access:
            existing_access.access_role = Role(role)
            action = "FIELD_ACCESS_UPDATED"
        else:
            new_access = FieldAccess(
                field_id=field_id,
                user_id=target_user.id,
                access_role=Role(role),
                granted_by=owner.id
            )
            self.db.add(new_access)
        
        self.db.commit()

        AuditService(self.db).log_action(
            user_id=owner.id,
            action=action,
            entity_type="field",
            entity_id=field_id,
            metadata={
                "target_user_id": str(target_user.id),
                "target_user_email": target_user.email,
                "role": role
            }
        )
        return {"status": "success", "message": f"Field shared with {target_user_email} as {role}"}

    def get_field_team(self, field_id: UUID) -> List[Dict[str, Any]]:
        """
        Lists all users who have access to a specific field.
        """
        team = (
            self.db.query(FieldAccess, User.email, User.full_name)
            .join(User, FieldAccess.user_id == User.id)
            .filter(FieldAccess.field_id == field_id)
            .all()
        )
        
        return [
            {
                "user_id": access.user_id,
                "email": email,
                "full_name": full_name,
                "role": access.access_role.value if hasattr(access.access_role, 'value') else str(access.access_role),
                "granted_at": access.granted_at
            }
            for access, email, full_name in team
        ]

    def revoke_access(self, field_id: UUID, user_id: UUID, revoked_by: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Removes a user's access to a field.
        """
        access = self.db.query(FieldAccess).filter(
            FieldAccess.field_id == field_id,
            FieldAccess.user_id == user_id
        ).first()
        
        if not access:
            raise HTTPException(status_code=404, detail="Access record not found")
        
        if access.access_role == Role.OWNER:
             raise HTTPException(status_code=400, detail="Cannot revoke access from an OWNER. Delete the field instead.")

        self.db.delete(access)
        self.db.commit()

        if revoked_by:
            AuditService(self.db).log_action(
                user_id=revoked_by,
                action="FIELD_ACCESS_REVOKED",
                entity_type="field",
                entity_id=field_id,
                metadata={
                    "revoked_user_id": str(user_id)
                }
            )

        return {"status": "success", "message": "Access revoked"}

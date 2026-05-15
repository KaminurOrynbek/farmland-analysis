from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from backend.infrastructure.database.models import User
from backend.schemas.user import UserCreate, UserUpdate
from backend.core.security import get_password_hash

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get(self, id: UUID) -> Optional[User]:
        return self.db.query(User).filter(User.id == id).first()

    def create(self, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            password_hash=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            role=obj_in.role.value if hasattr(obj_in.role, 'value') else obj_in.role,
            is_active=True
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: User, obj_in: UserUpdate) -> User:
        if obj_in.password:
            db_obj.password_hash = get_password_hash(obj_in.password)
        if obj_in.email:
            db_obj.email = obj_in.email
        if obj_in.full_name:
            db_obj.full_name = obj_in.full_name
        if obj_in.role:
            db_obj.role = obj_in.role.value if hasattr(obj_in.role, 'value') else obj_in.role
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

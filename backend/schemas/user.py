from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    FARMER = "FARMER"
    AGRONOMIST = "AGRONOMIST"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.FARMER

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None

class UserInDBBase(UserBase):
    id: UUID
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    password_hash: str

from pydantic import BaseModel, EmailStr
from typing import Optional
from backend.schemas.user import UserCreate, UserRole

class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.FARMER

class AdminUpdateUserRequest(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
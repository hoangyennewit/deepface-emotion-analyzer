from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
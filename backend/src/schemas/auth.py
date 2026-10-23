from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from datetime import datetime


def validate_password_strength(password: str) -> str:
    requirements_met = (
        len(password) >= 8
        and any(character.isalpha() for character in password)
        and any(character.isdigit() for character in password)
        and any(
            not character.isalnum() and not character.isspace()
            for character in password
        )
    )
    if not requirements_met:
        raise ValueError(
            "Mật khẩu phải có ít nhất 8 ký tự, gồm ít nhất 1 chữ cái, "
            "1 chữ số và 1 ký tự đặc biệt."
        )
    return password


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, password: str) -> str:
        return validate_password_strength(password)


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
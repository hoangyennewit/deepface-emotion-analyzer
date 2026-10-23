from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from src.controller.auth_controller import ALGORITHM, SECRET_KEY
from src.controller.auth_controller import pwd_context
from src.db.session import get_session
from src.models.user import User
from src.repositories.user_repository import UserRepository

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


def _profile_response(user: User) -> dict[str, str]:
    return {
        "name": user.full_name or user.email,
        "email": user.email,
        "avatar": "",
        "role": "User",
    }


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_session),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise unauthorized
        user_id = UUID(subject)
    except (JWTError, ValueError):
        raise unauthorized from None

    user = await UserRepository(db).get_by_id(user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return user


@router.get("/profile")
async def get_profile(user: User = Depends(get_current_user)):
    return _profile_response(user)


@router.put("/profile")
async def update_profile(
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    repository = UserRepository(db)
    if req.email is not None and req.email != user.email:
        existing_user = await repository.get_by_email(str(req.email))
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã tồn tại",
            )
        user.email = str(req.email)
    if req.name is not None:
        user.full_name = req.name
    updated_user = await repository.save(user)
    return {"success": True, "profile": _profile_response(updated_user)}


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if not pwd_context.verify(req.old_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác.",
        )
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 6 ký tự.",
        )
    user.hashed_password = pwd_context.hash(req.new_password)
    await UserRepository(db).save(user)
    return {"success": True, "message": "Đổi mật khẩu thành công!"}

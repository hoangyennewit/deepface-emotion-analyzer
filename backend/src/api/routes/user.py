from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

USER_PROFILE = {
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@gmail.com",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenVanA",
    "role": "User",
}

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.get("/profile")
async def get_profile():
    return USER_PROFILE

@router.put("/profile")
async def update_profile(req: UpdateProfileRequest):
    if req.name is not None:
        USER_PROFILE["name"] = req.name
    if req.email is not None:
        USER_PROFILE["email"] = req.email
    if req.avatar is not None:
        USER_PROFILE["avatar"] = req.avatar
    return {"success": True, "profile": USER_PROFILE}

@router.post("/change-password")
async def change_password(req: ChangePasswordRequest):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 6 ký tự.")
    return {"success": True, "message": "Đổi mật khẩu thành công!"}

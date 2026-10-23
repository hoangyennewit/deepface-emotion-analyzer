from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_session as get_db
from src.schemas.auth import UserRegister, UserResponse, Token
from src.controller.auth_controller import AuthController

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    controller = AuthController(db)
    return await controller.register(user_in)

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    controller = AuthController(db)
    return await controller.login(form_data.username, form_data.password)

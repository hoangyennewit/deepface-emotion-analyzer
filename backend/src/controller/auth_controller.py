from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone

from src.repositories.user_repository import UserRepository
from src.schemas.auth import UserRegister, Token
from src.models.user import User

SECRET_KEY = "SECRET_KEY_CHANGE_ME_123"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthController:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    async def register(self, user_in: UserRegister) -> User:
        existing_user = await self.user_repo.get_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã tồn tại"
            )
        
        hashed_pw = pwd_context.hash(user_in.password)
        new_user = User(
            email=user_in.email,
            hashed_password=hashed_pw,
            full_name=user_in.full_name
        )
        return await self.user_repo.create(new_user)

    async def login(self, username: str, password: str) -> Token:
        user = await self.user_repo.get_by_email(username)
        if not user or not pwd_context.verify(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không chính xác"
            )

        expire = datetime.now(timezone.utc) + timedelta(hours=24)
        token_data = {"sub": str(user.id), "exp": expire}
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

        return Token(access_token=token, token_type="bearer")
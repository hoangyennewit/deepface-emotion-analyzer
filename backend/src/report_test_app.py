"""Ứng dụng test riêng cho schema 6 bảng. Không import các model UUID của nhóm."""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from backend.src.api.routes.sql_reports import router
from backend.src.db.session import get_session

load_dotenv()
url = os.environ.get('REPORT_DATABASE_URL')
if not url:
    raise RuntimeError('Cần đặt REPORT_DATABASE_URL trỏ tới database SQL 6 bảng riêng.')
engine = create_async_engine(url)
factory = async_sessionmaker(engine, expire_on_commit=False)

async def report_db():
    async with factory() as db:
        yield db

@asynccontextmanager
async def lifespan(app):
    yield
    await engine.dispose()

app = FastAPI(title='SQL Report Test — Task 3.7', lifespan=lifespan)
app.dependency_overrides[get_session] = report_db
app.include_router(router, prefix='/reports', tags=['SQL Reports'])

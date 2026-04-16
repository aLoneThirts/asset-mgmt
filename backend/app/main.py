from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.core.firebase import init_firebase
from app.routers import auth, assets, maintenance, stock, logs, dashboard, import_excel

settings = get_settings()
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    yield


app = FastAPI(
    title="Asset Management API",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/v1")
app.include_router(assets.router,        prefix="/api/v1")
app.include_router(maintenance.router,   prefix="/api/v1")
app.include_router(stock.router,         prefix="/api/v1")
app.include_router(logs.router,          prefix="/api/v1")
app.include_router(dashboard.router,     prefix="/api/v1")
app.include_router(import_excel.router,  prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}

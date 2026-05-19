"""Tara FastAPI application factory."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1.router import router as v1_router
from backend.core.database import check_db_connection
from backend.core.redis import check_redis_connection
from backend.schemas.common import HealthResponse, APP_VERSION

logger = logging.getLogger(__name__)

DB_CONNECTED = "connected"
DB_UNREACHABLE = "unreachable"
REDIS_CONNECTED = "connected"
REDIS_UNREACHABLE = "unreachable"
STATUS_OK = "ok"


def _build_health_response(db_ok: bool, redis_ok: bool) -> HealthResponse:
    return HealthResponse(
        status=STATUS_OK,
        db=DB_CONNECTED if db_ok else DB_UNREACHABLE,
        redis=REDIS_CONNECTED if redis_ok else REDIS_UNREACHABLE,
        version=APP_VERSION,
    )


def create_app() -> FastAPI:
    """Construct and configure the FastAPI application."""
    app = FastAPI(title="Tara API", version=APP_VERSION)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(v1_router)

    @app.on_event("startup")
    async def on_startup() -> None:
        logger.info("Tara API started — version %s", APP_VERSION)

    @app.get("/health", response_model=HealthResponse, tags=["meta"])
    async def health_check() -> HealthResponse:
        """Liveness probe: checks DB connectivity and Redis ping."""
        db_ok = await check_db_connection()
        redis_ok = await check_redis_connection()
        return _build_health_response(db_ok, redis_ok)

    return app


app = create_app()

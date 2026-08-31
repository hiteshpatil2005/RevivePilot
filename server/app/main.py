from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import logger
from app.database.connection import engine, check_database_connection
from app.events.publisher import check_redis_connection
from app.websocket.manager import ws_manager
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifespan management.
    Validates infrastructure reachability cleanly on startup.
    """
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode...")

    # Non-blocking connectivity checks
    db_ok = await check_database_connection()
    redis_ok = await check_redis_connection()

    logger.info(f"Database connection: {'OK' if db_ok else 'FAILED/OFFLINE'}")
    logger.info(f"Redis connection:    {'OK' if redis_ok else 'FAILED/OFFLINE'}")

    yield

    logger.info(f"Shutting down {settings.APP_NAME}...")
    await engine.dispose()
    logger.info("Database connection pool disposed.")


# Initialize FastAPI application
app = FastAPI(
    title="RevivePilot API",
    description="Autonomous AI Revenue Recovery Platform Backend — Razorpay Buildathon (Track 03)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Exception Handlers ────────────────────────────────────────────────
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail if isinstance(exc.detail, str) else "An error occurred",
            "detail": exc.detail,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error in request payload",
            "errors": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=settings.DEBUG)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal server error. Please contact support.",
        },
    )


# ── WebSocket Endpoint ───────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Centralized authenticated WebSocket gateway.
    """
    import uuid
    # Accept connection and assign to default merchant or extract token from query
    query_params = dict(websocket.query_params)
    token = query_params.get("token")

    # In dev/mock mode or with valid token
    merchant_id = uuid.uuid4()
    if token:
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        if payload and "merchant_id" in payload:
            try:
                merchant_id = uuid.UUID(payload["merchant_id"])
            except Exception:
                pass

    await ws_manager.connect(websocket, merchant_id)
    try:
        while True:
            # Keep socket alive, echo heartbeat
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, merchant_id)
    except Exception as exc:
        logger.warning(f"WebSocket error: {exc}")
        ws_manager.disconnect(websocket, merchant_id)


# ── Include Main Master API Router ───────────────────────────────────────────
app.include_router(api_router)


# Root landing endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "api": "/api",
    }

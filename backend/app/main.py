from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.routes import analytics, applications, auth, health, integrations, materials
from app.utils.errors import AppError, app_error_handler, http_exception_handler, validation_exception_handler

settings = get_settings()

app = FastAPI(
    title="JobPilot AI",
    description="AI-powered job application tracker",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(materials.router)
app.include_router(analytics.router)
app.include_router(integrations.router)


@app.get("/")
def root():
    return {"message": "JobPilot AI Backend is running 🚀"}

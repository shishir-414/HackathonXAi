"""
EduVid AI - Main Application
AI Educational Video Generator
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routes import router as auth_router
from app.routes.videos import router as video_router
from app.routes.documents import router as document_router
from app.routes.practical import router as practical_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered educational video generator for school students",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://frontend:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for videos and thumbnails
app.mount("/static/videos", StaticFiles(directory=settings.VIDEO_DIR), name="videos")

# Include routers
app.include_router(auth_router)
app.include_router(video_router)
app.include_router(document_router)
app.include_router(practical_router)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "description": "AI Educational Video Generator",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}

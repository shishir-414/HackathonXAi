import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "EduVid AI"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "hackathon-secret-key-change-in-prod-2024")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    DATABASE_URL: str = "sqlite:///./eduvid.db"

    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "mistral")

    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    VIDEO_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_videos")
    TEMP_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp")

    VIDEO_WIDTH: int = 720
    VIDEO_HEIGHT: int = 1280
    VIDEO_FPS: int = 24
    VIDEO_DURATION_MIN: int = 30
    VIDEO_DURATION_MAX: int = 60

    class Config:
        env_file = ".env"


settings = Settings()

# Create required directories
for d in [settings.UPLOAD_DIR, settings.VIDEO_DIR, settings.TEMP_DIR]:
    os.makedirs(d, exist_ok=True)

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth Schemas ──
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    grade: Optional[int] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    grade: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Video Schemas ──
class VideoCreate(BaseModel):
    question: str
    title: Optional[str] = None


class VideoResponse(BaseModel):
    id: int
    user_id: int
    title: str
    question: str
    script: Optional[str]
    subtitle_text: Optional[str]
    file_path: Optional[str]
    thumbnail_path: Optional[str]
    duration: Optional[int]
    status: str
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class VideoListResponse(BaseModel):
    videos: List[VideoResponse]
    total: int


# ── Document Schemas ──
class DocumentResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    file_type: str
    extracted_text: Optional[str]
    questions: Optional[str]
    processed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionFromDoc(BaseModel):
    question: str
    document_id: int

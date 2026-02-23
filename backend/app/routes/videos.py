"""
Video Routes
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db, User, Video
from app.schemas import VideoCreate, VideoResponse, VideoListResponse
from app.auth import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/videos", tags=["Videos"])


def process_video_generation(video_id: int, question: str, script: str):
    """Background task: generate the video."""
    from app.database import SessionLocal
    from app.services.video_service import create_video

    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return

        video.status = "processing"
        db.commit()

        result = create_video(video_id, question, script)

        video.file_path = result["file_path"]
        video.thumbnail_path = result["thumbnail_path"]
        video.duration = result["duration"]
        video.subtitle_text = result["subtitle_text"]
        video.status = "completed"
        video.completed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        logger.error(f"Video generation failed for {video_id}: {e}", exc_info=True)
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = "failed"
            video.error_message = str(e)[:500]
            db.commit()
    finally:
        db.close()


@router.post("/generate", response_model=VideoResponse)
async def generate_video(
    video_data: VideoCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a new educational video from a question."""
    from app.services.llm_service import generate_video_script

    # Generate script using LLM
    script = await generate_video_script(video_data.question)

    title = video_data.title or video_data.question[:100]

    # Create video record
    video = Video(
        user_id=current_user.id,
        title=title,
        question=video_data.question,
        script=script,
        status="pending",
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    # Start background video generation
    background_tasks.add_task(process_video_generation, video.id, video_data.question, script)

    return VideoResponse.model_validate(video)


@router.get("/", response_model=VideoListResponse)
def list_videos(
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's videos."""
    query = db.query(Video).filter(Video.user_id == current_user.id)
    if status_filter:
        query = query.filter(Video.status == status_filter)

    total = query.count()
    videos = query.order_by(Video.created_at.desc()).offset(skip).limit(limit).all()

    return VideoListResponse(
        videos=[VideoResponse.model_validate(v) for v in videos],
        total=total,
    )


@router.get("/feed", response_model=VideoListResponse)
def video_feed(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get video feed - all completed videos for the vertical feed."""
    query = db.query(Video).filter(Video.status == "completed")
    total = query.count()
    videos = query.order_by(Video.created_at.desc()).offset(skip).limit(limit).all()

    return VideoListResponse(
        videos=[VideoResponse.model_validate(v) for v in videos],
        total=total,
    )


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific video by ID."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return VideoResponse.model_validate(video)


@router.get("/{video_id}/stream")
def stream_video(
    video_id: int,
    db: Session = Depends(get_db),
):
    """Stream a video file."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or not video.file_path:
        raise HTTPException(status_code=404, detail="Video not found")

    file_path = os.path.join(settings.VIDEO_DIR, video.file_path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(
        file_path,
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"},
    )


@router.get("/{video_id}/thumbnail")
def get_thumbnail(
    video_id: int,
    db: Session = Depends(get_db),
):
    """Get video thumbnail."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or not video.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    file_path = os.path.join(settings.VIDEO_DIR, video.thumbnail_path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Thumbnail file not found")

    return FileResponse(file_path, media_type="image/png")


@router.delete("/{video_id}")
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a video."""
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete files
    if video.file_path:
        file_path = os.path.join(settings.VIDEO_DIR, video.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)
    if video.thumbnail_path:
        thumb_path = os.path.join(settings.VIDEO_DIR, video.thumbnail_path)
        if os.path.exists(thumb_path):
            os.remove(thumb_path)

    db.delete(video)
    db.commit()
    return {"message": "Video deleted"}

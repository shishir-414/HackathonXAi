"""
Document Upload & Processing Routes
"""

import os
import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db, User, Document, Video
from app.schemas import DocumentResponse, VideoResponse
from app.auth import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "txt"}


def get_file_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def process_document_task(document_id: int):
    """Background task to process a document."""
    import asyncio
    from app.database import SessionLocal
    from app.services.doc_service import extract_text
    from app.services.llm_service import extract_questions_from_text

    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return

        # Extract text
        text = extract_text(doc.file_path, doc.file_type)
        doc.extracted_text = text[:5000]  # Store first 5000 chars

        if text:
            # Extract questions
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            questions = loop.run_until_complete(extract_questions_from_text(text))
            loop.close()

            doc.questions = json.dumps(questions)

        doc.processed = True
        db.commit()

    except Exception as e:
        logger.error(f"Document processing failed for {document_id}: {e}", exc_info=True)
    finally:
        db.close()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a document for Q&A extraction."""
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Save file
    file_path = os.path.join(
        settings.UPLOAD_DIR,
        f"{current_user.id}_{int(datetime.now().timestamp())}_{file.filename}"
    )
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Create document record
    doc = Document(
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_type=ext,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Process in background
    background_tasks.add_task(process_document_task, doc.id)

    return DocumentResponse.model_validate(doc)


@router.get("/", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's uploaded documents."""
    docs = db.query(Document).filter(
        Document.user_id == current_user.id
    ).order_by(Document.created_at.desc()).all()
    return [DocumentResponse.model_validate(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific document."""
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}/questions")
def get_document_questions(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get extracted questions from a document."""
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.processed:
        return {"questions": [], "status": "processing"}

    questions = json.loads(doc.questions) if doc.questions else []
    return {"questions": questions, "status": "completed"}


@router.post("/{document_id}/generate-video", response_model=VideoResponse)
async def generate_video_from_document(
    document_id: int,
    question_index: int = 0,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a video from a document's extracted question."""
    from app.services.llm_service import generate_video_script
    from app.routes.videos import process_video_generation

    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.processed or not doc.questions:
        raise HTTPException(status_code=400, detail="Document not yet processed")

    questions = json.loads(doc.questions)
    if question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Question index out of range")

    question = questions[question_index]
    script = await generate_video_script(question)

    video = Video(
        user_id=current_user.id,
        title=question[:100],
        question=question,
        script=script,
        status="pending",
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    background_tasks.add_task(process_video_generation, video.id, question, script)

    return VideoResponse.model_validate(video)

"""Practical Learning Mode — Object Detection & Features API."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from app.services.practical_service import (
    get_object_features,
    generate_object_features_llm,
    get_object_quiz,
)

router = APIRouter(prefix="/api/practical", tags=["practical"])


# ── Request / Response Models ─────────────────────────────────

class ObjectRequest(BaseModel):
    object_name: str

class FeatureItem(BaseModel):
    title: str
    detail: str

class ObjectFeaturesResponse(BaseModel):
    name: str
    category: str
    features: List[FeatureItem]

class QuizResponse(BaseModel):
    question: str
    options: List[str]

class AnswerCheckRequest(BaseModel):
    object_name: str
    selected_index: int

class AnswerCheckResponse(BaseModel):
    correct: bool
    explanation: str


# ── Endpoints ─────────────────────────────────────────────────

@router.post("/object-features", response_model=ObjectFeaturesResponse)
async def get_features(request: ObjectRequest):
    """Get educational features about a detected object."""
    data = get_object_features(request.object_name)

    if data["found"]:
        return {
            "name": data["name"],
            "category": data["category"],
            "features": data["features"],
        }

    # Object not in pre-built list — generate via LLM
    features = await generate_object_features_llm(request.object_name)
    return {
        "name": request.object_name.title(),
        "category": "Detected Object",
        "features": features,
    }


@router.post("/quiz")
async def get_quiz(request: ObjectRequest):
    """Get a quiz question about the detected object."""
    quiz = get_object_quiz(request.object_name)
    if quiz:
        return {
            "question": quiz["question"],
            "options": quiz["options"],
        }
    return {
        "question": f"What do you find most interesting about {request.object_name}?",
        "options": [
            "How it's made",
            "The science behind it",
            "Its history",
            "How it affects the environment",
        ],
    }


@router.post("/check-answer", response_model=AnswerCheckResponse)
async def check_answer(request: AnswerCheckRequest):
    """Check if the selected quiz answer is correct."""
    quiz = get_object_quiz(request.object_name)
    if quiz:
        correct = request.selected_index == quiz["correct_index"]
        explanation = quiz["explanations"]["correct"] if correct else quiz["explanations"]["wrong"]
        return {"correct": correct, "explanation": explanation}

    return {
        "correct": True,
        "explanation": f"Great choice! Every aspect of a {request.object_name} is fascinating to learn about.",
    }

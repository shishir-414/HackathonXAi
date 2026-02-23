# EduVid AI - Educational Video Generator

AI-powered educational video generator for school students (grades 5-10). Ask a question or upload notes, and the system automatically generates short educational videos with narration and subtitles.

## Features

- **Question-to-Video**: Type any educational question and get an AI-generated video
- **Document Upload**: Upload PDF/DOCX/TXT notes for automatic Q&A extraction
- **Vertical Video Feed**: TikTok-style 9:16 feed with swipe navigation
- **Video Playback with Subtitles**: Real-time subtitle overlay
- **User Authentication**: JWT-based registration and login
- **Background Processing**: Videos generate asynchronously

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | SQLite3 |
| Auth | JWT (python-jose + passlib) |
| LLM | Ollama (Mistral/Llama 2) - local, free |
| TTS | Google TTS (gTTS) - free, no API key |
| Video | FFmpeg + moviepy + Pillow |
| Documents | PyPDF2 + python-docx |
| State | Zustand |
| Container | Docker + Docker Compose |

**100% free - No API keys required!**

## Project Structure

```
texttovideo/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings & configuration
│   │   ├── database.py          # SQLAlchemy models + DB setup
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth.py              # JWT authentication
│   │   ├── routes/
│   │   │   ├── __init__.py      # Auth routes
│   │   │   ├── videos.py        # Video CRUD + generation
│   │   │   └── documents.py     # Document upload + processing
│   │   └── services/
│   │       ├── llm_service.py   # Ollama LLM + fallback scripts
│   │       ├── video_service.py # Video generation pipeline
│   │       └── doc_service.py   # PDF/DOCX text extraction
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx             # React entry
│   │   ├── App.jsx              # Router + layout
│   │   ├── api.js               # Axios API client
│   │   ├── store.js             # Zustand state stores
│   │   ├── index.css            # Tailwind + custom styles
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── VideoCard.jsx
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       ├── Dashboard.jsx
│   │       ├── GeneratePage.jsx
│   │       ├── UploadPage.jsx
│   │       ├── VideoFeed.jsx
│   │       └── MyVideos.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone and start everything
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Optional: Ollama (for AI-generated scripts)

```bash
# Install Ollama: https://ollama.ai
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull mistral

# Ollama runs on http://localhost:11434
```

> **Note**: Ollama is optional! The app includes a built-in fallback script generator that works without any LLM. When Ollama is available, it provides higher-quality, contextual educational scripts.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/videos/generate` | Generate video from question |
| GET | `/api/videos/` | List user's videos |
| GET | `/api/videos/feed` | Get video feed |
| GET | `/api/videos/{id}` | Get video details |
| GET | `/api/videos/{id}/stream` | Stream video file |
| GET | `/api/videos/{id}/thumbnail` | Get thumbnail |
| DELETE | `/api/videos/{id}` | Delete video |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload` | Upload document |
| GET | `/api/documents/` | List documents |
| GET | `/api/documents/{id}/questions` | Get extracted questions |
| POST | `/api/documents/{id}/generate-video` | Generate video from doc question |

## How It Works

1. **User asks a question** (or uploads notes)
2. **LLM generates a script** (Ollama or fallback)
3. **gTTS creates narration audio** from the script
4. **Pillow generates visual frames** (title + content slides with custom colors)
5. **moviepy assembles the video** by combining frames + audio
6. **FFmpeg burns subtitles** onto the video
7. **User watches** in a vertical video feed with real-time subtitles

## Video Output

- **Format**: MP4 (H.264 + AAC)
- **Aspect Ratio**: 9:16 (vertical/portrait)
- **Resolution**: 1080 x 1920
- **Duration**: 30-60 seconds
- **Subtitles**: Hardcoded via FFmpeg

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `hackathon-secret-key...` | JWT signing key |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API URL |
| `OLLAMA_MODEL` | `mistral` | LLM model name |

## License

MIT

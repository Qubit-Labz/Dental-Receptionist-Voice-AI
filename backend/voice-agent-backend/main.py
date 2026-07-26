"""Voice AI Agent Backend — FastAPI application."""

import logging
import os
import sqlite3
import uuid

from fastapi import (
    Depends,
    FastAPI,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware

from auth import get_current_user
from utils.llm import query_llm
from utils.stt import transcribe_audio
from utils.tts import synthesise_speech

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

app_title = "Voice AI Agent"
app_description = "Voice AI Agent Backend — STT → LLM → TTS pipeline"
app_version = "0.1.0"

app = FastAPI(
    title=app_title,
    description=app_description,
    version=app_version,
)

# CORS middleware — permissive for local prototype
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp/ directory at startup
TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp")


@app.on_event("startup")
async def startup_event():
    """Create the temp/ directory if it doesn't exist."""
    os.makedirs(TEMP_DIR, exist_ok=True)
    logger.info("Temp directory ready at '%s'", TEMP_DIR)


@app.get("/health")
async def health_check():
    """Health check endpoint — no auth required."""
    return {"status": "ok"}


@app.post("/audio-chat")
async def audio_chat(
    file: UploadFile,
    email: str = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Audio chat endpoint — receives audio, transcribes it, queries the LLM,
    and returns synthesised speech as WAV bytes.
    """
    # Generate unique filename, preserving original extension
    original_name = file.filename or "audio.wav"
    if email:
        logger.info("Request from user: %s", email)
    ext = os.path.splitext(original_name)[1] or ".wav"
    temp_filename = f"{uuid.uuid4()}{ext}"
    temp_path = os.path.join(TEMP_DIR, temp_filename)

    try:
        # 1. Save uploaded file to temp/
        file_bytes = await file.read()
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        # 2. STT: transcribe audio
        try:
            transcript = transcribe_audio(temp_path)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"STT transcription failed: {str(e)}",
            )

        # 3. LLM: query with transcript (pass email for context if available)
        try:
            llm_response = query_llm(transcript, email=email)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LLM query failed: {str(e)}",
            )

        # 4. TTS: synthesise response to audio
        try:
            audio_bytes = synthesise_speech(llm_response)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"TTS synthesis failed: {str(e)}",
            )

        # 5. Delete temp file (in finally block ensures it always runs)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": "inline; filename=response.wav",
        },
    )


DB_PATH = os.path.join(os.path.dirname(__file__), "appointments.db")


@app.get("/appointments")
async def get_appointments(
    email: str = Query(..., description="User's email address"),
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve all appointments for a given email address.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Find the email record
    cursor.execute("SELECT id FROM emails WHERE email = ?", (email,))
    email_row = cursor.fetchone()
    if email_row is None:
        conn.close()
        return {"appointments": []}

    email_id = email_row["id"]

    # Fetch appointments for this email
    cursor.execute(
        "SELECT id, appointment_date, appointment_time, reference, created_at "
        "FROM appointments WHERE email_id = ?",
        (email_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    appointments = [
        {
            "id": row["id"],
            "appointment_date": row["appointment_date"],
            "appointment_time": row["appointment_time"],
            "reference": row["reference"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]

    return {"appointments": appointments}

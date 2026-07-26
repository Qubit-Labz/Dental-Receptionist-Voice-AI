"""Speech-to-Text utility using Faster-Whisper."""

import logging
import os

from dotenv import load_dotenv
from faster_whisper import WhisperModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Load environment variables at module level
load_dotenv()

# System note: Faster-Whisper uses `ffmpeg` under the hood for non-WAV formats.
# Ensure `ffmpeg` is installed on the system (e.g., `sudo apt install ffmpeg` on Ubuntu).

# Load Whisper model once at module level (not inside the function)
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

logger.info(
    "Loading Whisper model '%s' on %s (%s)...",
    WHISPER_MODEL_SIZE,
    WHISPER_DEVICE,
    WHISPER_COMPUTE_TYPE,
)
whisper_model = WhisperModel(
    WHISPER_MODEL_SIZE,
    device=WHISPER_DEVICE,
    compute_type=WHISPER_COMPUTE_TYPE,
    cpu_threads=0,
    num_workers=1,
)
logger.info("Whisper model loaded.")


def transcribe_audio(file_path: str) -> str:
    """
    Transcribe an audio file using the pre-loaded Faster-Whisper model.

    Args:
        file_path: Path to the audio file on disk.

    Returns:
        The full transcribed text as a single string.
    """
    logger.info("Transcribing '%s'...", file_path)

    segments, info = whisper_model.transcribe(
        file_path,
        beam_size=3,
        vad_filter=True,
    )

    # Force evaluation of the generator
    segments = list(segments)

    logger.info(
        "Transcription complete. Detected language: %s (%.1f%% confidence)",
        info.language,
        info.language_probability * 100,
    )

    full_text = " ".join(segment.text for segment in segments)
    return full_text

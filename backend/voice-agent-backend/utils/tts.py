"""Text-to-Speech utility using Kokoro."""

import io
import logging
import os

import numpy as np
import soundfile as sf
from dotenv import load_dotenv
from kokoro import KPipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Load environment variables at module level
load_dotenv()

# Load Kokoro pipeline once at module level (not inside the function)
KOKORO_LANG = os.getenv("KOKORO_LANG", "a")
KOKORO_VOICE = os.getenv("KOKORO_VOICE", "af_heart")
KOKORO_DEVICE = os.getenv("KOKORO_DEVICE", "cpu")
logger.info(
    "Loading Kokoro pipeline (lang=%s, voice=%s, device=%s)...",
    KOKORO_LANG,
    KOKORO_VOICE,
    KOKORO_DEVICE,
)
pipeline = KPipeline(lang_code=KOKORO_LANG, device=KOKORO_DEVICE)
logger.info("Kokoro pipeline loaded.")


def synthesise_speech(text: str) -> bytes:
    """
    Synthesise speech from text and return raw WAV bytes.

    Args:
        text: Plain-text string to synthesise.

    Returns:
        Raw WAV bytes (PCM 16-bit) ready to send as an HTTP response body.
    """
    logger.info("Synthesising speech for %d characters...", len(text))

    generator = pipeline(text, voice=KOKORO_VOICE)
    for i, (gs, ps, audio) in enumerate(generator):
        logger.info("Index: %d | Graphemes: %s | Phonemes: %s", i, gs, ps)

        # Use the first (and typically only) segment's audio
        audio_array = np.array(audio)
        # Write WAV to in-memory bytes
        buf = io.BytesIO()
        sf.write(buf, audio_array, 24000, format="WAV", subtype="PCM_16")
        return buf.getvalue()

    # Fallback if no audio generated (shouldn't happen normally)
    raise ValueError("Kokoro produced no audio output for the given text.")

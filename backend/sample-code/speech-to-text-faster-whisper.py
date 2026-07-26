#!/usr/bin/env python3
"""
Audio transcription script using Faster Whisper.

Optimized for CPU usage with a balanced tradeoff between speed and accuracy.

Supported input formats: .mp3, .wav, .flac, .ogg, .m4a, .opus, .aac, .webm
"""

import argparse
import logging
import sys
import time
from pathlib import Path

from faster_whisper import WhisperModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ─── Balanced CPU settings ──────────────────────────────────────────────────
# int8 quantization: ~2x faster than fp32 on CPU with minimal accuracy loss
# beam_size=3: good balance (5 is more accurate but slower)
# VAD filter: skips silence segments to speed up processing

MODEL_SIZE = "medium"
COMPUTE_TYPE = "int8"
BEAM_SIZE = 3
VAD_FILTER = True


def detect_model_size(device: str, compute_type: str) -> str:
    """Select model size based on available hardware."""
    if device == "cpu" and compute_type == "int8":
        return MODEL_SIZE  # medium is a good balance on CPU with int8

    # If using GPU, we could suggest larger models
    return MODEL_SIZE


def transcribe_audio(
    audio_path: str,
    model_size: str = MODEL_SIZE,
    device: str = "cpu",
    compute_type: str = COMPUTE_TYPE,
    beam_size: int = BEAM_SIZE,
    vad_filter: bool = VAD_FILTER,
    language: str | None = None,
) -> str:
    """
    Transcribe an audio file using Faster Whisper.

    Args:
        audio_path: Path to the audio file.
        model_size: Whisper model size (tiny, base, small, medium, large).
        device: Device to run inference on ("cpu" or "cuda").
        compute_type: Precision type ("int8", "float16", "int32").
        beam_size: Beam search size for decoding.
        vad_filter: Whether to filter silence segments.
        language: Language code (e.g., "en", "de"). None = auto-detect.

    Returns:
        The full transcribed text.
    """
    logger.info("Loading model '%s' on %s (%s)...", model_size, device, compute_type)
    model = WhisperModel(
        model_size,
        device=device,
        compute_type=compute_type,
        cpu_threads=0,  # 0 = use all available threads
        num_workers=1,  # keep memory usage reasonable on CPU
    )
    logger.info("Model loaded.")

    # Validate audio file exists
    audio_file = Path(audio_path)
    if not audio_file.is_file():
        logger.error("Audio file not found: %s", audio_path)
        sys.exit(1)

    logger.info("Transcribing '%s'...", audio_file.name)
    start_time = time.time()

    segments, info = model.transcribe(
        audio_path,
        beam_size=beam_size,
        vad_filter=vad_filter,
        language=language,
    )

    # Force evaluation of the generator
    segments = list(segments)

    elapsed = time.time() - start_time
    logger.info(
        "Transcription complete. Duration: %.1fs | "
        "Detected language: %s (%.1f%% confidence)",
        elapsed,
        info.language,
        info.language_probability * 100,
    )

    # Collect and return full text
    full_text = " ".join(segment.text for segment in segments)

    # Print with timestamps for reference
    for segment in segments:
        logger.debug(
            "[%.2fs -> %.2fs] %s",
            segment.start,
            segment.end,
            segment.text,
        )

    return full_text


def main():
    parser = argparse.ArgumentParser(
        description="Transcribe audio files using Faster Whisper (CPU-optimized).",
        epilog="Supported formats: .mp3, .wav, .flac, .ogg, .m4a, .opus, .aac, .webm",
    )
    parser.add_argument(
        "audio_file",
        help="Path to the input audio file",
    )
    parser.add_argument(
        "--model",
        default=MODEL_SIZE,
        choices=["tiny", "base", "small", "medium", "large-v3"],
        help="Whisper model size (default: %(default)s)",
    )
    parser.add_argument(
        "--device",
        default="cpu",
        choices=["cpu", "cuda"],
        help="Device to run inference on (default: %(default)s)",
    )
    parser.add_argument(
        "--compute-type",
        default=COMPUTE_TYPE,
        choices=["int8", "float16", "int32"],
        help="Compute precision (default: %(default)s)",
    )
    parser.add_argument(
        "--beam-size",
        type=int,
        default=BEAM_SIZE,
        help="Beam search size (default: %(default)s)",
    )
    parser.add_argument(
        "--no-vad",
        action="store_true",
        help="Disable VAD silence filtering",
    )
    parser.add_argument(
        "--language",
        type=str,
        default=None,
        help="Language code (e.g., 'en', 'de', 'fr'). Auto-detect if not specified.",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress non-result output",
    )

    args = parser.parse_args()

    if args.quiet:
        print("Setting logging to WARNING level")
        logger.setLevel(logging.WARNING)

    full_text = transcribe_audio(
        audio_path=args.audio_file,
        model_size=args.model,
        device=args.device,
        compute_type=args.compute_type,
        beam_size=args.beam_size,
        vad_filter=not args.no_vad,
        language=args.language,
    )

    # Output only the transcription text to stdout
    print(full_text)


if __name__ == "__main__":
    main()

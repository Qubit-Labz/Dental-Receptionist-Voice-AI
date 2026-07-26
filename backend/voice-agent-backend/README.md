# Voice AI Agent Backend

A prototype Voice AI Agent built with FastAPI. The pipeline is:

```
POST /audio-chat (audio file)
  → STT: transcribe audio to text      (Faster-Whisper)
  → LLM: query with transcript          (OpenAI-compatible API)
  → TTS: synthesise response to audio   (Kokoro)
  → return WAV audio bytes
```

---

## System Requirements

- Python 3.10+
- `uv` installed
- `ffmpeg` installed (`sudo apt install ffmpeg` on Ubuntu, `brew install ffmpeg` on macOS)

---

## Setup

```bash
git clone <repo>
cd voice-agent-backend
cp .env.example .env
# Edit .env with your values
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## Testing the Endpoint

```bash
curl -X POST http://localhost:8000/audio-chat \
  -H "Authorization: Bearer <STATIC_API_TOKEN>" \
  -F "file=@/path/to/audio.wav" \
  --output response.wav
```

Or visit `http://localhost:8000/docs` for the interactive Swagger UI.

---

## Health Check

```bash
curl http://localhost:8000/health
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Secret key for JWT signing |
| `STATIC_API_TOKEN` | Static bearer token for quick testing |
| `LLM_BASE_URL` | OpenAI-compatible API base URL |
| `LLM_API_KEY` | API key for the LLM service |
| `LLM_MODEL` | Model name to use |
| `WHISPER_MODEL_SIZE` | Whisper model size (base, small, medium) |
| `WHISPER_DEVICE` | Device (cpu / cuda) |
| `WHISPER_COMPUTE_TYPE` | Compute precision (int8, float16) |
| `KOKORO_VOICE` | Kokoro voice ID (e.g., af_heart) |
| `KOKORO_LANG` | Kokoro language code (a = American English) |

---

## Project Structure

```
voice-agent-backend/
├── main.py                 # FastAPI app and endpoints
├── auth.py                 # JWT + static token authentication
├── utils/
│   ├── __init__.py
│   ├── stt.py              # transcribe_audio()
│   ├── tts.py              # synthesise_speech()
│   └── llm.py              # query_llm()
├── temp/                   # Temporary files (auto-managed)
├── .env
├── .env.example
├── .gitignore
└── pyproject.toml
```

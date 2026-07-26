# Voice AI Agent — Backend Implementation Plan

> You are being given this document to implement a backend for a Voice AI Agent. Read the entire document before writing any code. Follow every section in order. All decisions have already been made — do not substitute frameworks, libraries, or patterns unless something is explicitly marked as flexible.

---

## Context

This is a prototype. It does not need to be production-ready. Prioritise getting it working correctly over robustness, scalability, or completeness.

The pipeline is:

```
POST /audio-chat (audio file)
  → STT: transcribe audio to text      (Faster-Whisper)
  → LLM: query with transcript          (OpenAI-compatible API)
  → TTS: synthesise response to audio   (Kokoro)
  → return WAV audio bytes
```

You will also be given two sample CLI scripts (in a `sample-code/` folder) — one for STT and one for TTS. Use them as your reference for how to call Faster-Whisper and Kokoro correctly. Your job is to adapt them into utility functions (`utils/stt.py` and `utils/tts.py`) that the API can call. Do not copy them verbatim — convert them from CLI scripts into clean, importable functions following the contracts described in Section 6 below.

---

## 1. Framework: FastAPI

Use **FastAPI**. Do not use Flask or Django.

Reasons:
- Native `async` support for the STT → LLM → TTS chain.
- First-class `UploadFile` for receiving audio files with no boilerplate.
- Returns raw `Response` bytes natively, which is needed to send WAV audio back.
- Auto-generated docs at `/docs` for manual testing without a frontend.

---

## 2. Project Structure

Create exactly this file tree:

```
voice-agent-backend/
├── pyproject.toml          # uv-managed, auto-generated
├── .env                    # secrets — filled in by the user, never committed
├── .env.example            # blank template — commit this
├── .gitignore
├── main.py                 # FastAPI app and the /audio-chat endpoint
├── auth.py                 # JWT + static token authentication
├── utils/
│   ├── __init__.py         # empty
│   ├── stt.py              # transcribe_audio() — based on the STT sample script
│   ├── tts.py              # synthesise_speech() — based on the TTS sample script
│   └── llm.py              # query_llm()
└── temp/                   # auto-created at startup, gitignored
```

---

## 3. Dependency Management (`uv`)

The user already has `uv` installed. Do not install it.

### Initialise

```bash
uv init voice-agent-backend
cd voice-agent-backend
```

### Add all dependencies in one command

```bash
uv add fastapi uvicorn python-multipart python-jose[cryptography] python-dotenv openai faster-whisper kokoro soundfile numpy
```

### Dependency reference

| Package | Purpose |
|---|---|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `python-multipart` | Required by FastAPI to parse file uploads |
| `python-jose[cryptography]` | JWT encode/decode |
| `python-dotenv` | Load `.env` at runtime |
| `openai` | OpenAI-compatible API client |
| `faster-whisper` | STT model (see sample script) |
| `kokoro` | TTS model (see sample script) |
| `soundfile` | Write WAV bytes from numpy arrays |
| `numpy` | Audio array handling |

### Run the app

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 4. Environment Variables

### `.env` (user fills this in — never commit)

```env
# Auth
SECRET_KEY=your-very-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
STATIC_API_TOKEN=your-static-bearer-token

# LLM
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=placeholder
LLM_MODEL=your-model-name

# STT (Faster-Whisper)
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8

# TTS (Kokoro)
KOKORO_VOICE=af_heart
KOKORO_LANG=a
```

### `.env.example` (commit this)

Same file as above, but with all values set to empty strings.

---

## 5. Authentication (`auth.py`)

### Strategy

Use JWT Bearer token authentication, with a deliberate shortcut for fast startup: also accept a single **static token** defined in `.env`. This means:

- The user can call the API immediately using `STATIC_API_TOKEN` — no login flow required.
- The JWT infrastructure is in place for when a `/token` login endpoint is added later.

### Behaviour

Every request to `/audio-chat` must include:

```
Authorization: Bearer <token>
```

The `get_current_user` dependency (used in the endpoint) must accept the token if **either** of the following is true:
1. The token exactly matches `STATIC_API_TOKEN` from `.env`.
2. The token is a valid, non-expired JWT signed with `SECRET_KEY`.

If neither condition is met, return HTTP 401.

### Functions to implement in `auth.py`

- `create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str`
  Creates and returns a signed JWT.

- `verify_token(token: str) -> dict`
  Decodes and validates a JWT. Raises HTTP 401 if invalid or expired.

- `get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict`
  FastAPI dependency. Checks static token first, then falls back to JWT verification.

---

## 6. Utility Functions

### Important instruction for all three utilities

Both Faster-Whisper and Kokoro are heavy models. **Load each model once at module level** (i.e. outside any function, when the module is first imported). Do not instantiate them inside the function body — this would reload them on every request.

---

### 6.1 STT — `utils/stt.py`

**Reference:** Use the STT CLI sample script provided to you as the basis for how to initialise and call Faster-Whisper. Adapt it into the function below.

**Function contract:**

```
transcribe_audio(file_path: str) -> str
```

- Accepts an absolute or relative path to an audio file on disk.
- The file can be any common format (WAV, MP3, OGG, FLAC, M4A, etc.).
- Returns the full transcript as a single plain-text string.
- The Whisper model must be loaded once at module level using `WHISPER_MODEL_SIZE`, `WHISPER_DEVICE`, and `WHISPER_COMPUTE_TYPE` from `.env`.

**System note:** Faster-Whisper uses `ffmpeg` under the hood for non-WAV formats. Include a comment in the file noting that `ffmpeg` must be installed on the system.

---

### 6.2 TTS — `utils/tts.py`

**Reference:** Use the TTS CLI sample script provided to you as the basis for how to initialise and call Kokoro. Adapt it into the function below.

**Function contract:**

```
synthesise_speech(text: str) -> bytes
```

- Accepts a plain-text string (the LLM response).
- Returns the synthesised audio as raw **WAV bytes** (not a file path, not a numpy array — raw bytes ready to be sent as an HTTP response body).
- The Kokoro pipeline must be loaded once at module level using `KOKORO_LANG` from `.env`.
- The voice to use is read from `KOKORO_VOICE` in `.env`.
- Output format: WAV, PCM 16-bit, at whatever sample rate Kokoro natively produces (do not resample).
- Use `soundfile` and `io.BytesIO` to produce the WAV bytes in memory — do not write to disk.

---

### 6.3 LLM — `utils/llm.py`

No sample script is provided for this one. Implement it from scratch using the `openai` SDK.

**Function contract:**

```
query_llm(user_message: str) -> str
```

- Initialise the `OpenAI` client once at module level, pointing `base_url` and `api_key` at the values from `.env`.
- Send a chat completion request with two messages: a system prompt and the user message.
- Use the system prompt below verbatim — the user will update it later:

```
You are a helpful, concise voice assistant. Respond in clear, natural spoken language. Keep responses brief and conversational. Do not use markdown, bullet points, or any formatting that does not translate well to speech.
```

- Return the LLM's reply as a plain stripped string.
- Read the model name from `LLM_MODEL` in `.env`.

---

## 7. Main Application (`main.py`)

### App setup

- Create a `FastAPI` instance with a title, description, and version.
- Add CORS middleware allowing all origins, all methods, all headers. This is a prototype running locally — do not restrict origins.
- On startup, create the `temp/` directory if it does not already exist.

### Endpoint: `POST /audio-chat`

**Auth:** Protected. Use `get_current_user` as a FastAPI dependency.

**Input:** A multipart file upload field named `file`. Accept any audio format.

**Pipeline (implement in this order):**

1. Read the uploaded file bytes and save them to a temporary file in `temp/`. Preserve the original file extension so Faster-Whisper can detect the format. Use `uuid.uuid4()` to name the file uniquely.
2. Call `transcribe_audio()` with the temp file path → get `transcript`.
3. Call `query_llm()` with the transcript → get `llm_response`.
4. Call `synthesise_speech()` with the LLM response → get `audio_bytes`.
5. Delete the temp file (in a `finally` block so it always runs).
6. Return a `Response` with:
   - `content`: the WAV bytes
   - `media_type`: `"audio/wav"`
   - A `Content-Disposition: inline; filename=response.wav` header
   - An `X-Transcript` header containing the first 200 characters of the transcript (useful for frontend debugging)

**Error handling:** Wrap each pipeline step (STT, LLM, TTS) in its own `try/except`. On failure, raise an `HTTPException` with status 500 and a detail message identifying which step failed and what the error was.

### Endpoint: `GET /health`

No auth. Returns `{"status": "ok"}`. Used to confirm the server is running.

---

## 8. `.gitignore`

```
.env
temp/
__pycache__/
*.pyc
.venv/
```

---

## 9. README

Write a `README.md` with the following sections:

### System Requirements
- Python 3.10+
- `uv` installed
- `ffmpeg` installed (`sudo apt install ffmpeg` on Ubuntu, `brew install ffmpeg` on macOS)

### Setup
```bash
git clone <repo>
cd voice-agent-backend
cp .env.example .env
# Edit .env with your values
uv sync
uv run uvicorn main:app --reload
```

### Testing the endpoint
```bash
curl -X POST http://localhost:8000/audio-chat \
  -H "Authorization: Bearer <STATIC_API_TOKEN>" \
  -F "file=@/path/to/audio.wav" \
  --output response.wav
```

Or visit `http://localhost:8000/docs` for the interactive Swagger UI.

---

## 10. Implementation Checklist

Before finishing, verify each of the following:

- [ ] `uv init` was used and `pyproject.toml` is present
- [ ] All dependencies are added via `uv add` (not pip)
- [ ] `.env.example` exists with blank values; `.env` is in `.gitignore`
- [ ] Faster-Whisper model is loaded once at module level in `stt.py`, not inside `transcribe_audio()`
- [ ] Kokoro pipeline is loaded once at module level in `tts.py`, not inside `synthesise_speech()`
- [ ] `synthesise_speech()` returns raw WAV `bytes`, not a file path or numpy array
- [ ] The `temp/` directory is created at startup and temp files are always deleted in a `finally` block
- [ ] `get_current_user` accepts both the static token and a valid JWT
- [ ] CORS middleware is present and permissive (all origins)
- [ ] `/health` endpoint exists with no auth
- [ ] The `X-Transcript` debug header is present in the `/audio-chat` response

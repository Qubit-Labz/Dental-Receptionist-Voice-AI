# DentalVoice AI

A voice-enabled AI receptionist for a dental clinic, built with a React frontend and a FastAPI backend. The system accepts spoken input from patients, transcribes it to text, processes it through a language model, and responds with natural voice synthesis — enabling hands-free appointment booking and clinic inquiries.

---

## Project Structure

```
.
├── backend/
│   ├── sample-code/                  # Reference CLI scripts (STT & TTS)
│   │   ├── speech-to-text-faster-whisper.py
│   │   └── text-to-speech-kokoro.py
│   ├── voice-agent-backend/          # FastAPI application
│   │   ├── main.py                   # API endpoints: /audio-chat, /health, /appointments
│   │   ├── auth.py                   # JWT + static token authentication
│   │   ├── appointments.db           # SQLite database (auto-generated)
│   │   ├── utils/
│   │   │   ├── stt.py                # Speech-to-Text (Faster-Whisper)
│   │   │   ├── tts.py                # Text-to-Speech (Kokoro)
│   │   │   ├── llm.py                # LLM agent (smolagents + OpenAI-compatible API)
│   │   │   ├── appointment_tool.py   # smolagents tool for booking
│   │   │   ├── date_tool.py          # smolagents tool for date resolution
│   │   │   └── database.py           # SQLite ORM helpers
│   │   ├── .env                      # Secrets (DO NOT COMMIT)
│   │   ├── .env.example              # Template with blank values
│   │   ├── pyproject.toml            # uv-managed dependencies
│   │   └── uv.lock                   # Locked dependency versions
│   └── PLAN.md                       # Implementation plan & design document
├── frontend/
│   ├── project/                      # Vite + React + TypeScript SPA
│   │   ├── src/
│   │   │   ├── App.tsx               # Router: Login ↔ Chat ↔ Appointments
│   │   │   ├── components/
│   │   │   │   ├── ChatPage.tsx      # Voice call interface + visualizer
│   │   │   │   ├── LoginPage.tsx     # Email/OTP authentication
│   │   │   │   ├── AppointmentsPage.tsx  # View scheduled appointments
│   │   │   │   ├── ChatSidebar.tsx   # Conversation history sidebar
│   │   │   │   └── VoiceVisualizer.tsx   # Canvas-based audio waveform
│   │   │   ├── context/AuthContext.tsx   # Mock auth state (localStorage)
│   │   │   ├── hooks/useVoiceAgent.ts    # Web Audio API recording/playback
│   │   │   └── lib/
│   │   │       ├── api.ts            # API URL + token configuration
│   │   │       └── colour_config.ts  # Brand colour tokens
│   │   └── package.json              # npm dependencies (Vite, React, Tailwind)
│   └── project-bolt-sb1-cvnr2fbr.zip # Bolt IDE export (archive)
```

---

## How It Works

### 1. Voice Pipeline (Backend)

```
[User speaks] → Audio file upload
                ↓
    STT: Faster-Whisper transcribes speech → text
                ↓
    LLM: smolagents agent (Gemma) processes text
          with receptionist persona + tool-calling
                ↓
    TTS: Kokoro synthesises response → WAV audio bytes
                ↓
            [WAV response returned]
```

The LLM agent is a **smolagents ToolCallingAgent** that uses two tools:

| Tool | Purpose |
|------|---------|
| `resolve_date` | Converts relative dates ("tomorrow", "next Monday") into `YYYY-MM-DD` |
| `create_dental_appointment` | Books an appointment after validating email, date, and time |

The agent is given a detailed system prompt that defines "Priya" — a warm, professional dental receptionist — and instructs it to never break character or reveal its tools.

### 2. Frontend Flow

The SPA has three views:

1. **Login** — Email + OTP verification (mock auth stored in `localStorage`)
2. **Chat** — Press the microphone to record a voice message; the audio is sent to the backend's `/audio-chat` endpoint; the synthesised WAV response plays back with a real-time waveform visualizer
3. **Appointments** — Fetches and displays booked appointments from the backend's `/appointments` endpoint

---

## Prerequisites

| Requirement | Why |
|-------------|-----|
| **Python ≥ 3.10** | Backend runtime |
| **uv** | Dependency manager (see [uv.md](https://docs.astral.sh/uv/)) |
| **ffmpeg** | Required by Faster-Whisper for non-WAV audio formats |
| **Node.js ≥ 18** | Frontend build tooling |

---

## Running the Backend

```bash
cd backend/voice-agent-backend

# Copy the environment template and fill in values
cp .env.example .env
# Edit .env with your API keys, model name, token, etc.

# Install dependencies
uv sync

# Start the server
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The Swagger docs are available at `http://localhost:8000/docs`.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing secret | (empty) |
| `STATIC_API_TOKEN` | Quick-test bearer token | (empty) |
| `LLM_BASE_URL` | OpenAI-compatible API base URL | (empty) |
| `LLM_API_KEY` | API key for the LLM service | (empty) |
| `LLM_MODEL` | Model name to use | `unsloth/gemma-4-E4B-it-qat-GGUF:UD-Q4_K_XL` |
| `WHISPER_MODEL_SIZE` | Whisper model size | `base` |
| `WHISPER_DEVICE` | Inference device | `cpu` |
| `WHISPER_COMPUTE_TYPE` | Compute precision | `int8` |
| `KOKORO_VOICE` | Kokoro voice ID | `af_heart` |
| `KOKORO_LANG` | Kokoro language code | `a` (American English) |

---

## Running the Frontend

```bash
cd frontend/project

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend expects the backend at `http://localhost:8000` (configured in `src/lib/api.ts`).

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/audio-chat` | Bearer token | Upload audio → get synthesised WAV response |
| `GET` | `/health` | None | Health check |
| `GET` | `/appointments?email=...` | Bearer token | List appointments for a user |

---

## Testing

Run the manual smoke test from the backend directory:

```bash
cd backend/voice-agent-backend
uv run python test_agent.py
```

This sends seven questions to the LLM agent covering identity, capabilities, booking with missing info, and full booking paths.

---

## Security Notes

- **`.env` files must never be committed.** Both subdirectory `.gitignore` files and the root `.gitignore` protect `.env` and `.env.local` from being tracked.
- **Hardcoded token in frontend.** The frontend's `src/lib/api.ts` contains a hardcoded `STATIC_API_TOKEN` that matches the backend's `.env` value. This token is currently visible in source code. **Recommendation:** move it to a frontend `.env` variable (`VITE_API_TOKEN`) and read it via `import.meta.env`.
- **CORS is permissive** (`allow_origins=["*"]`) — suitable for local development but should be restricted before production.

---

## Known Limitations

- The auth system is a mock (localStorage-based). It does not use Supabase despite `@supabase/supabase-js` being listed as a dependency.
- The chat sidebar renders empty because the transcript data flow from backend → frontend is not yet wired up (see `ChatPage.tsx` comments).
- The backend's temp directory is created at startup and cleaned after each request, but `__pycache__` and `temp/` files are gitignored.
- The LLM model is loaded once at module level across `stt.py`, `tts.py`, and `llm.py`, which means large model weights stay in memory for the lifetime of the process.

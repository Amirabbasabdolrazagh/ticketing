import os
import tempfile
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel

MODEL_NAME = os.getenv("VOICE_MODEL", "turbo")
MAX_AUDIO_SIZE = 15 * 1024 * 1024
model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")
    yield
    model = None


app = FastAPI(title="IT RASAM Persian Voice Transcription", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok" if model else "starting", "model": MODEL_NAME}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="فقط فایل صوتی مجاز است.")

    content = await audio.read()
    if not content or len(content) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=400, detail="فایل صوتی معتبر نیست یا بیش از ۱۵ مگابایت است.")

    suffix = os.path.splitext(audio.filename or "voice.webm")[1] or ".webm"
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temporary_file:
            temporary_file.write(content)
            temporary_path = temporary_file.name
        started_at = time.monotonic()
        segments, info = model.transcribe(
            temporary_path,
            language="fa",
            task="transcribe",
            beam_size=2,
            temperature=0,
            vad_filter=True,
            condition_on_previous_text=False,
            without_timestamps=True,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        print(
            f"voice_transcribed model={MODEL_NAME} audio_seconds={info.duration:.1f} "
            f"processing_seconds={time.monotonic() - started_at:.1f}",
            flush=True,
        )
        if not text:
            raise HTTPException(status_code=422, detail="متن قابل تشخیصی از صوت دریافت نشد.")
        return {"text": text}
    finally:
        if temporary_path and os.path.exists(temporary_path):
            os.remove(temporary_path)

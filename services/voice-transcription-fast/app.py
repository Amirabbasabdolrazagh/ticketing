"""Optional Persian ASR sidecar. The production Whisper service remains separate."""

import os
import subprocess
import tempfile
import time
import urllib.request
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import sherpa_onnx
from fastapi import FastAPI, File, HTTPException, UploadFile

MODEL_DIR = Path(os.getenv("VOICE_MODEL_DIR", "/models/shenava-koochik-v1"))
MODEL_REVISION = "8ec9237"
MODEL_BASE = f"https://huggingface.co/Reza2kn/Shenava-Koochik-v1.0-sherpa-onnx/resolve/{MODEL_REVISION}"
MAX_AUDIO_SIZE = 250 * 1024 * 1024
MAX_AUDIO_SECONDS = 4 * 60 * 60
CHUNK_SECONDS = 60
recognizer = None


def ensure_model():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for name, minimum_size in (("model.onnx", 100_000_000), ("tokens.txt", 1_000), ("LICENSE", 1_000)):
        target = MODEL_DIR / name
        if target.is_file() and target.stat().st_size >= minimum_size:
            continue
        print(f"downloading_voice_model file={name}", flush=True)
        temporary = target.with_suffix(target.suffix + ".download")
        request = urllib.request.Request(f"{MODEL_BASE}/{name}?download=true", headers={"User-Agent": "itrasam-voice-transcription/1.0"})
        try:
            with urllib.request.urlopen(request, timeout=180) as response, temporary.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    output.write(chunk)
            if temporary.stat().st_size < minimum_size:
                raise RuntimeError(f"Invalid model file: {name}")
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global recognizer
    ensure_model()
    recognizer = sherpa_onnx.OfflineRecognizer.from_nemo_ctc(
        model=str(MODEL_DIR / "model.onnx"),
        tokens=str(MODEL_DIR / "tokens.txt"),
        num_threads=max(1, min(int(os.getenv("VOICE_THREADS", "4")), 16)),
    )
    print("voice_model_ready model=shenava-koochik-v1", flush=True)
    yield
    recognizer = None


app = FastAPI(title="IT RASAM Fast Persian Voice Transcription", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok" if recognizer else "starting", "model": "shenava-koochik-v1"}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="فقط فایل صوتی مجاز است.")

    content = await audio.read(MAX_AUDIO_SIZE + 1)
    if not content or len(content) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=400, detail="فایل صوتی معتبر نیست یا بیش از ۲۵۰ مگابایت است.")

    started_at = time.monotonic()
    with tempfile.TemporaryDirectory() as temporary_dir:
        audio_path = Path(temporary_dir) / "voice"
        audio_path.write_bytes(content)
        try:
            probe = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)],
                capture_output=True, text=True, timeout=30, check=True,
            )
            duration = float(probe.stdout.strip())
        except (ValueError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
            raise HTTPException(status_code=400, detail="فایل صوتی قابل خواندن نیست.") from error
        if duration < 0.2 or duration > MAX_AUDIO_SECONDS:
            raise HTTPException(status_code=400, detail="طول تماس باید بین ۰٫۲ ثانیه تا ۴ ساعت باشد.")

        segments = []
        for start in range(0, int(duration) + 1, CHUNK_SECONDS):
            try:
                decoded = subprocess.run(
                    ["ffmpeg", "-v", "error", "-nostdin", "-ss", str(start), "-i", str(audio_path), "-t", str(CHUNK_SECONDS), "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"],
                    capture_output=True, timeout=90, check=True,
                )
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
                raise HTTPException(status_code=400, detail="بخشی از فایل تماس قابل خواندن نیست.") from error
            samples = np.frombuffer(decoded.stdout, dtype=np.float32)
            if len(samples) < 3200:
                continue
            stream = recognizer.create_stream()
            stream.accept_waveform(16000, samples)
            recognizer.decode_stream(stream)
            segment_text = stream.result.text.strip()
            if segment_text:
                segments.append({"start": start, "end": min(start + CHUNK_SECONDS, duration), "text": segment_text})

    text = "\n".join(segment["text"] for segment in segments).strip()
    print(f"voice_transcribed model=shenava-koochik-v1 audio_seconds={duration:.1f} processing_seconds={time.monotonic() - started_at:.1f}", flush=True)
    if not text:
        raise HTTPException(status_code=422, detail="متن قابل تشخیصی از صوت دریافت نشد.")
    return {"text": text, "segments": segments, "duration": duration, "model": "shenava-koochik-v1"}

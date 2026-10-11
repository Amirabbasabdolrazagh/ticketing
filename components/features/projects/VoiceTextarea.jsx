"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

export default function VoiceTextarea({ value, onChange, className = "", placeholder = "", ...props }) {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const latestValueRef = useRef(value || "");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [permissionHelp, setPermissionHelp] = useState(false);
  const canRecord = typeof window !== "undefined" && Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
  useEffect(() => { latestValueRef.current = value || ""; }, [value]);
  useEffect(() => () => {
    if (recorderRef.current) {
      recorderRef.current.onstop = null;
      if (recorderRef.current.state === "recording") recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const requestMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMessage("دسترسی میکروفن فعال نیست. راهنمای فعال‌سازی را ببینید.");
      setPermissionHelp(true);
      return null;
    }
  };

  const transcribeOnServer = async (blob) => {
    setProcessing(true);
    setMessage("در حال تبدیل صدا به متن فارسی…");
    try {
      const form = new FormData();
      form.append("audio", blob, blob.type.includes("mp4") ? "voice.m4a" : "voice.webm");
      const response = await fetch("/api/voice-transcription", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || "تبدیل صوت ناموفق بود.");
      const recognizedText = String(payload.text || "").trim();
      if (!recognizedText) throw new Error("متنی از صدا تشخیص داده نشد.");
      const currentValue = latestValueRef.current.trim();
      const nextValue = [currentValue, recognizedText].filter(Boolean).join(" ");
      latestValueRef.current = nextValue;
      onChange(nextValue);
      setMessage(`متن فارسی به فیلد اضافه شد${Number.isFinite(payload.durationSeconds) ? `؛ زمان پردازش ${payload.durationSeconds} ثانیه` : ""}.`);
    } catch (error) {
      setMessage(error.message || "تبدیل صوت ناموفق بود.");
    } finally {
      setProcessing(false);
    }
  };

  const startRecording = async () => {
    if (!canRecord) {
      setMessage("ضبط صدا در این مرورگر پشتیبانی نمی‌شود.");
      return;
    }
    const stream = await requestMicrophone();
    if (!stream) return;
    try {
      const preferredType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        streamRef.current = null;
        setRecording(false);
        if (blob.size < 500) { setMessage("صدایی دریافت نشد؛ دوباره تلاش کنید."); return; }
        await transcribeOnServer(blob);
      };
      recorder.start();
      setRecording(true);
      setMessage("در حال ضبط… پس از پایان، دکمهٔ پایان را بزنید.");
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setMessage("شروع ضبط در این مرورگر ممکن نشد؛ دسترسی میکروفن را بررسی کنید.");
    }
  };
  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  return <div className="mt-2">
    <div className="relative">
      <textarea value={value || ""} onChange={(event) => { latestValueRef.current = event.target.value; onChange(event.target.value); }} placeholder={placeholder} className={`${className} pb-14`} {...props} />
      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] gap-1.5" dir="rtl">
        <button type="button" onClick={recording ? stopRecording : startRecording} disabled={!canRecord || processing || props.readOnly || props.disabled} title="تبدیل گفتار فارسی به متن" aria-label={recording ? "پایان ضبط صدا" : "ضبط صدا و تبدیل به متن"} className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold shadow-sm transition sm:px-3 ${recording ? "bg-red-600 text-white" : "border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"} disabled:cursor-not-allowed disabled:opacity-45`}>
          {recording ? <Square className="size-3.5 shrink-0" /> : <Mic className="size-3.5 shrink-0" />}{recording ? "پایان ضبط" : processing ? "در حال تبدیل…" : "تبدیل گفتار"}
        </button>
      </div>
    </div>
    {message && <p className={`mt-1 text-xs ${recording ? "text-red-600" : "text-slate-500"}`} aria-live="polite">{message}</p>}
    {permissionHelp && <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-right text-xs leading-6 text-amber-950"><div className="flex items-start justify-between gap-3"><strong>راهنمای فعال‌سازی میکروفن</strong><button type="button" onClick={() => setPermissionHelp(false)} className="text-amber-800" aria-label="بستن راهنما">×</button></div><p className="mt-2"><strong>Chrome در اندروید:</strong> کنار نوار آدرس، روی نماد قفل یا تنظیمات بزنید ← «مجوزها» ← «میکروفن» ← «اجازه دادن».</p><p className="mt-2"><strong>iPhone / iPad:</strong> وارد Settings گوشی شوید ← Safari یا Chrome ← Microphone ← آن را فعال کنید.</p></div>}
  </div>;
}

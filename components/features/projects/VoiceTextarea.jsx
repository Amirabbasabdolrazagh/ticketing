"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

function speechApi() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function isMobileBrowser() {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function VoiceTextarea({ value, onChange, className = "", placeholder = "", ...props }) {
  const recognitionRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const baseValueRef = useRef("");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [permissionHelp, setPermissionHelp] = useState(false);
  const canRecord = typeof window !== "undefined" && Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
  const supported = Boolean(speechApi()) || canRecord;

  useEffect(() => () => {
    recognitionRef.current?.abort();
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const appendText = (text) => {
    const cleanText = String(text || "").trim();
    if (!cleanText) return;
    onChange([baseValueRef.current, cleanText].filter(Boolean).join(baseValueRef.current ? " " : ""));
  };

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
    setMessage("صدا ضبط شد؛ در حال تبدیل به متن فارسی…");
    try {
      const form = new FormData();
      form.append("audio", blob, blob.type.includes("mp4") ? "voice.m4a" : "voice.webm");
      const response = await fetch("/api/voice-transcription", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || "تبدیل صوت ناموفق بود.");
      appendText(payload.text);
      setMessage("متن فارسی به فیلد اضافه شد.");
    } catch (error) {
      setMessage(error.message || "تبدیل صوت روی سرور ناموفق بود؛ دوباره تلاش کنید.");
    } finally {
      setProcessing(false);
    }
  };

  const startServerRecording = async () => {
    if (!canRecord) {
      setMessage("ضبط صدا در این مرورگر پشتیبانی نمی‌شود.");
      return;
    }
    const stream = await requestMicrophone();
    if (!stream) return;
    const preferredType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
    baseValueRef.current = value?.trim() || "";
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
    setMessage("در حال ضبط… پس از پایان، صدا روی سرور به متن فارسی تبدیل می‌شود.");
  };

  const startBrowserRecognition = async () => {
    const Recognition = speechApi();
    if (!Recognition) return startServerRecording();
    const stream = await requestMicrophone();
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
    const recognition = new Recognition();
    recognition.lang = "fa-IR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    baseValueRef.current = value?.trim() || "";
    setMessage("در حال شنیدن… صحبت کنید.");
    setRecording(true);
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      appendText(transcript);
    };
    recognition.onerror = (event) => {
      if (event.error === "service-not-allowed") {
        setMessage("تبدیل مرورگر در دسترس نیست؛ ضبط سروری جایگزین شد.");
        recognitionRef.current = null;
        setRecording(false);
        startServerRecording();
        return;
      }
      const errors = { "not-allowed": "اجازهٔ استفاده از میکروفن داده نشده است.", "no-speech": "صدایی دریافت نشد؛ دوباره تلاش کنید.", network: "اتصال سرویس تبدیل گفتار برقرار نشد." };
      setMessage(errors[event.error] || "تبدیل گفتار ناموفق بود؛ دوباره تلاش کنید.");
      if (event.error === "not-allowed") setPermissionHelp(true);
    };
    recognition.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
      setMessage((current) => current === "در حال شنیدن… صحبت کنید." ? "متن به فیلد اضافه شد." : current);
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setRecording(false); startServerRecording(); }
  };

  const start = () => {
    if (isMobileBrowser()) return startServerRecording();
    return startBrowserRecognition();
  };
  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else recognitionRef.current?.stop();
  };

  return <div className="relative mt-2">
    <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${className} pb-12`} {...props} />
    <button type="button" onClick={recording ? stop : start} disabled={!supported || processing} title="تبدیل گفتار فارسی به متن" className={`absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${recording ? "bg-red-600 text-white" : "border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"} disabled:cursor-not-allowed disabled:opacity-45`}>
      {recording ? <Square className="size-3.5" /> : <Mic className="size-3.5" />}{recording ? "پایان ضبط" : processing ? "در حال تبدیل…" : "تبدیل گفتار"}
    </button>
    {message && <p className={`mt-1 text-xs ${recording ? "text-red-600" : "text-slate-500"}`} aria-live="polite">{message}</p>}
    {permissionHelp && <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-right text-xs leading-6 text-amber-950"><div className="flex items-start justify-between gap-3"><strong>راهنمای فعال‌سازی میکروفن</strong><button type="button" onClick={() => setPermissionHelp(false)} className="text-amber-800" aria-label="بستن راهنما">×</button></div><p className="mt-2"><strong>Chrome در اندروید:</strong> کنار نوار آدرس، روی نماد قفل یا تنظیمات بزنید ← «مجوزها» ← «میکروفن» ← «اجازه دادن».</p><p className="mt-2"><strong>iPhone / iPad:</strong> وارد Settings گوشی شوید ← Safari یا Chrome ← Microphone ← آن را فعال کنید.</p></div>}
  </div>;
}

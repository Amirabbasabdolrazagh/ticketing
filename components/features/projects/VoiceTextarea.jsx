"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

const MODELS = ["1", "2"];

export default function VoiceTextarea({ value, onChange, className = "", placeholder = "", ...props }) {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const lastAppliedRef = useRef("");
  const latestValueRef = useRef(value || "");
  const [recordingModel, setRecordingModel] = useState(null);
  const [processingModel, setProcessingModel] = useState(null);
  const [results, setResults] = useState({});
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

  const transcribeOnServer = async (blob, selectedModel) => {
    setProcessingModel(selectedModel);
    setMessage(`مدل ${selectedModel} در حال تبدیل صدا به متن فارسی است…`);
    try {
      const form = new FormData();
      form.append("model", selectedModel);
      form.append("audio", blob, blob.type.includes("mp4") ? "voice.m4a" : "voice.webm");
      const response = await fetch("/api/voice-transcription", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || `مدل ${selectedModel} پاسخ نداد.`);
      const recognizedText = String(payload.text || "").trim();
      if (!recognizedText) throw new Error(`مدل ${selectedModel} متنی تشخیص نداد.`);
      const currentValue = latestValueRef.current.trim();
      const baseValue = lastAppliedRef.current && currentValue.endsWith(lastAppliedRef.current)
        ? currentValue.slice(0, -lastAppliedRef.current.length).trim()
        : currentValue;
      const nextValue = [baseValue, recognizedText].filter(Boolean).join(" ");
      latestValueRef.current = nextValue;
      onChange(nextValue);
      lastAppliedRef.current = recognizedText;
      setResults((current) => ({ ...current, [selectedModel]: { text: recognizedText, seconds: payload.durationSeconds } }));
      setMessage(`متن مدل ${selectedModel} به فیلد اضافه شد${Number.isFinite(payload.durationSeconds) ? `؛ زمان پردازش ${payload.durationSeconds} ثانیه` : ""}.`);
    } catch (error) {
      setMessage(`مدل ${selectedModel}: ${error.message || "تبدیل صوت ناموفق بود."}`);
    } finally {
      setProcessingModel(null);
    }
  };

  const startRecording = async (selectedModel) => {
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
        setRecordingModel(null);
        if (blob.size < 500) { setMessage("صدایی دریافت نشد؛ دوباره تلاش کنید."); return; }
        await transcribeOnServer(blob, selectedModel);
      };
      recorder.start();
      setRecordingModel(selectedModel);
      setMessage(`مدل ${selectedModel}: در حال ضبط… پس از پایان، دکمهٔ پایان را بزنید.`);
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
        {MODELS.map((modelNumber) => {
          const active = recordingModel === modelNumber;
          return <button key={modelNumber} type="button" onClick={active ? stopRecording : () => startRecording(modelNumber)} disabled={!canRecord || Boolean(processingModel) || Boolean(recordingModel && !active) || props.readOnly || props.disabled} title={`تبدیل گفتار فارسی با مدل ${modelNumber}`} aria-label={active ? `پایان ضبط مدل ${modelNumber}` : `ضبط صدا با مدل ${modelNumber}`} className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold shadow-sm transition sm:px-3 ${active ? "bg-red-600 text-white" : "border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"} disabled:cursor-not-allowed disabled:opacity-45`}>
            {active ? <Square className="size-3.5 shrink-0" /> : <Mic className="size-3.5 shrink-0" />}{active ? `پایان مدل ${modelNumber}` : processingModel === modelNumber ? "در حال تبدیل…" : `مدل ${modelNumber}`}
          </button>;
        })}
      </div>
    </div>
    {message && <p className={`mt-1 text-xs ${recordingModel ? "text-red-600" : "text-slate-500"}`} aria-live="polite">{message}</p>}
    {Object.keys(results).length > 0 && <details className="mt-2 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs text-slate-700"><summary className="cursor-pointer font-bold text-blue-800">مقایسهٔ خروجی و زمان مدل‌ها</summary><div className="mt-2 space-y-2">{MODELS.filter((modelNumber) => results[modelNumber]).map((modelNumber) => <p key={modelNumber}><strong>مدل {modelNumber} ({results[modelNumber].seconds ?? "؟"} ثانیه):</strong> {results[modelNumber].text}</p>)}</div></details>}
    {permissionHelp && <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-right text-xs leading-6 text-amber-950"><div className="flex items-start justify-between gap-3"><strong>راهنمای فعال‌سازی میکروفن</strong><button type="button" onClick={() => setPermissionHelp(false)} className="text-amber-800" aria-label="بستن راهنما">×</button></div><p className="mt-2"><strong>Chrome در اندروید:</strong> کنار نوار آدرس، روی نماد قفل یا تنظیمات بزنید ← «مجوزها» ← «میکروفن» ← «اجازه دادن».</p><p className="mt-2"><strong>iPhone / iPad:</strong> وارد Settings گوشی شوید ← Safari یا Chrome ← Microphone ← آن را فعال کنید.</p></div>}
  </div>;
}

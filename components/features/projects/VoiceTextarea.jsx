"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

function speechApi() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function VoiceTextarea({ value, onChange, className = "", placeholder = "", ...props }) {
  const recognitionRef = useRef(null);
  const baseValueRef = useRef("");
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");
  const supported = Boolean(speechApi());

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = () => recognitionRef.current?.stop();
  const start = () => {
    const Recognition = speechApi();
    if (!Recognition) {
      setMessage("تبدیل گفتار در این مرورگر پشتیبانی نمی‌شود.");
      return;
    }

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
      onChange([baseValueRef.current, transcript.trim()].filter(Boolean).join(baseValueRef.current && transcript.trim() ? " " : ""));
    };
    recognition.onerror = (event) => {
      const errors = { "not-allowed": "اجازهٔ استفاده از میکروفن داده نشده است.", "no-speech": "صدایی دریافت نشد؛ دوباره تلاش کنید.", "network": "اتصال سرویس تبدیل گفتار برقرار نشد." };
      setMessage(errors[event.error] || "تبدیل گفتار ناموفق بود؛ دوباره تلاش کنید.");
    };
    recognition.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
      setMessage((current) => current === "در حال شنیدن… صحبت کنید." ? "متن به فیلد اضافه شد." : current);
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setRecording(false); setMessage("ضبط صدا هم‌اکنون فعال است."); }
  };

  return <div className="relative mt-2">
    <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${className} pb-12`} {...props} />
    <button type="button" onClick={recording ? stop : start} disabled={!supported} title={supported ? "تبدیل گفتار فارسی به متن" : "مرورگر شما تبدیل گفتار را پشتیبانی نمی‌کند"} className={`absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${recording ? "bg-red-600 text-white" : "border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"} disabled:cursor-not-allowed disabled:opacity-45`}>
      {recording ? <Square className="size-3.5" /> : <Mic className="size-3.5" />}{recording ? "پایان ضبط" : "تبدیل گفتار"}
    </button>
    {message && <p className={`mt-1 text-xs ${recording ? "text-red-600" : "text-slate-500"}`} aria-live="polite">{message}</p>}
  </div>;
}

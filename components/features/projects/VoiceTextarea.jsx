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
  const [permissionHelp, setPermissionHelp] = useState(false);
  const [serviceHelp, setServiceHelp] = useState(false);
  const supported = Boolean(speechApi());

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = () => recognitionRef.current?.stop();
  const requestMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      setRecording(false);
      setMessage("دسترسی میکروفن فعال نیست. راهنمای فعال‌سازی را ببینید.");
      setPermissionHelp(true);
      return false;
    }
  };

  const start = async () => {
    const Recognition = speechApi();
    if (!Recognition) {
      setMessage("موتور تبدیل گفتار فارسی در این مرورگر در دسترس نیست.");
      setServiceHelp(true);
      return;
    }
    if (!await requestMicrophone()) return;

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
      const errors = { "not-allowed": "اجازهٔ استفاده از میکروفن داده نشده است.", "service-not-allowed": "سرویس تبدیل گفتار توسط مرورگر مسدود شده است.", "no-speech": "صدایی دریافت نشد؛ دوباره تلاش کنید.", "network": "اتصال سرویس تبدیل گفتار برقرار نشد." };
      setMessage(errors[event.error] || "تبدیل گفتار ناموفق بود؛ دوباره تلاش کنید.");
      if (event.error === "not-allowed") setPermissionHelp(true);
      if (event.error === "service-not-allowed") setServiceHelp(true);
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
    {permissionHelp && <div role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-right text-xs leading-6 text-amber-950"><div className="flex items-start justify-between gap-3"><strong>راهنمای فعال‌سازی میکروفن</strong><button type="button" onClick={() => setPermissionHelp(false)} className="text-amber-800" aria-label="بستن راهنما">×</button></div><p className="mt-2"><strong>Chrome در اندروید:</strong> کنار نوار آدرس، روی نماد قفل یا تنظیمات بزنید ← «مجوزها» ← «میکروفن» ← «اجازه دادن». سپس صفحه را یک‌بار تازه‌سازی کنید.</p><p className="mt-2"><strong>Chrome در آیفون / آیپد:</strong> وارد Settings گوشی شوید ← Chrome ← Microphone ← آن را فعال کنید.</p><p className="mt-2"><strong>Safari در آیفون / آیپد:</strong> در Safari، دکمهٔ aA کنار آدرس سایت ← Website Settings ← Microphone ← Allow. اگر گزینه نبود: Settings ← Privacy & Security ← Microphone ← Safari Websites را فعال کنید.</p><p className="mt-2 text-amber-800">تبدیل گفتار فقط روی نسخهٔ HTTPS سایت کار می‌کند. پس از فعال‌سازی، دوباره «تبدیل گفتار» را بزنید.</p></div>}
    {serviceHelp && <div role="alert" className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-right text-xs leading-6 text-blue-950"><div className="flex items-start justify-between gap-3"><strong>راهنمای سرویس تبدیل گفتار</strong><button type="button" onClick={() => setServiceHelp(false)} className="text-blue-800" aria-label="بستن راهنما">×</button></div><p className="mt-2">HTTPS سایت فعال است؛ این خطا مربوط به موتور تشخیص گفتارِ مرورگر است، نه گواهی سایت یا مجوز میکروفن.</p><p className="mt-2"><strong>در آیفون:</strong> سایت را مستقیماً در Safari باز کنید، نه از مرورگر داخلی تلگرام/بله و نه نسخهٔ نصب‌شدهٔ وب‌اپ. سپس Settings ← General ← Keyboard ← Enable Dictation را نیز فعال کنید.</p><p className="mt-2"><strong>در Android:</strong> سایت را در Chrome اصلی باز کنید و Chrome را به آخرین نسخه به‌روزرسانی کنید.</p><p className="mt-2 text-blue-800">اگر این خطا در Safari اصلی هم باقی ماند، تبدیل گفتار مرورگر برای فارسی در آن دستگاه در دسترس نیست؛ برای پشتیبانی تضمینی Safari باید تبدیل صدا در سرور انجام شود.</p></div>}
  </div>;
}

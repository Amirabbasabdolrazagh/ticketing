import getCurrentUser from "@/utils/auth";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
const allowedRoles = new Set(["admin", "active_agent", "passive_agent"]);

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user || !allowedRoles.has(user.role)) {
      return Response.json({ success: false, message: "دسترسی تبدیل گفتار برای شما مجاز نیست." }, { status: 403 });
    }

    const form = await request.formData();
    const audio = form.get("audio");
    if (!audio || typeof audio.arrayBuffer !== "function" || audio.size < 1 || audio.size > MAX_AUDIO_SIZE) {
      return Response.json({ success: false, message: "فایل صوتی معتبر نیست یا حجم آن بیش از ۱۵ مگابایت است." }, { status: 400 });
    }
    if (!String(audio.type || "").startsWith("audio/")) {
      return Response.json({ success: false, message: "فقط فایل صوتی قابل تبدیل است." }, { status: 400 });
    }

    const serviceUrl = process.env.VOICE_TRANSCRIPTION_URL || "http://voice-transcription:9000";
    const serviceForm = new FormData();
    serviceForm.append("audio", new Blob([await audio.arrayBuffer()], { type: audio.type }), audio.name || "voice.webm");
    const response = await fetch(`${serviceUrl}/transcribe`, {
      method: "POST",
      body: serviceForm,
      signal: AbortSignal.timeout(180000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.text) {
      return Response.json({ success: false, message: payload.message || payload.detail || "تبدیل صوت روی سرور ناموفق بود." }, { status: response.status >= 500 ? 503 : 400 });
    }
    return Response.json({ success: true, text: String(payload.text).trim() });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      return Response.json({ success: false, message: "تبدیل صوت بیش از حد طول کشید؛ دوباره با صدای کوتاه‌تر تلاش کنید." }, { status: 504 });
    }
    console.error("VOICE TRANSCRIPTION ERROR", error);
    return Response.json({ success: false, message: "سرویس تبدیل صوت در دسترس نیست؛ دوباره تلاش کنید." }, { status: 503 });
  }
}

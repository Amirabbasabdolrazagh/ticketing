import path from "path";
import { readFile } from "fs/promises";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";

const RECORDING_ROOT = process.env.PHONE_RECORDING_PATH || "/app/storage/call-recordings";

function extractJson(value) {
  const text = String(value || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(text); } catch { return null; }
}

async function analyzeTranscript(transcript) {
  const url = process.env.PHONE_CALL_ANALYSIS_URL?.trim();
  if (!url) return {
    summary: transcript.slice(0, 2500),
    issue: "نیازمند بازبینی مدیر",
    customerRequests: "از متن کامل مکالمه بررسی شود",
    agentActions: "از متن کامل مکالمه بررسی شود",
    resolution: "هنوز تحلیل هوشمند پیکربندی نشده است",
    outcome: "unknown",
    satisfactionEvidence: "در متن کامل بررسی شود",
    followUp: "گزارش ساختاریافته توسط پشتیبان تکمیل شود",
    model: "extractive-fallback",
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.PHONE_CALL_ANALYSIS_API_KEY ? { Authorization: `Bearer ${process.env.PHONE_CALL_ANALYSIS_API_KEY}` } : {}) },
    body: JSON.stringify({
      model: process.env.PHONE_CALL_ANALYSIS_MODEL || "local-call-analyzer",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "شما تحلیلگر مرکز تماس فارسی هستید. فقط JSON معتبر با کلیدهای summary, issue, customerRequests, agentActions, resolution, outcome, satisfactionEvidence, followUp برگردان. outcome یکی از resolved, follow_up, unresolved, unknown باشد. چیزی را که در متن نیست حدس نزن." },
        { role: "user", content: `متن کامل مکالمه:\n${transcript.slice(0, 180000)}` },
      ],
    }),
    signal: AbortSignal.timeout(300000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error("سرویس تحلیل مکالمه پاسخ معتبر نداد");
  const content = payload.choices?.[0]?.message?.content ?? payload.output_text ?? payload;
  const parsed = typeof content === "object" ? content : extractJson(content);
  if (!parsed) throw new Error("خروجی تحلیل مکالمه JSON معتبر نیست");
  return { ...parsed, model: process.env.PHONE_CALL_ANALYSIS_MODEL || "local-call-analyzer" };
}

export async function transcribePhoneCall(callId) {
  await ConnectDb();
  const call = await PhoneCall.findOne({ callId });
  if (!call?.recording?.storedName) return;
  call.transcription.status = "processing";
  call.transcription.error = "";
  await call.save();
  try {
    const safeName = path.basename(call.recording.storedName);
    const audio = await readFile(path.join(RECORDING_ROOT, safeName));
    const form = new FormData();
    form.append("audio", new Blob([audio], { type: call.recording.mimeType || "audio/wav" }), safeName);
    const serviceUrl = process.env.VOICE_TRANSCRIPTION_FAST_URL || "http://127.0.0.1:9001";
    const response = await fetch(`${serviceUrl}/transcribe`, { method: "POST", body: form, signal: AbortSignal.timeout(30 * 60 * 1000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.text) throw new Error(payload.detail || payload.message || "تبدیل متن تماس ناموفق بود");
    call.transcript = String(payload.text).trim();
    call.transcription.status = "completed";
    call.transcription.segments = Array.isArray(payload.segments) ? payload.segments.slice(0, 500) : [];
    call.transcription.engine = String(payload.model || "shenava-koochik-v1").slice(0, 100);
    call.transcription.completedAt = new Date();
    try {
      const analysis = await analyzeTranscript(call.transcript);
      call.analysis = {
        summary: String(analysis.summary || "").slice(0, 12000),
        issue: String(analysis.issue || "").slice(0, 5000),
        customerRequests: String(analysis.customerRequests || "").slice(0, 5000),
        agentActions: String(analysis.agentActions || "").slice(0, 5000),
        resolution: String(analysis.resolution || "").slice(0, 5000),
        outcome: ["resolved", "follow_up", "unresolved", "unknown"].includes(analysis.outcome) ? analysis.outcome : "unknown",
        satisfactionEvidence: String(analysis.satisfactionEvidence || "").slice(0, 3000),
        followUp: String(analysis.followUp || "").slice(0, 5000),
        model: String(analysis.model || "").slice(0, 120),
        generatedAt: new Date(),
      };
    } catch (analysisError) {
      console.error("PHONE CALL ANALYSIS ERROR", analysisError);
    }
    await call.save();
  } catch (error) {
    call.transcription.status = "failed";
    call.transcription.error = String(error?.message || "خطای تبدیل متن").slice(0, 500);
    await call.save();
    console.error("PHONE TRANSCRIPTION ERROR", error);
  }
}

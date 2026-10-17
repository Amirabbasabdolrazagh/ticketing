import path from "path";
import { readFile } from "fs/promises";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";

const RECORDING_ROOT = process.env.PHONE_RECORDING_PATH || "/app/storage/call-recordings";

async function analyzeTranscript(transcript, serviceUrl) {
  const response = await fetch(`${serviceUrl}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: transcript }),
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json();
  if (!response.ok || typeof payload?.summary !== "string") throw new Error("سرویس گزارش‌ساز محلی پاسخ معتبر نداد");
  return payload;
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
    const serviceUrl = process.env.PHONE_TRANSCRIPTION_FAST_URL || process.env.VOICE_TRANSCRIPTION_FAST_URL || "http://127.0.0.1:9001";
    const response = await fetch(`${serviceUrl}/transcribe`, { method: "POST", body: form, signal: AbortSignal.timeout(30 * 60 * 1000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.text) throw new Error(payload.detail || payload.message || "تبدیل متن تماس ناموفق بود");
    call.transcript = String(payload.text).trim();
    call.transcription.status = "completed";
    call.transcription.segments = Array.isArray(payload.segments) ? payload.segments.slice(0, 500) : [];
    call.transcription.engine = String(payload.model || "shenava-koochik-v1").slice(0, 100);
    call.transcription.completedAt = new Date();
    try {
      const analysis = await analyzeTranscript(call.transcript, serviceUrl);
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
      if (!call.report?.completedAt) {
        if (!call.report) call.report = {};
        call.report.issue ||= call.analysis.issue;
        call.report.customerRequests ||= call.analysis.customerRequests;
        call.report.actions ||= call.analysis.agentActions;
        call.report.result ||= call.analysis.resolution;
        if (call.report.outcome === "unknown") call.report.outcome = call.analysis.outcome;
      }
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

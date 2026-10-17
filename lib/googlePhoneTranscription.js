import crypto from "crypto";
import path from "path";
import { v1 as speechV1 } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";

const RECORDING_ROOT = process.env.PHONE_RECORDING_PATH || "/app/storage/call-recordings";

export async function transcribePhoneCallWithGoogle(callId) {
  await ConnectDb();
  const call = await PhoneCall.findOne({ callId }).select("recording googleTranscription").lean();
  if (!call?.recording?.storedName) return;

  const bucketName = process.env.GOOGLE_CLOUD_STT_BUCKET?.trim();
  if (!bucketName || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    await PhoneCall.updateOne({ callId }, { $set: {
      "googleTranscription.status": "failed",
      "googleTranscription.error": "باکت یا فایل حساب سرویس گوگل روی سرور تلفن تنظیم نشده است.",
    } });
    return;
  }

  const objectName = `phone-transcription-tests/${crypto.randomUUID()}.wav`;
  let file;
  let speech;
  let uploaded = false;

  try {
    const storage = new Storage();
    file = storage.bucket(bucketName).file(objectName);
    speech = new speechV1.SpeechClient();
    await PhoneCall.updateOne({ callId }, { $set: {
      "googleTranscription.status": "processing",
      "googleTranscription.error": "",
      "googleTranscription.startedAt": new Date(),
    } });
    const localPath = path.join(RECORDING_ROOT, path.basename(call.recording.storedName));
    await storage.bucket(bucketName).upload(localPath, {
      destination: objectName,
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: { contentType: "audio/wav" },
    });
    uploaded = true;

    // Long-running recognition supports complete calls; WAV headers provide the codec and sample rate.
    const [operation] = await speech.longRunningRecognize({
      config: { languageCode: "fa-IR", model: "default", enableAutomaticPunctuation: true },
      audio: { uri: `gs://${bucketName}/${objectName}` },
    });
    const [result] = await operation.promise();
    const transcript = (result.results || [])
      .map((part) => part.alternatives?.[0]?.transcript?.trim() || "")
      .filter(Boolean).join("\n").slice(0, 250000);
    if (!transcript) throw new Error("گوگل متنی از این مکالمه تشخیص نداد.");

    await PhoneCall.updateOne({ callId }, { $set: {
      "googleTranscription.status": "completed",
      "googleTranscription.text": transcript,
      "googleTranscription.error": "",
      "googleTranscription.completedAt": new Date(),
    } });
  } catch (error) {
    console.error("PHONE GOOGLE TRANSCRIPTION ERROR", error);
    await PhoneCall.updateOne({ callId }, { $set: {
      "googleTranscription.status": "failed",
      "googleTranscription.error": String(error?.message || "تبدیل متن با گوگل ناموفق بود").slice(0, 500),
    } });
  } finally {
    if (uploaded && file) {
      try { await file.delete({ ignoreNotFound: true }); }
      catch (error) { console.error("PHONE GOOGLE TEMPORARY AUDIO CLEANUP ERROR", error); }
    }
    if (speech) await speech.close().catch((error) => console.error("PHONE GOOGLE CLIENT CLOSE ERROR", error));
  }
}

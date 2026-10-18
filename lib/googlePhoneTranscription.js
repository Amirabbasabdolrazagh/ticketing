import crypto from "crypto";
import path from "path";
import { open } from "node:fs/promises";
import { v1 as speechV1 } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import ConnectDb from "@/utils/connectDB";
import PhoneCall from "@/models/phoneCalls";
import GoogleSttUsage from "@/models/googleSttUsage";

const RECORDING_ROOT = process.env.PHONE_RECORDING_PATH || "/app/storage/call-recordings";
const MONTHLY_LOCAL_LIMIT_SECONDS = 55 * 60;

async function billedSecondsFromWav(filePath) {
  const handle = await open(filePath, "r");
  try {
    const header = Buffer.alloc(65536);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead < 44 || header.toString("ascii", 0, 4) !== "RIFF" || header.toString("ascii", 8, 12) !== "WAVE") {
      throw new Error("مدت فایل صوتی قابل اندازه‌گیری نیست؛ فایل باید WAV معتبر باشد.");
    }
    let byteRate = 0;
    let channels = 0;
    let dataBytes = 0;
    for (let offset = 12; offset + 8 <= bytesRead;) {
      const size = header.readUInt32LE(offset + 4);
      const next = offset + 8 + size + (size % 2);
      if (header.toString("ascii", offset, offset + 4) === "fmt " && size >= 16 && offset + 24 <= bytesRead) {
        channels = header.readUInt16LE(offset + 10);
        byteRate = header.readUInt32LE(offset + 16);
      }
      if (header.toString("ascii", offset, offset + 4) === "data") {
        dataBytes = size;
        break;
      }
      if (next <= offset || next > bytesRead) break;
      offset = next;
    }
    if (!byteRate || !channels || !dataBytes || dataBytes === 0xffffffff) {
      throw new Error("مدت فایل صوتی مشخص نیست؛ برای جلوگیری از هزینه، تبدیل گوگل انجام نشد.");
    }
    return Math.ceil(dataBytes * channels / byteRate);
  } finally {
    await handle.close();
  }
}

async function reserveFreeTierSeconds(seconds) {
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > MONTHLY_LOCAL_LIMIT_SECONDS) return false;
  const month = new Date().toISOString().slice(0, 7);
  await GoogleSttUsage.updateOne({ _id: month }, { $setOnInsert: { reservedSeconds: 0 } }, { upsert: true });
  const result = await GoogleSttUsage.updateOne(
    { _id: month, reservedSeconds: { $lte: MONTHLY_LOCAL_LIMIT_SECONDS - seconds } },
    { $inc: { reservedSeconds: seconds } },
  );
  return result.modifiedCount === 1;
}

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
    const billedSeconds = await billedSecondsFromWav(localPath);
    if (!await reserveFreeTierSeconds(billedSeconds)) {
      throw new Error("سقف آزمایشی ۵۵ دقیقهٔ گوگل در این ماه پر شده یا این مکالمه از باقیماندهٔ آن طولانی‌تر است.");
    }
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

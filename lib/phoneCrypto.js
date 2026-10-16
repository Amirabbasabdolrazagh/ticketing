import crypto from "crypto";

function key() {
  const raw = process.env.PHONE_CREDENTIAL_KEY?.trim();
  if (!raw) throw new Error("PHONE_CREDENTIAL_KEY تنظیم نشده است");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new Error("PHONE_CREDENTIAL_KEY باید یک کلید Base64 سی‌ودوبایتی باشد");
  return decoded;
}

export function encryptPhoneSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptPhoneSecret(payload) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskPhone(value) {
  const phone = String(value || "");
  return phone.length > 4 ? `${phone.slice(0, 2)}•••••${phone.slice(-3)}` : "شماره محرمانه";
}

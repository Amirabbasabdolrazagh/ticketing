import crypto from "node:crypto";

const TURN_CREDENTIAL_LIFETIME_SECONDS = 12 * 60 * 60;
const TURN_URL_PATTERN = /^turns?:[A-Za-z0-9.-]+:\d+(?:\?transport=(?:udp|tcp))?$/i;

/**
 * Issue coturn REST-style credentials. The shared secret is only read on the
 * server; the browser receives a temporary username and HMAC password.
 */
export function createEphemeralTurnCredentials({ device, nowMs = Date.now(), env = process.env }) {
  if (env.PHONE_TURN_EPHEMERAL_ENABLED !== "1") return null;
  if (device?.status !== "active" || !device.deviceId || !device.sipUsername) return null;

  const urls = String(env.PHONE_TURN_URL || "").trim();
  const secret = String(env.PHONE_TURN_AUTH_SECRET || "").trim();

  if (!TURN_URL_PATTERN.test(urls)) throw new Error("PHONE_TURN_URL is missing or invalid");
  if (!/^[a-f0-9]{64}$/i.test(secret)) throw new Error("PHONE_TURN_AUTH_SECRET must be a 64-character hex secret");

  const expiresAtSeconds = Math.floor(nowMs / 1000) + TURN_CREDENTIAL_LIFETIME_SECONDS;
  const username = `${expiresAtSeconds}:${device.deviceId}`;
  const credential = crypto.createHmac("sha1", secret).update(username, "utf8").digest("base64");

  return { iceServer: { urls, username, credential }, expiresAtMs: expiresAtSeconds * 1000 };
}

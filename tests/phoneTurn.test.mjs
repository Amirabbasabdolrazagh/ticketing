import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { createEphemeralTurnCredentials } from "../lib/phoneTurn.js";

const env = {
  PHONE_TURN_EPHEMERAL_ENABLED: "1",
  PHONE_TURN_URL: "turn:turn.support.itrasam.com:3478?transport=udp",
  PHONE_TURN_AUTH_SECRET: "9".repeat(64),
};
const device = { status: "active", deviceId: "device-1234567890123456", sipUsername: "web-admin-abc" };
const nowMs = 1792411000000;

test("issues coturn-compatible temporary HMAC credentials for active devices", () => {
  const actual = createEphemeralTurnCredentials({ env, device, nowMs });
  assert.equal(actual.expiresAtMs, nowMs + 12 * 60 * 60 * 1000);
  assert.equal(actual.iceServer.urls, env.PHONE_TURN_URL);
  assert.equal(actual.iceServer.username, `${Math.floor(nowMs / 1000) + 43200}:device-1234567890123456`);
  assert.equal(actual.iceServer.credential, crypto.createHmac("sha1", env.PHONE_TURN_AUTH_SECRET).update(actual.iceServer.username).digest("base64"));
  assert.equal(JSON.stringify(actual).includes(env.PHONE_TURN_AUTH_SECRET), false);
});

test("never issues TURN access to pending, revoked, or invalid devices", () => {
  for (const status of ["pending", "revoked"]) assert.equal(createEphemeralTurnCredentials({ env, device: { ...device, status }, nowMs }), null);
  assert.equal(createEphemeralTurnCredentials({ env, device: null, nowMs }), null);
  assert.equal(createEphemeralTurnCredentials({ env, device: { ...device, sipUsername: "" }, nowMs }), null);
});

test("feature is opt-in and missing or invalid secret fails closed", () => {
  assert.equal(createEphemeralTurnCredentials({ env: { ...env, PHONE_TURN_EPHEMERAL_ENABLED: "0" }, device, nowMs }), null);
  assert.throws(() => createEphemeralTurnCredentials({ env: { ...env, PHONE_TURN_AUTH_SECRET: "" }, device, nowMs }), /PHONE_TURN_AUTH_SECRET/);
  assert.throws(() => createEphemeralTurnCredentials({ env: { ...env, PHONE_TURN_URL: "http://example.com" }, device, nowMs }), /PHONE_TURN_URL/);
});

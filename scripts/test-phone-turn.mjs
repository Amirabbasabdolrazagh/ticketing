import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createEphemeralTurnCredentials } from "../lib/phoneTurn.js";

const env = {
  PHONE_TURN_EPHEMERAL_ENABLED: "1",
  PHONE_TURN_URL: "turn:turn.support.itrasam.com:3478?transport=udp",
  PHONE_TURN_AUTH_SECRET: "a".repeat(64),
};
const device = { status: "active", deviceId: "trusted-browser-id", sipUsername: "web-admin-example" };
const nowMs = 1700000000000;

const result = createEphemeralTurnCredentials({ device, nowMs, env });
assert.equal(result.iceServer.urls, env.PHONE_TURN_URL);
assert.equal(result.iceServer.username, "1700043200:trusted-browser-id");
assert.equal(result.iceServer.credential, crypto.createHmac("sha1", env.PHONE_TURN_AUTH_SECRET).update(result.iceServer.username).digest("base64"));
assert.equal(result.expiresAtMs, 1700043200000);
assert.equal(createEphemeralTurnCredentials({ device: { ...device, status: "revoked" }, nowMs, env }), null);
assert.equal(createEphemeralTurnCredentials({ device: { ...device, status: "pending" }, nowMs, env }), null);
assert.equal(createEphemeralTurnCredentials({ device, nowMs, env: { ...env, PHONE_TURN_EPHEMERAL_ENABLED: "0" } }), null);
assert.throws(() => createEphemeralTurnCredentials({ device, nowMs, env: { ...env, PHONE_TURN_AUTH_SECRET: "" } }));
assert.throws(() => createEphemeralTurnCredentials({ device, nowMs, env: { ...env, PHONE_TURN_URL: "https://example.com" } }));
console.log("coturn temporary-credential tests passed");

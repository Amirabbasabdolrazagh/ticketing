import test from "node:test";
import assert from "node:assert/strict";
import { calculateTicketTimings, durationMs } from "../lib/ticketMetrics.mjs";

test("registered to viewed is distinct from assigned to viewed", () => {
  const ticket = {
    createdAt: "2026-10-20T09:00:00.000Z",
    assignedAt: "2026-10-20T09:03:00.000Z",
    agentViewedAt: "2026-10-20T09:05:00.000Z",
    agentFirstReplyAt: "2026-10-20T09:15:00.000Z",
  };
  assert.deepEqual(calculateTicketTimings(ticket), {
    firstViewDurationMs: 5 * 60 * 1000,
    assignmentToViewDurationMs: 2 * 60 * 1000,
    firstReplyDurationMs: 10 * 60 * 1000,
  });
});

test("unseen and unanswered tickets keep null durations", () => {
  assert.deepEqual(calculateTicketTimings({
    createdAt: new Date("2026-10-20T09:00:00Z"),
    assignedAt: new Date("2026-10-20T09:01:00Z"),
    agentViewedAt: null,
    agentFirstReplyAt: null,
  }), {
    firstViewDurationMs: null,
    assignmentToViewDurationMs: null,
    firstReplyDurationMs: null,
  });
});

test("missing assignment does not erase registration-to-view metric", () => {
  const times = calculateTicketTimings({
    createdAt: "2026-10-20T09:00:00Z",
    agentViewedAt: "2026-10-20T09:02:00Z",
  });
  assert.equal(times.firstViewDurationMs, 120000);
  assert.equal(times.assignmentToViewDurationMs, null);
});

test("invalid inputs return null instead of NaN", () => {
  assert.equal(durationMs("not-a-date", "2026-10-20T09:00:00Z"), null);
  assert.equal(durationMs(undefined, new Date()), null);
  assert.equal(durationMs("2026-10-20T09:00:00Z", "wrong"), null);
});

test("same timestamps are zero and an unexpected negative duration is clamped", () => {
  const start = "2026-10-20T09:00:00Z";
  assert.equal(durationMs(start, start), 0);
  assert.equal(durationMs(start, "2026-10-20T08:59:59Z"), 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import { validateSlaPolicy, calculateSlaSnapshot, getSlaStatus } from "../lib/slaPolicy.mjs";
const policy = { enabled: true, mode: "24x7", targets: {
  low: { responseMinutes: 180, resolveMinutes: 1440 },
  medium: { responseMinutes: 60, resolveMinutes: 480 },
  high: { responseMinutes: 15, resolveMinutes: 120 },
} };
test("SLA requires explicit configured targets", () => {
  assert.deepEqual(validateSlaPolicy(policy), policy);
  assert.throws(() => validateSlaPolicy({enabled:true,mode:"24x7",targets:{}}));
  assert.throws(() => validateSlaPolicy({...policy,targets:{...policy.targets,high:{responseMinutes:90,resolveMinutes:10}}}));
  assert.throws(() => validateSlaPolicy({...policy,mode:"business-hours"}));
});
test("SLA snapshot retains policy at time ticket was created", () => {
  const start = "2026-10-20T09:00:00Z";
  const snapshot = calculateSlaSnapshot(policy, "high", start);
  assert.equal(snapshot.responseDueAt.toISOString(), "2026-10-20T09:15:00.000Z");
  assert.equal(snapshot.resolveDueAt.toISOString(), "2026-10-20T11:00:00.000Z");
  assert.equal(calculateSlaSnapshot({...policy,enabled:false}, "high", start), null);
});
test("SLA status uses actual response/resolution event timestamps", () => {
  const snapshot = calculateSlaSnapshot(policy,"high","2026-10-20T09:00:00Z");
  const status = getSlaStatus(snapshot,{agentFirstReplyAt:"2026-10-20T09:16:00Z",resolvedAt:"2026-10-20T10:00:00Z"},"2026-10-20T12:00:00Z");
  assert.equal(status.responseBreached,true);
  assert.equal(status.resolveBreached,false);
  assert.equal(status.responsePending,false);
});
test("unresolved ticket is not considered resolved merely because it has status resolved",()=>{
 const snap=calculateSlaSnapshot(policy,"high","2026-10-20T09:00:00Z");
 assert.equal(getSlaStatus(snap,{status:"resolved"},"2026-10-20T12:00:00Z").resolveBreached,true);
});


test("admin first reply satisfies SLA even when the agent has not replied", () => {
  const snapshot = calculateSlaSnapshot(policy, "high", "2026-10-20T09:00:00Z");
  const status = getSlaStatus(snapshot, {
    slaFirstResponseAt: "2026-10-20T09:10:00Z",
    agentFirstReplyAt: null,
  }, "2026-10-20T09:50:00Z");
  assert.equal(status.responseBreached, false);
  assert.equal(status.responsePending, false);
});
test("legacy tickets with only an agent reply remain measurable", () => {
  const snapshot = calculateSlaSnapshot(policy, "high", "2026-10-20T09:00:00Z");
  assert.equal(getSlaStatus(snapshot, { agentFirstReplyAt: "2026-10-20T09:20:00Z" }, "2026-10-20T10:00:00Z").responseBreached, true);
});

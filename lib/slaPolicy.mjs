export const SLA_PRIORITIES = ["low", "medium", "high"];
const MAX_MINUTES = 60 * 24 * 30;
export function validateSlaPolicy(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("SLA_POLICY_INVALID");
  if (typeof input.enabled !== "boolean") throw new Error("SLA_ENABLED_INVALID");
  if (input.mode !== "24x7") throw new Error("SLA_MODE_UNSUPPORTED");
  const targets = {};
  for (const priority of SLA_PRIORITIES) {
    const item = input.targets?.[priority];
    if (!item || !Number.isInteger(item.responseMinutes) || !Number.isInteger(item.resolveMinutes)
      || item.responseMinutes < 1 || item.resolveMinutes < item.responseMinutes
      || item.resolveMinutes > MAX_MINUTES) throw new Error("SLA_TARGET_INVALID");
    targets[priority] = { responseMinutes: item.responseMinutes, resolveMinutes: item.resolveMinutes };
  }
  return { enabled: input.enabled, mode: "24x7", targets };
}
export function calculateSlaSnapshot(policy, priority, startedAt) {
  if (!policy?.enabled || !SLA_PRIORITIES.includes(priority)) return null;
  const valid = validateSlaPolicy(policy);
  const start = new Date(startedAt);
  if (!Number.isFinite(start.getTime())) return null;
  const target = valid.targets[priority];
  return {
    mode: valid.mode,
    priority,
    responseMinutes: target.responseMinutes,
    resolveMinutes: target.resolveMinutes,
    startedAt: start,
    responseDueAt: new Date(start.getTime() + target.responseMinutes * 60000),
    resolveDueAt: new Date(start.getTime() + target.resolveMinutes * 60000),
  };
}
export function getSlaStatus(snapshot, ticket, now = new Date()) {
  if (!snapshot?.responseDueAt || !snapshot?.resolveDueAt) return null;
  const time = new Date(now).getTime();
  const responseDue = new Date(snapshot.responseDueAt).getTime();
  const resolveDue = new Date(snapshot.resolveDueAt).getTime();
  if (![time, responseDue, resolveDue].every(Number.isFinite)) return null;
  const responseAt = ticket.agentFirstReplyAt && new Date(ticket.agentFirstReplyAt).getTime();
  const resolvedAt = ticket.resolvedAt && new Date(ticket.resolvedAt).getTime();
  return {
    responseBreached: Boolean(responseAt ? responseAt > responseDue : time > responseDue),
    resolveBreached: Boolean(resolvedAt ? resolvedAt > resolveDue : time > resolveDue),
    responsePending: !responseAt,
    resolvePending: !resolvedAt,
    responseRemainingMs: responseAt ? null : responseDue - time,
    resolveRemainingMs: resolvedAt ? null : resolveDue - time,
  };
}

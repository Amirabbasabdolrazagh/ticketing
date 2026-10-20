/**
 * Pure timing helpers. Keep time arithmetic outside UI components so
 * monitoring API, realtime events and tests share the same semantics.
 */
export function durationMs(from, to) {
  if (!from || !to) return null;

  const start = new Date(from).getTime();
  const end = new Date(to).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, end - start);
}

export function calculateTicketTimings(ticket) {
  return {
    // Customer-facing: the clock starts when the request is registered.
    firstViewDurationMs: durationMs(ticket.createdAt, ticket.agentViewedAt),
    // Internal metric: assignment might occur well after registration.
    assignmentToViewDurationMs: durationMs(ticket.assignedAt, ticket.agentViewedAt),
    firstReplyDurationMs: durationMs(ticket.agentViewedAt, ticket.agentFirstReplyAt),
  };
}

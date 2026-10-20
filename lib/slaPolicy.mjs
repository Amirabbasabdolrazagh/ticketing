export const SLA_PRIORITIES = ["low", "medium", "high"];
const MAX_MINUTES = 60 * 24 * 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const MAX_DAYS = 400;
const TEHRAN = "Asia/Tehran";
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const clockRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function parseClock(value) {
  if (!clockRegex.test(value || "")) throw new Error("SLA_SHIFT_INVALID");
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function validDateKey(value) {
  if (!dateRegex.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Local business date is Gregorian in Asia/Tehran, while all persisted
 * instants remain in UTC. Do not replace this with a hard-coded UTC offset.
 */
const localFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TEHRAN, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
function localParts(utc) {
  const parts = Object.fromEntries(localFormatter.formatToParts(utc)
    .filter(({ type }) => type !== "literal").map(({ type, value }) => [type, Number(value)]));
  return parts;
}
function localToUtc(day, minuteOfDay) {
  const [year, month, date] = day.split("-").map(Number);
  const naiveUTC = Date.UTC(year, month - 1, date, 0, minuteOfDay);
  // Iterative offset lookup supports timezone offset changes across historical
  // DST boundaries, not only the current Iran UTC+03:30 offset.
  let guess = naiveUTC;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const p = localParts(new Date(guess));
    const renderedAsUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const next = guess + naiveUTC - renderedAsUTC;
    if (next === guess) break;
    guess = next;
  }
  const local = localParts(new Date(guess));
  if (local.year !== year || local.month !== month || local.day !== date
    || local.hour * 60 + local.minute !== minuteOfDay) {
    throw new Error("SLA_LOCAL_TIME_UNREPRESENTABLE");
  }
  return guess;
}
function dayKeyAt(utc) {
  const p = localParts(new Date(utc));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
function nextDayKey(day) {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
}
function weekday(day) {
  return new Date(`${day}T00:00:00.000Z`).getUTCDay();
}

function validateBusinessCalendar(input) {
  if (!input || input.timeZone !== TEHRAN || !input.weekly || typeof input.weekly !== "object"
    || Array.isArray(input.weekly)) throw new Error("SLA_CALENDAR_INVALID");
  const weekly = {};
  let workdays = 0;
  for (let day = 0; day < 7; day += 1) {
    const shift = input.weekly[String(day)];
    if (shift === null || shift === undefined) {
      weekly[String(day)] = null;
      continue;
    }
    if (typeof shift !== "object" || Array.isArray(shift)) throw new Error("SLA_SHIFT_INVALID");
    const start = parseClock(shift.start);
    const end = parseClock(shift.end);
    if (start >= end) throw new Error("SLA_SHIFT_INVALID");
    weekly[String(day)] = { start: shift.start, end: shift.end };
    workdays += 1;
  }
  if (!workdays) throw new Error("SLA_NO_WORKDAYS");
  const holidays = input.holidays ?? [];
  if (!Array.isArray(holidays) || holidays.length > 366 || holidays.some((day) => !validDateKey(day))) {
    throw new Error("SLA_HOLIDAY_INVALID");
  }
  return { timeZone: TEHRAN, weekly, holidays: [...new Set(holidays)].sort() };
}

export function validateSlaPolicy(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("SLA_POLICY_INVALID");
  if (typeof input.enabled !== "boolean") throw new Error("SLA_ENABLED_INVALID");
  if (!["24x7", "business-hours"].includes(input.mode)) throw new Error("SLA_MODE_UNSUPPORTED");
  const targets = {};
  for (const priority of SLA_PRIORITIES) {
    const item = input.targets?.[priority];
    if (!item || !Number.isInteger(item.responseMinutes) || !Number.isInteger(item.resolveMinutes)
      || item.responseMinutes < 1 || item.resolveMinutes < item.responseMinutes
      || item.resolveMinutes > MAX_MINUTES) throw new Error("SLA_TARGET_INVALID");
    targets[priority] = { responseMinutes: item.responseMinutes, resolveMinutes: item.resolveMinutes };
  }
  return {
    enabled: input.enabled, mode: input.mode, targets,
    ...(input.mode === "business-hours" ? { calendar: validateBusinessCalendar(input.calendar) } : {}),
  };
}

export function addWorkingMinutes(startedAt, minutes, calendar) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) throw new Error("SLA_TARGET_INVALID");
  const normalized = validateBusinessCalendar(calendar);
  const closed = new Set(normalized.holidays);
  let day = dayKeyAt(startedAt);
  let cursor = new Date(startedAt).getTime();
  if (!Number.isFinite(cursor)) throw new Error("SLA_START_INVALID");
  let remaining = minutes * MINUTE_MS;
  for (let index = 0; index < MAX_DAYS; index += 1) {
    const shift = normalized.weekly[String(weekday(day))];
    if (shift && !closed.has(day)) {
      const from = localToUtc(day, parseClock(shift.start));
      const to = localToUtc(day, parseClock(shift.end));
      const intervalStart = Math.max(cursor, from);
      if (intervalStart < to) {
        const usable = Math.min(to - intervalStart, remaining);
        remaining -= usable;
        if (remaining === 0) return new Date(intervalStart + usable);
      }
    }
    day = nextDayKey(day);
    cursor = localToUtc(day, 0);
  }
  throw new Error("SLA_CALENDAR_HORIZON_EXCEEDED");
}

export function calculateSlaSnapshot(policy, priority, startedAt) {
  if (!policy?.enabled || !SLA_PRIORITIES.includes(priority)) return null;
  const valid = validateSlaPolicy(policy);
  const start = new Date(startedAt);
  if (!Number.isFinite(start.getTime())) return null;
  const target = valid.targets[priority];
  const dateAt = (minutes) => valid.mode === "24x7"
    ? new Date(start.getTime() + minutes * MINUTE_MS)
    : addWorkingMinutes(start, minutes, valid.calendar);
  return {
    mode: valid.mode,
    priority,
    responseMinutes: target.responseMinutes,
    resolveMinutes: target.resolveMinutes,
    startedAt: start,
    responseDueAt: dateAt(target.responseMinutes),
    resolveDueAt: dateAt(target.resolveMinutes),
    ...(valid.calendar ? { calendar: valid.calendar } : {}),
  };
}

export function getSlaStatus(snapshot, ticket, now = new Date()) {
  if (!snapshot?.responseDueAt || !snapshot?.resolveDueAt) return null;
  const time = new Date(now).getTime();
  const responseDue = new Date(snapshot.responseDueAt).getTime();
  const resolveDue = new Date(snapshot.resolveDueAt).getTime();
  if (![time, responseDue, resolveDue].every(Number.isFinite)) return null;
  const responseAt = ticket.agentFirstReplyAt ? new Date(ticket.agentFirstReplyAt).getTime() : null;
  const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : null;
  const firstReplied = Number.isFinite(responseAt);
  const resolved = Number.isFinite(resolvedAt);
  return {
    responseBreached: firstReplied ? responseAt > responseDue : time > responseDue,
    resolveBreached: resolved ? resolvedAt > resolveDue : time > resolveDue,
    responsePending: !firstReplied,
    resolvePending: !resolved,
    responseRemainingMs: firstReplied ? null : responseDue - time,
    resolveRemainingMs: resolved ? null : resolveDue - time,
  };
}

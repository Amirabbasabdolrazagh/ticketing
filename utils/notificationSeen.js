const PREFIX = "ticketing-seen-notifications";
const MAX_SEEN_ITEMS = 1000;

function storageKey(role) {
  return `${PREFIX}:${role}`;
}

export function getSeenNotificationIds(role) {
  if (typeof window === "undefined") return new Set();
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(role)) || "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

export function markNotificationsSeen(role, ids) {
  if (typeof window === "undefined" || !ids.length) return;
  const seen = getSeenNotificationIds(role);
  ids.forEach((id) => seen.add(id));
  window.localStorage.setItem(storageKey(role), JSON.stringify(Array.from(seen).slice(-MAX_SEEN_ITEMS)));
}

import { EventEmitter } from "events";

const globalChat = globalThis;

if (!globalChat.__liveSupportChat) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(100);
  globalChat.__liveSupportChat = emitter;
}

if (!globalChat.__liveSupportPresence) {
  globalChat.__liveSupportPresence = new Map();
}

export const liveSupportChat = globalChat.__liveSupportChat;
export const liveSupportPresence = globalChat.__liveSupportPresence;

export function touchPresence(user) {
  const presence = {
    userId: user._id.toString(),
    name: user.name || (user.role === "admin" ? "ادمین" : "پشتیبان"),
    role: user.role,
    lastSeen: new Date().toISOString(),
  };
  liveSupportPresence.set(presence.userId, presence);
  liveSupportChat.emit("presence", presence);
  return presence;
}

export function getPresenceForRole(role) {
  return Array.from(liveSupportPresence.values()).filter(
    (presence) => presence.role === role,
  );
}

import { EventEmitter } from "events";

const globalMonitoring = globalThis;

if (!globalMonitoring.__monitoringEvents) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(100);
  globalMonitoring.__monitoringEvents = emitter;
}

export const monitoringEvents = globalMonitoring.__monitoringEvents;

export function emitMonitoringEvent(type, payload = {}) {
  const event = {
    type,
    payload,
    serverTime: new Date().toISOString(),
  };

  monitoringEvents.emit("update", event);

  return event;
}

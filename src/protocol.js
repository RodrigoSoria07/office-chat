// src/protocol.js
export const MSG = Object.freeze({
  JOIN: "join",
  WELCOME: "welcome",
  MESSAGE: "message",
  DM: "dm",
  PRESENCE: "presence",
  STATUS: "status",
  CHANNEL: "channel",
  HISTORY: "history",
  COLOR: "color",
  SEAT: "seat",
  SYSTEM: "system",
  ERROR: "error",
});

const TYPES = new Set(Object.values(MSG));

export function encode(message) {
  return JSON.stringify(message);
}

export function decode(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed.type !== "string" || !TYPES.has(parsed.type)) {
    return null;
  }
  return parsed;
}

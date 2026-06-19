// src/states.js
// Preset work statuses so the team can glance at what everyone is doing.
// statusText still accepts free text; presets just get a recognizable color.
export const STATES = Object.freeze({
  "Disponible": "#5FB36A",
  "QA":         "#E0B341",
  "Desarrollo": "#5B9BD5",
  "RYD":        "#A77BCA",
});

export function stateNames() {
  return Object.keys(STATES);
}

// Returns the preset color for an exact match (case-insensitive), else null.
export function stateColor(text) {
  if (!text) return null;
  const match = Object.keys(STATES).find((s) => s.toLowerCase() === String(text).trim().toLowerCase());
  return match ? STATES[match] : null;
}

// Normalizes a preset to its canonical casing ("qa" -> "QA"); passes free text through.
export function normalizeState(text) {
  if (!text) return "";
  const match = Object.keys(STATES).find((s) => s.toLowerCase() === String(text).trim().toLowerCase());
  return match || String(text).trim();
}

// src/colors.js
// Named palette so users pick a color by word (/color azul) instead of hex.
export const COLORS = Object.freeze({
  azul:     "#5B9BD5",
  verde:    "#5FB36A",
  morado:   "#A77BCA",
  cyan:     "#3FC1C9",
  amarillo: "#E0B341",
  rosa:     "#E07A9B",
  naranja:  "#D97757",
  blanco:   "#E8E8E8",
});

export const BRAND = "#D97757";

// Order used to auto-assign distinct default colors as people join.
const ROTATION = ["azul", "verde", "morado", "cyan", "amarillo", "rosa", "naranja", "blanco"];

export function colorNames() {
  return Object.keys(COLORS);
}

// Accepts a palette name ("azul") or a raw hex ("#5B9BD5"); returns a hex or null.
export function resolveColor(input) {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (COLORS[key]) return COLORS[key];
  if (/^#[0-9a-fA-F]{6}$/.test(key)) return key;
  return null;
}

// Pick a distinct default color for the Nth person to join (0-based).
export function rotationColor(index) {
  const name = ROTATION[index % ROTATION.length];
  return COLORS[name];
}

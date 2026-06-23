// src/avatars.js
// Male human avatars (varied skin tone / style so people are distinguishable).
// Each entry is a single glyph shown inline next to the name; AVATAR_LABELS
// gives the label used in the login picker.
export const AVATARS = Object.freeze([
  "👨", "👨🏻", "👨🏽", "👨🏿",
  "👨‍💻", "👨🏽‍💻", "👨🏿‍💻",
  "🧔", "👨‍🦱", "👨‍🦲", "🕵️‍♂️", "👴",
]);

export const AVATAR_LABELS = Object.freeze([
  "Hombre", "Hombre (claro)", "Hombre (medio)", "Hombre (oscuro)",
  "Dev", "Dev (medio)", "Dev (oscuro)",
  "Barba", "Rizado", "Calvo", "Detective", "Mayor",
]);

export function isValidAvatar(a) {
  return AVATARS.includes(a);
}

// Default to the 6th avatar (👨🏽‍💻 "Dev medio").
export function defaultAvatar() {
  return AVATARS[5];
}

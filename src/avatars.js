// src/avatars.js
export const AVATARS = Object.freeze([
  "👨‍💻", "👩‍💻", "👨", "👩", "🧑",
  "👨🏽‍💻", "👩🏽‍💻", "👨🏿‍💻", "👩🏿‍💻",
]);

export function isValidAvatar(a) {
  return AVATARS.includes(a);
}

export function defaultAvatar() {
  return AVATARS[0];
}

// src/ui/sidebar.js
import { glyph, paint, colorize, colorizeBold } from "./theme.js";
import { stateColor } from "../states.js";

function dot(presence, color) {
  if (presence === "online") return colorize(glyph.online, color);
  if (presence === "away") return paint.away(glyph.away);
  return paint.dim(glyph.offline);
}

function badge(statusText) {
  if (!statusText) return "";
  const c = stateColor(statusText);
  return c ? colorize(statusText, c) : paint.dim(statusText);
}

export function renderRoster(users) {
  const lines = [];
  for (const u of Object.values(users)) {
    lines.push(`${dot(u.presence, u.color)} ${u.avatar} ${colorizeBold(u.name, u.color)}`);
    if (u.statusText) lines.push(`   ${badge(u.statusText)}`);
  }
  return lines.join("\n");
}

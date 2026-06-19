// src/ui/sidebar.js
import { glyph, paint } from "./theme.js";

function dot(presence) {
  if (presence === "online") return paint.online(glyph.online);
  if (presence === "away") return paint.away(glyph.away);
  return paint.dim(glyph.offline);
}

export function renderRoster(users) {
  const lines = [];
  for (const u of Object.values(users)) {
    lines.push(`${dot(u.presence)} ${u.avatar} ${paint.name(u.name)}`);
    if (u.statusText) lines.push(`   ${paint.dim(u.statusText)}`);
  }
  return lines.join("\n");
}

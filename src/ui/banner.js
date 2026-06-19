// src/ui/banner.js
import { glyph, paint } from "./theme.js";

export function welcomeBanner({ room, joinHint, hosting }) {
  const lines = [
    `${glyph.logo}  Welcome to the Office`,
    "",
    `${hosting ? "You're hosting" : "Connected"}  ·  room: ${room}`,
    joinHint ? `Share this:  ${joinHint}` : null,
    `/help for commands   ·   /quit to leave`,
  ].filter(Boolean);

  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const top = "╭" + "─".repeat(width) + "╮";
  const bottom = "╰" + "─".repeat(width) + "╯";
  const body = lines.map((l) => "│  " + l.padEnd(width - 2) + "│").join("\n");
  return paint.accent([top, body, bottom].join("\n"));
}

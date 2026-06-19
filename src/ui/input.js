// src/ui/input.js
export function parseInput(raw) {
  const text = raw.trim();
  if (text.startsWith("/")) {
    const space = text.indexOf(" ");
    if (space === -1) return { kind: "command", name: text.slice(1), arg: "" };
    return { kind: "command", name: text.slice(1, space), arg: text.slice(space + 1).trim() };
  }
  return { kind: "message", text };
}

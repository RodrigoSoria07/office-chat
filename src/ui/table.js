// src/ui/table.js
// Renders the workstation: a rectangular table, 3 seats on top (1-3) and
// 3 on the bottom (4-6). Seat 6 (bottom-right) is always the host.
import { glyph, paint, colorizeBold } from "./theme.js";
import { stateColor, normalizeState } from "../states.js";

function seatCell(n, state, hostId) {
  const uid = state.seats[n];
  if (!uid) return paint.dim(`[${n} ·vacío·]`);
  const u = state.users[uid];
  if (!u) return paint.dim(`[${n} ·?·]`);
  const host = uid === hostId ? "★" : "";
  const st = u.statusText ? ` ${stateBadge(u.statusText)}` : "";
  return `[${n} ${u.avatar} ${colorizeBold(u.name, u.color)}${host}${st}]`;
}

function stateBadge(text) {
  const c = stateColor(text);
  const label = normalizeState(text);
  return c ? colorizeBold(label, c) : paint.dim(label);
}

export function renderTable(state) {
  const hostId = state.seats[6]; // seat 6 is always the host
  const top = [1, 2, 3].map((n) => seatCell(n, state, hostId)).join("  ");
  const bottom = [4, 5, 6].map((n) => seatCell(n, state, hostId)).join("  ");
  const title = paint.accent(`${glyph.logo} Estación de trabajo  (★ = host, asiento 6)`);
  const bar = paint.accent("════════════ MESA ════════════");
  return [
    "",
    title,
    "   " + top,
    "   " + bar,
    "   " + bottom,
    paint.dim("   Cámbiate de asiento con  /asiento <1-5>"),
    "",
  ].join("\n");
}

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
  const bar = paint.accent("═══════ ESTACIÓN DE TRABAJO ═══════");
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

// Compact table for the narrow right-hand panel: the emoji sits in its seat,
// with a small legend (seat · name · status) below.
export function renderTableSidebar(state) {
  const hostId = state.seats[6];
  const slot = (n) => {
    const uid = state.seats[n];
    if (!uid) return paint.dim(" ·· ");
    const u = state.users[uid];
    if (!u) return paint.dim(" ?? ");
    return ` ${u.avatar}${uid === hostId ? "★" : " "}`;
  };

  const lines = [
    paint.dim("  1   2   3"),
    " " + [1, 2, 3].map(slot).join(" "),
    paint.accent(" ══ ESTACIÓN ══"),
    " " + [4, 5, 6].map(slot).join(" "),
    paint.dim("  4   5   6"),
    "",
  ];

  for (const n of [1, 2, 3, 4, 5, 6]) {
    const uid = state.seats[n];
    if (!uid) continue;
    const u = state.users[uid];
    const star = uid === hostId ? "★" : "";
    const st = u.statusText ? " " + stateBadge(u.statusText) : "";
    lines.push(`${n} ${colorizeBold(u.name, u.color)}${star}${st}`);
  }
  return lines.join("\n");
}

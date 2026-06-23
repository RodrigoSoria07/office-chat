// src/ui/theme.js
import chalk from "chalk";

// Matrix neon green — drives borders, the prompt, the logo and command hints.
export const ACCENT = "#39FF14";

export const glyph = {
  logo: "✺",
  online: "●",
  away: "◐",
  offline: "○",
  prompt: "›",
};

export const paint = {
  accent: (s) => chalk.hex(ACCENT)(s),
  name: (s) => chalk.hex(ACCENT).bold(s),
  dim: (s) => chalk.gray(s),
  system: (s) => chalk.gray.italic(s),
  online: (s) => chalk.hex(ACCENT)(s),
  away: (s) => chalk.gray(s),
  command: (s) => chalk.hex(ACCENT).bold(s), // slash commands in Matrix green
};

// Per-user color helpers (fall back to the brand accent if no color set).
export const colorize = (s, hex) => chalk.hex(hex || ACCENT)(s);
export const colorizeBold = (s, hex) => chalk.hex(hex || ACCENT).bold(s);

// blessed border style for rounded panels
export const border = { type: "line" };
export const borderStyle = { fg: ACCENT };

// src/ui/theme.js
import chalk from "chalk";

export const ACCENT = "#D97757";

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
};

// blessed border style for rounded panels
export const border = { type: "line" };
export const borderStyle = { fg: ACCENT };

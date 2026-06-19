// src/ui/messages.js
import { highlight } from "cli-highlight";
import { paint } from "./theme.js";

export function renderCodeBlocks(text) {
  return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
    try {
      return "\n" + highlight(code, { language: lang || "plaintext", ignoreIllegals: true });
    } catch {
      return "\n" + code;
    }
  });
}

export function renderMessageLine({ avatar, name, text }) {
  const body = renderCodeBlocks(text);
  return `${avatar}  ${paint.name(name)}  ${body}`;
}

export function renderSystemLine(text) {
  return paint.system(`— ${text}`);
}

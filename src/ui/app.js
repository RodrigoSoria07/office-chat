// src/ui/app.js
import blessed from "blessed";
import { MSG } from "../protocol.js";
import { initialState, reduce } from "../state.js";
import { glyph, ACCENT, paint } from "./theme.js";
import { renderRoster } from "./sidebar.js";
import { renderMessageLine, renderSystemLine } from "./messages.js";
import { renderTable } from "./table.js";
import { parseInput } from "./input.js";
import { resolveColor, colorNames } from "../colors.js";
import { stateNames, normalizeState } from "../states.js";
import { writeConfig } from "../config.js";

export function runApp({ transport, identity }) {
  let state = initialState();
  let me = null;             // my userId, set on welcome
  let channel = "#general";

  const screen = blessed.screen({ smartCSR: true, title: "Office", fullUnicode: true });

  const messages = blessed.box({
    top: 0, left: 0, right: 24, bottom: 3,
    label: ` ${glyph.logo} Office · ${channel} `,
    border: "line", style: { border: { fg: ACCENT } },
    scrollable: true, alwaysScroll: true, tags: false, padding: { left: 1, right: 1 },
  });

  const sidebar = blessed.box({
    top: 0, right: 0, width: 24, bottom: 3,
    label: " In the office ",
    border: "line", style: { border: { fg: ACCENT } },
    padding: { left: 1 },
  });

  const input = blessed.textbox({
    bottom: 0, left: 0, right: 0, height: 3,
    label: ` ${glyph.logo} ${identity.name} ${glyph.prompt} `,
    border: "line", style: { border: { fg: ACCENT } },
    inputOnFocus: true, padding: { left: 1 },
  });

  screen.append(messages);
  screen.append(sidebar);
  screen.append(input);

  function setChannelLabel() {
    const lock = state.channelPrivate?.[channel] ? " 🔒" : "";
    messages.setLabel(` ${glyph.logo} Office · ${channel}${lock} `);
  }
  function appendLine(line) {
    messages.pushLine(line);
    messages.setScrollPerc(100);
    screen.render();
  }
  function redrawSidebar() {
    sidebar.setContent(renderRoster(state.users));
    screen.render();
  }
  function lineFor(from, text) {
    const u = state.users[from];
    return renderMessageLine({ avatar: u?.avatar ?? "🧑", name: u?.name ?? "?", text, color: u?.color });
  }

  transport.onMessage((a) => {
    switch (a.type) {
      case MSG.WELCOME:
        me = a.userId;
        state = {
          ...initialState(),
          channels: a.channels,
          channelPrivate: a.channelPrivate ?? { "#general": false },
          users: a.users,
          seats: a.seats ?? {},
          history: { ...initialState().history, ...a.history },
        };
        setChannelLabel();
        for (const m of state.history[channel] ?? []) appendLine(lineFor(m.from, m.text));
        redrawSidebar();
        break;
      case MSG.MESSAGE: {
        state = reduce(state, a);
        if (a.channel === channel) appendLine(lineFor(a.from, a.text));
        break;
      }
      case MSG.DM:
        appendLine(paint.accent(`[DM] `) + lineFor(a.from, a.text));
        break;
      case MSG.HISTORY: {
        // we successfully joined/created a channel — switch to it
        channel = a.channel;
        if (!state.history[channel]) state.history[channel] = a.history ?? [];
        if (!state.channels.includes(channel)) state.channels = [...state.channels, channel];
        setChannelLabel();
        messages.setContent("");
        for (const m of a.history ?? []) appendLine(lineFor(m.from, m.text));
        appendLine(paint.system(`entraste a ${channel}`));
        break;
      }
      case MSG.SEAT:
      case "join":
      case "leave":
      case MSG.PRESENCE:
      case MSG.STATUS:
      case MSG.COLOR:
      case MSG.CHANNEL:
        state = reduce(state, a);
        redrawSidebar();
        break;
      case MSG.SYSTEM:
        appendLine(renderSystemLine(a.text));
        break;
      case MSG.ERROR:
        appendLine(paint.system(`error: ${a.message}`));
        break;
    }
  });

  transport.onStatusChange((s) => {
    if (s === "reconnecting") appendLine(paint.system("reconnecting…"));
    if (s === "connected") appendLine(paint.system("connected"));
  });

  function handleSubmit(value) {
    input.clearValue();
    const parsed = parseInput(value || "");
    if (parsed.kind === "message" && parsed.text) {
      transport.send({ type: MSG.MESSAGE, channel, text: parsed.text });
    } else if (parsed.kind === "command") {
      runCommand(parsed.name, parsed.arg);
    }
    input.focus();
    screen.render();
  }

  function runCommand(name, arg) {
    switch (name) {
      case "estado":
      case "status": {
        if (!arg) { appendLine(paint.system(`estados: ${stateNames().join(" · ")} (o texto libre)`)); break; }
        transport.send({ type: MSG.STATUS, statusText: normalizeState(arg) });
        break;
      }
      case "color": {
        if (!arg) { appendLine(paint.system(`colores: ${colorNames().join(" · ")}`)); break; }
        const hex = resolveColor(arg);
        if (!hex) { appendLine(paint.system(`color inválido. Usa: ${colorNames().join(" · ")}`)); break; }
        transport.send({ type: MSG.COLOR, color: hex });
        try { writeConfig({ color: hex }); } catch { /* ignore */ }
        appendLine(paint.system(`color cambiado`));
        break;
      }
      case "away":  transport.send({ type: MSG.PRESENCE, presence: "away" }); break;
      case "back":  transport.send({ type: MSG.PRESENCE, presence: "online" }); break;
      case "crear": {
        // /crear #canal [--privado clave]
        const m = arg.match(/^(#\S+)(?:\s+--privado\s+(\S+))?\s*$/);
        if (!m) { appendLine(paint.system("uso: /crear #canal [--privado clave]")); break; }
        const [, ch, key] = m;
        transport.send({ type: MSG.CHANNEL, action: "create", name: ch, private: !!key, password: key || null });
        break;
      }
      case "join": {
        // /join #canal [clave]
        const m = arg.match(/^(#\S+)(?:\s+(\S+))?\s*$/);
        if (!m) { appendLine(paint.system("uso: /join #canal [clave]")); break; }
        const [, ch, key] = m;
        transport.send({ type: MSG.CHANNEL, action: "join", name: ch, key: key || null });
        break;
      }
      case "canales": {
        const list = state.channels.map((c) => (state.channelPrivate?.[c] ? `${c} 🔒` : c)).join(" · ");
        appendLine(paint.system(`canales: ${list}`));
        break;
      }
      case "mesa":    appendLine(renderTable(state)); break;
      case "asiento": {
        const n = Number(arg);
        if (!Number.isInteger(n)) { appendLine(paint.system("uso: /asiento <1-5>")); break; }
        transport.send({ type: MSG.SEAT, seat: n });
        break;
      }
      case "dm": {
        const m = arg.match(/^@?(\S+)\s+([\s\S]+)$/);
        if (m) {
          const target = Object.entries(state.users).find(([, u]) => u.name === m[1]);
          if (target) transport.send({ type: MSG.DM, to: target[0], text: m[2] });
          else appendLine(paint.system(`no user named ${m[1]}`));
        }
        break;
      }
      case "who":   appendLine(Object.values(state.users).map((u) => u.name).join(", ")); break;
      case "board": appendLine(Object.values(state.users).map((u) => `${u.name}: ${u.statusText || "—"}`).join("\n")); break;
      case "help":  appendLine(paint.system(
        "/crear #ch [--privado clave] · /join #ch [clave] · /canales · /dm @user msg · " +
        "/estado QA|Desarrollo|RYD · /color azul · /mesa · /asiento <1-5> · /away · /back · /who · /board · /quit"
      )); break;
      case "salir":
      case "quit":  cleanup(); break;
      default:      appendLine(paint.system(`comando desconocido: /${name}`));
    }
  }

  function cleanup() {
    transport.close();
    screen.destroy();
    process.exit(0);
  }

  input.key(["enter"], () => handleSubmit(input.getValue()));
  screen.key(["C-c"], cleanup);
  input.focus();
  redrawSidebar();
  screen.render();
}

// src/ui/app.js
import blessed from "blessed";
import { MSG } from "../protocol.js";
import { initialState, reduce } from "../state.js";
import { glyph, ACCENT, paint } from "./theme.js";
import { renderMessageLine, renderSystemLine } from "./messages.js";
import { renderTable, renderTableSidebar } from "./table.js";
import { parseInput } from "./input.js";
import { resolveColor, colorNames } from "../colors.js";
import { stateNames, normalizeState } from "../states.js";
import { writeConfig } from "../config.js";

// Command catalog used for the suggestion bar and /help.
const COMMANDS = [
  { name: "estado",  desc: "en qué trabajas",        usage: "/estado <estado o tarea>" },
  { name: "crear",   desc: "crear canal",            usage: "/crear #canal [--privado clave]" },
  { name: "join",    desc: "entrar a un canal",      usage: "/join #canal [clave]" },
  { name: "canales", desc: "ver canales",            usage: "/canales" },
  { name: "dm",      desc: "mensaje directo",        usage: "/dm @usuario mensaje" },
  { name: "color",   desc: "cambiar tu color",       usage: "/color <color>" },
  { name: "mesa",    desc: "ver la mesa",            usage: "/mesa" },
  { name: "asiento", desc: "cambiar de asiento",     usage: "/asiento <1-5>" },
  { name: "away",    desc: "marcarte ausente",       usage: "/away" },
  { name: "back",    desc: "volver disponible",      usage: "/back" },
  { name: "board",   desc: "estados de todos",       usage: "/board" },
  { name: "who",     desc: "quién está conectado",   usage: "/who" },
  { name: "kick",    desc: "expulsar (host)",        usage: "/kick @usuario" },
  { name: "clear",   desc: "limpiar el chat",        usage: "/clear" },
  { name: "help",    desc: "ayuda",                  usage: "/help" },
  { name: "quit",    desc: "salir",                  usage: "/quit" },
];

export function runApp({ transport, identity }) {
  let state = initialState();
  let me = null;             // my userId, set on welcome
  let channel = "#general";
  let roomName = "Oficina";  // office name, set from welcome

  const screen = blessed.screen({ smartCSR: true, title: "Office", fullUnicode: true });

  const messages = blessed.box({
    top: 0, left: 0, right: 28, bottom: 4,
    label: ` ${glyph.logo} Office · ${channel} `,
    border: "line", style: { border: { fg: ACCENT } },
    scrollable: true, alwaysScroll: true, tags: false, padding: { left: 1, right: 1 },
  });

  const sidebar = blessed.box({
    top: 0, right: 0, width: 28, bottom: 4,
    label: ` ${glyph.logo} ${roomName} `,
    border: "line", style: { border: { fg: ACCENT } },
    padding: { left: 1 },
  });

  // Thin suggestion/help bar that updates as you type.
  const hint = blessed.box({
    bottom: 3, left: 0, right: 0, height: 1,
    tags: false, padding: { left: 1 },
  });

  const input = blessed.textbox({
    bottom: 0, left: 0, right: 0, height: 3,
    label: ` ${glyph.logo} ${identity.name} ${glyph.prompt} `,
    border: "line", style: { border: { fg: ACCENT } },
    padding: { left: 1 },
    keys: true,
    mouse: true,
    inputOnFocus: true,
  });

  screen.append(messages);
  screen.append(sidebar);
  screen.append(hint);
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
    sidebar.setContent(renderTableSidebar(state));
    screen.render();
  }
  function lineFor(from, text) {
    const u = state.users[from];
    return renderMessageLine({ avatar: u?.avatar ?? "🧑", name: u?.name ?? "?", text, color: u?.color });
  }
  function myStatus() {
    return (me && state.users[me]?.statusText) || "";
  }
  // Suggestion bar: reacts to what's currently typed in the input.
  // While typing we must NOT call screen.render() (it duplicates characters in
  // the blessed textbox); the textbox's own per-key render shows the new hint.
  function updateHint(raw, render = true) {
    const v = (raw || "").trim();
    let out;
    if (v === "") {
      out = myStatus()
        ? paint.dim("Escribe / para ver comandos · Enter para enviar")
        : paint.accent("➤ Aún no dices en qué trabajas: escribe  /estado <lo que haces>  (ej: /estado Desarrollo: login)");
    } else if (v.startsWith("/")) {
      const sp = v.indexOf(" ");
      if (sp === -1) {
        const q = v.slice(1).toLowerCase();
        const matches = COMMANDS.filter((c) => c.name.startsWith(q)).slice(0, 8);
        out = matches.length
          ? matches.map((c) => paint.accent("/" + c.name) + " " + paint.dim(c.desc)).join("   ")
          : paint.dim("sin coincidencias · /help");
      } else {
        const cmd = v.slice(1, sp);
        if (cmd === "estado" || cmd === "status") {
          out = paint.dim("estados: ") + stateNames().join(" · ") + paint.dim("   — o escribe en qué trabajas");
        } else if (cmd === "color") {
          out = paint.dim("colores: ") + colorNames().join(" · ");
        } else {
          const c = COMMANDS.find((x) => x.name === cmd);
          out = c ? paint.dim(c.usage) : "";
        }
      }
    } else {
      out = paint.dim(`${channel} · Enter para enviar · / para comandos`);
    }
    hint.setContent(out);
    if (render) screen.render();
  }

  transport.onMessage((a) => {
    switch (a.type) {
      case MSG.WELCOME:
        me = a.userId;
        if (a.room) { roomName = a.room; sidebar.setLabel(` ${glyph.logo} ${roomName} `); }
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
        if (!myStatus()) {
          appendLine(paint.accent(`➤ ${identity.name}, cuéntale al equipo en qué estás trabajando:`));
          appendLine(paint.accent(`  escribe  /estado <lo que haces>  (estados: ${stateNames().join(" · ")})`));
        }
        updateHint("");
        break;
      case MSG.MESSAGE: {
        state = reduce(state, a);
        if (a.channel === channel) appendLine(lineFor(a.from, a.text));
        break;
      }
      case MSG.DM: {
        const outgoing = a.from === me;
        const other = state.users[outgoing ? a.to : a.from];
        const arrow = outgoing ? "→" : "←";
        appendLine(paint.accent(`[DM ${arrow} ${other?.name ?? "?"}]`) + "  " + a.text);
        break;
      }
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
        if (a.type === MSG.STATUS && a.userId === me) updateHint("");
        break;
      case MSG.KICK:
        // The server only sends KICK to the person being removed.
        transport.close(); // stop auto-reconnect immediately so we don't rejoin
        appendLine(paint.accent(`Fuiste expulsado de la oficina por ${a.by ?? "el host"}.`));
        screen.render();
        setTimeout(() => { screen.destroy(); process.exit(0); }, 1200);
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
    if (!value || !value.trim()) {
      // Si estaba vacío, limpiamos y nos aseguramos de enfocar de nuevo
      input.value = "";
      input.clearValue();
      screen.render();
      input.focus();
      return;
    }

    // 1. Procesamos el comando o mensaje con el valor original guardado
    const parsed = parseInput(value || "");
    if (parsed.kind === "message" && parsed.text) {
      transport.send({ type: MSG.MESSAGE, channel, text: parsed.text });
    } else if (parsed.kind === "command") {
      runCommand(parsed.name, parsed.arg);
    }

    // 2. Limpieza oficial y reactivación del teclado
    input.value = "";
    input.clearValue();
    screen.render();
    
    // Al enfocar, inputOnFocus inicia automáticamente el modo de edición limpio
    input.focus(); 
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
      case "clear":
      case "limpiar":
        messages.setContent("");
        appendLine(paint.system("chat limpiado"));
        break;
      case "kick": {
        const target = arg.replace(/^@/, "").trim();
        if (!target) { appendLine(paint.system("uso: /kick @usuario")); break; }
        transport.send({ type: MSG.KICK, target });
        break;
      }
      case "who":   appendLine(Object.values(state.users).map((u) => u.name).join(", ")); break;
      case "board": appendLine(Object.values(state.users).map((u) => `${u.name}: ${u.statusText || "—"}`).join("\n")); break;
      case "help":  appendLine(paint.system(
        "/crear #ch [--privado clave] · /join #ch [clave] · /canales · /dm @user msg · " +
        "/estado QA|Desarrollo|RYD · /color azul · /mesa · /asiento <1-5> · /away · /back · /who · /board · /kick @user (host) · /clear · /quit"
      )); break;
      case "salir":
      case "quit":  cleanup(); break;
      default:      appendLine(paint.system(`comando desconocido: /${name}`));
    }
  }

  function cleanup() {
    clearInterval(hintTimer);
    transport.close();
    screen.destroy();
    process.exit(0);
  }

  input.on("submit", (value) => {
    handleSubmit(value);
  });

  input.on("cancel", () => {
    input.focus();
  });
  // Refresh the suggestion bar from a background timer (NOT a keypress listener),
  // and never render here — the textbox renders itself per key and paints the
  // updated hint. Hooking the textbox's keypress / rendering on each key made
  // blessed duplicate typed characters.
  const hintTimer = setInterval(() => updateHint(input.getValue(), false), 150);

  // Ctrl+C twice to exit: the first press warns, the second (within 1.5s) quits.
  let lastCtrlC = 0;
  screen.key(["C-c"], () => {
    const now = Date.now();
    if (now - lastCtrlC < 1500) { cleanup(); return; }
    lastCtrlC = now;
    appendLine(paint.system("Presiona Ctrl+C de nuevo para salir (o /quit)"));
  });

  input.focus();
  redrawSidebar();
  updateHint("");
  screen.render();
}

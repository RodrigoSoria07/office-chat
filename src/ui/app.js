// src/ui/app.js
import blessed from "blessed";
import { MSG } from "../protocol.js";
import { initialState, reduce } from "../state.js";
import { glyph, ACCENT, paint } from "./theme.js";
import { renderRoster } from "./sidebar.js";
import { renderMessageLine, renderSystemLine } from "./messages.js";
import { parseInput } from "./input.js";

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

  function appendLine(line) {
    messages.pushLine(line);
    messages.setScrollPerc(100);
    screen.render();
  }
  function redrawSidebar() {
    sidebar.setContent(renderRoster(state.users));
    screen.render();
  }

  transport.onMessage((a) => {
    switch (a.type) {
      case MSG.WELCOME:
        me = a.userId;
        state = { ...initialState(), channels: a.channels, users: a.users, history: a.history };
        for (const m of state.history[channel] ?? []) {
          const u = state.users[m.from];
          appendLine(renderMessageLine({ avatar: u?.avatar ?? "🧑", name: u?.name ?? "?", text: m.text }));
        }
        redrawSidebar();
        break;
      case MSG.MESSAGE: {
        state = reduce(state, a);
        if (a.channel === channel) {
          const u = state.users[a.from];
          appendLine(renderMessageLine({ avatar: u?.avatar ?? "🧑", name: u?.name ?? "?", text: a.text }));
        }
        break;
      }
      case MSG.DM: {
        const u = state.users[a.from];
        appendLine(paint.accent(`[DM] `) + renderMessageLine({ avatar: u?.avatar ?? "🧑", name: u?.name ?? "?", text: a.text }));
        break;
      }
      case "join":
      case "leave":
      case "presence":
      case "status":
      case "channel":
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
      case "status": transport.send({ type: MSG.STATUS, statusText: arg }); break;
      case "away":   transport.send({ type: MSG.PRESENCE, presence: "away" }); break;
      case "back":   transport.send({ type: MSG.PRESENCE, presence: "online" }); break;
      case "join":   transport.send({ type: MSG.CHANNEL, action: "create", name: arg }); channel = arg; messages.setLabel(` ${glyph.logo} Office · ${channel} `); messages.setContent(""); break;
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
      case "help":  appendLine(paint.system("/join #ch · /dm @user msg · /status txt · /away · /back · /who · /board · /quit")); break;
      case "quit":  cleanup(); break;
      default:      appendLine(paint.system(`unknown command: /${name}`));
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

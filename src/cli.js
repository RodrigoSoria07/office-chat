// src/cli.js
import { networkInterfaces } from "node:os";
import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";
import { startServer } from "./transport/lanServer.js";
import { createTransport } from "./transport/index.js";
import { readConfig, writeConfig } from "./config.js";
import { isValidAvatar } from "./avatars.js";
import { MSG } from "./protocol.js";
import { welcomeBanner } from "./ui/banner.js";
import { runApp } from "./ui/app.js";
import { runStartupAnimation } from "./ui/animation.js";

function lanIp() {
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === "IPv4" && !ni.internal) return ni.address;
    }
  }
  return "127.0.0.1";
}

// Start a cloudflared "quick tunnel" exposing the local office to the internet,
// and resolve with the public https URL it prints. The cloudflared process keeps
// running for the session and is killed when this process exits. Rejects if
// cloudflared isn't installed (ENOENT) or no URL appears within the timeout.
function startTunnel(port) {
  return new Promise((resolve, reject) => {
    const cf = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    cf.on("error", reject); // e.g. ENOENT when cloudflared is not on PATH
    process.on("exit", () => { try { cf.kill(); } catch { /* ignore */ } });

    let done = false;
    const onData = (buf) => {
      if (done) return;
      const m = String(buf).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (m) { done = true; clearTimeout(timer); resolve(m[0]); }
    };
    cf.stdout.on("data", onData);
    cf.stderr.on("data", onData);
    const timer = setTimeout(() => {
      if (!done) { done = true; reject(new Error("no llegó la URL del túnel a tiempo")); }
    }, 20000);
  });
}

function identityFrom(opts) {
  const cfg = readConfig();
  const name = opts.name || cfg.name;
  const avatar = isValidAvatar(opts.avatar) ? opts.avatar : cfg.avatar;
  return { name, avatar, color: cfg.color };
}

// Asks a series of questions on the terminal; returns the trimmed answers.
async function prompt(questions) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answers = {};
  for (const [key, text] of Object.entries(questions)) {
    answers[key] = (await rl.question(text)).trim();
  }
  rl.close();
  return answers;
}

export async function createCommand(opts) {
  const requestedPort = Number(opts.port) || 4040;
  const password = opts.password || null;

  // The host gives their name and names the office (via flags or prompts).
  let name = opts.name;
  let room = opts.room;
  if (!name || !room) {
    const ask = {};
    if (!name) ask.name = "Tu nombre: ";
    if (!room) ask.room = "Nombre de la oficina: ";
    const a = await prompt(ask);
    name = name || a.name;
    room = room || a.room;
  }
  if (!room) room = "Oficina";

  // Bind the server; if the port is busy, walk forward until we find a free one.
  let port = requestedPort;
  const MAX_TRIES = 20;
  for (let i = 0; ; i++) {
    const server = startServer({ port, password, room });
    try {
      await server.ready;
      break; // bound successfully
    } catch (e) {
      await server.close().catch(() => {});
      if (e.code === "EADDRINUSE" && i < MAX_TRIES - 1) {
        port++;
        continue;
      }
      if (e.code === "EADDRINUSE") {
        console.error(`No encontré un puerto libre entre ${requestedPort} y ${port}.`);
      } else {
        console.error(`Could not start the office: ${e.message}`);
      }
      process.exit(1);
    }
  }
  if (port !== requestedPort) {
    console.log(`El puerto ${requestedPort} estaba ocupado — usando el ${port}.`);
  }

  const ip = lanIp();
  const identity = identityFrom({ ...opts, name });
  let joinHint = `office join ${ip}${port !== 4040 ? " --port " + port : ""}`;

  // --tunnel: expose the office over the internet so people can join from any
  // network (not just the LAN). Falls back to LAN if cloudflared isn't present.
  if (opts.tunnel) {
    try {
      const pub = await startTunnel(port);
      joinHint = `office join ${pub.replace(/^https/i, "wss")}`;
    } catch (e) {
      console.error(`No pude abrir el túnel (${e.message}).`);
      console.error(`Instalá cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/`);
      console.error(`Sigo en modo LAN por ahora.`);
    }
  }

  if (opts.anim !== false) await runStartupAnimation(room, true, identity.name);
  console.log(welcomeBanner({ room, joinHint, hosting: true }));
  await joinUrl(`ws://127.0.0.1:${port}`, identity, password, { share: joinHint });
}

// Build the WebSocket URL from whatever the user passed as <host>:
//   - a full ws:// or wss:// URL  -> used as-is (e.g. a cloudflared/ngrok tunnel)
//   - a full http:// or https:// URL -> scheme swapped to ws:// / wss://
//   - a bare host or host:port -> ws://host:port (LAN use)
function resolveJoinUrl(host, opts) {
  if (/^wss?:\/\//i.test(host)) return host;
  if (/^https?:\/\//i.test(host)) return host.replace(/^http(s?):\/\//i, "ws$1://");
  const port = Number(opts.port) || 4040;
  return `ws://${host}:${port}`;
}

export async function joinCommand(host, opts) {
  // Ask the person their name unless they passed --name.
  let name = opts.name;
  if (!name) {
    const a = await prompt({ name: "Tu nombre: " });
    name = a.name;
  }

  const url = resolveJoinUrl(host, opts);
  const identity = identityFrom({ ...opts, name });
  if (opts.anim !== false) await runStartupAnimation(host, false, identity.name);
  console.log(welcomeBanner({ room: host, joinHint: null, hosting: false }));
  await joinUrl(url, identity, opts.password || null);
}

async function joinUrl(url, identity, password, extra = {}) {
  const transport = createTransport("lan", {
    url,
    joinMessage: { type: MSG.JOIN, name: identity.name, avatar: identity.avatar, color: identity.color, password },
  });
  try {
    await transport.connect();
  } catch {
    console.error(`Could not reach the office at ${url}. Is the host running?`);
    process.exit(1);
  }
  runApp({ transport, identity, ...extra });
}

export function configCommand(opts) {
  if (opts.name || opts.avatar || opts.color) {
    const patch = {};
    if (opts.name) patch.name = opts.name;
    if (opts.avatar && isValidAvatar(opts.avatar)) patch.avatar = opts.avatar;
    if (opts.color) patch.color = opts.color;
    const merged = writeConfig(patch);
    console.log("Saved:", merged);
  } else {
    console.log(readConfig());
  }
}

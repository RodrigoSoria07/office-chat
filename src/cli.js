// src/cli.js
import { networkInterfaces } from "node:os";
import { startServer } from "./transport/lanServer.js";
import { createTransport } from "./transport/index.js";
import { readConfig, writeConfig } from "./config.js";
import { isValidAvatar } from "./avatars.js";
import { MSG } from "./protocol.js";
import { welcomeBanner } from "./ui/banner.js";
import { runApp } from "./ui/app.js";

function lanIp() {
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === "IPv4" && !ni.internal) return ni.address;
    }
  }
  return "127.0.0.1";
}

function identityFrom(opts) {
  const cfg = readConfig();
  const name = opts.name || cfg.name;
  const avatar = isValidAvatar(opts.avatar) ? opts.avatar : cfg.avatar;
  return { name, avatar, color: cfg.color };
}

export async function createCommand(opts) {
  const port = Number(opts.port) || 4040;
  const password = opts.password || null;
  const server = startServer({ port, password });
  try {
    await server.ready;
  } catch (e) {
    if (e.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use — is an office already running?`);
      console.error(`Try a different port:  office create --port ${port + 1}`);
    } else {
      console.error(`Could not start the office: ${e.message}`);
    }
    process.exit(1);
  }
  const ip = lanIp();
  const identity = identityFrom(opts);
  console.log(welcomeBanner({ room: opts.room || "office", joinHint: `office join ${ip}${port !== 4040 ? " --port " + port : ""}`, hosting: true }));
  await joinUrl(`ws://127.0.0.1:${port}`, identity, password);
}

export async function joinCommand(host, opts) {
  const port = Number(opts.port) || 4040;
  const identity = identityFrom(opts);
  console.log(welcomeBanner({ room: host, joinHint: null, hosting: false }));
  await joinUrl(`ws://${host}:${port}`, identity, opts.password || null);
}

async function joinUrl(url, identity, password) {
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
  runApp({ transport, identity });
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

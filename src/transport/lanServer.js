// src/transport/lanServer.js
import { WebSocketServer } from "ws";
import { MSG, encode, decode } from "../protocol.js";
import { initialState, reduce } from "../state.js";
import { BRAND, rotationColor } from "../colors.js";

export function startServer({ port = 4040, password = null, room = "Oficina" } = {}) {
  const wss = new WebSocketServer({ port });
  let state = initialState();
  const sockets = new Map();          // userId -> ws
  const channelPasswords = new Map(); // channelName -> password (server-only, never broadcast)
  const channelMembers = new Map();   // channelName -> Set(userId)
  let counter = 0;
  let joinIndex = 0;                  // for distinct default colors
  let hostId = null;                  // first joiner is the host (seat 6)
  let monotonicTs = 0;
  const nextTs = () => ++monotonicTs;

  function members(name) {
    if (!channelMembers.has(name)) channelMembers.set(name, new Set());
    return channelMembers.get(name);
  }
  function sendTo(userId, action) {
    const ws = sockets.get(userId);
    if (ws && ws.readyState === ws.OPEN) ws.send(encode(action));
  }
  function broadcast(action) {
    const raw = encode(action);
    for (const ws of sockets.values()) {
      if (ws.readyState === ws.OPEN) ws.send(raw);
    }
  }
  function toChannel(name, action) {
    const raw = encode(action);
    for (const uid of members(name)) {
      const ws = sockets.get(uid);
      if (ws && ws.readyState === ws.OPEN) ws.send(raw);
    }
  }
  function uniqueName(name) {
    const taken = new Set(Object.values(state.users).map((u) => u.name));
    if (!taken.has(name)) return name;
    let i = 2;
    while (taken.has(`${name}-${i}`)) i++;
    return `${name}-${i}`;
  }
  function assignSeat(userId) {
    if (hostId === null) { hostId = userId; return 6; }
    for (const n of [1, 2, 3, 4, 5]) {
      if (!state.seats[n]) return n;
    }
    return null; // table full (6 seated) — user stands
  }

  wss.on("connection", (ws) => {
    const userId = `u${++counter}`;
    let joined = false;

    ws.on("message", (data) => {
      const action = decode(data.toString());
      if (!action) return;

      if (action.type === MSG.JOIN) {
        if (password && action.password !== password) {
          ws.send(encode({ type: MSG.ERROR, code: "AUTH", message: "Wrong office password" }));
          ws.close();
          return;
        }
        const name = uniqueName(action.name);
        // Give each person a distinct color unless they picked a custom (non-brand) one.
        const color = (!action.color || action.color === BRAND) ? rotationColor(joinIndex++) : action.color;
        const joinAction = { type: "join", userId, name, avatar: action.avatar, color };
        state = reduce(state, joinAction);
        sockets.set(userId, ws);
        members("#general").add(userId);
        joined = true;

        const seat = assignSeat(userId);
        if (seat) state = reduce(state, { type: "seat", userId, seat });

        ws.send(encode({
          type: MSG.WELCOME,
          userId,
          name,
          room,
          channels: state.channels,
          channelPrivate: state.channelPrivate,
          users: state.users,
          seats: state.seats,
          history: { "#general": state.history["#general"] },
        }));
        broadcast(joinAction);
        if (seat) broadcast({ type: MSG.SEAT, userId, seat });
        broadcast({ type: MSG.SYSTEM, text: `${name} joined the office` });
        return;
      }

      if (!joined) return;

      if (action.type === MSG.MESSAGE) {
        const stamped = { type: MSG.MESSAGE, channel: action.channel, from: userId, text: action.text, ts: nextTs() };
        state = reduce(state, stamped);
        toChannel(action.channel, stamped); // only members of that channel
      } else if (action.type === MSG.DM) {
        const stamped = { type: MSG.DM, from: userId, to: action.to, text: action.text, ts: nextTs() };
        sendTo(action.to, stamped);
        ws.send(encode(stamped));
      } else if (action.type === MSG.PRESENCE) {
        const stamped = { type: MSG.PRESENCE, userId, presence: action.presence };
        state = reduce(state, stamped);
        broadcast(stamped);
      } else if (action.type === MSG.STATUS) {
        const stamped = { type: MSG.STATUS, userId, statusText: action.statusText };
        state = reduce(state, stamped);
        broadcast(stamped);
      } else if (action.type === MSG.COLOR) {
        const stamped = { type: MSG.COLOR, userId, color: action.color };
        state = reduce(state, stamped);
        broadcast(stamped);
      } else if (action.type === MSG.SEAT) {
        const n = Number(action.seat);
        if (!Number.isInteger(n) || n < 1 || n > 6) {
          ws.send(encode({ type: MSG.ERROR, code: "SEAT", message: "Asiento inválido (1-6)" }));
        } else if (n === 6 && userId !== hostId) {
          ws.send(encode({ type: MSG.ERROR, code: "SEAT", message: "El asiento 6 es del host" }));
        } else if (state.seats[n] && state.seats[n] !== userId) {
          ws.send(encode({ type: MSG.ERROR, code: "SEAT", message: `Asiento ${n} ocupado` }));
        } else {
          state = reduce(state, { type: MSG.SEAT, userId, seat: n });
          broadcast({ type: MSG.SEAT, userId, seat: n });
        }
      } else if (action.type === MSG.KICK) {
        if (userId !== hostId) {
          ws.send(encode({ type: MSG.ERROR, code: "KICK", message: "Solo el host puede expulsar" }));
          return;
        }
        const wanted = String(action.target || "").replace(/^@/, "").trim().toLowerCase();
        const entry = Object.entries(state.users).find(([, u]) => u.name.toLowerCase() === wanted);
        if (!entry) {
          ws.send(encode({ type: MSG.ERROR, code: "KICK", message: `No encontré a "${action.target}"` }));
          return;
        }
        const [targetId, targetUser] = entry;
        if (targetId === hostId) {
          ws.send(encode({ type: MSG.ERROR, code: "KICK", message: "El host no puede expulsarse" }));
          return;
        }
        sendTo(targetId, { type: MSG.KICK, by: state.users[userId]?.name ?? "el host" });
        broadcast({ type: MSG.SYSTEM, text: `${targetUser.name} fue expulsado por ${state.users[userId]?.name ?? "el host"}` });
        const tws = sockets.get(targetId);
        if (tws) tws.close();
      } else if (action.type === MSG.CHANNEL && action.action === "create") {
        const name = action.name;
        if (!name || !name.startsWith("#")) {
          ws.send(encode({ type: MSG.ERROR, code: "CHANNEL", message: "Nombre de canal inválido (usa #nombre)" }));
          return;
        }
        if (!state.channels.includes(name)) {
          state = reduce(state, { type: "channel", action: "create", name, private: !!action.private });
          if (action.private && action.password) channelPasswords.set(name, action.password);
          broadcast({ type: MSG.CHANNEL, action: "create", name, private: !!action.private });
        }
        members(name).add(userId);
        ws.send(encode({ type: MSG.HISTORY, channel: name, history: state.history[name] ?? [] }));
      } else if (action.type === MSG.CHANNEL && action.action === "join") {
        const name = action.name;
        if (!state.channels.includes(name)) {
          ws.send(encode({ type: MSG.ERROR, code: "CHANNEL", message: `El canal ${name} no existe` }));
          return;
        }
        if (state.channelPrivate[name] && channelPasswords.get(name) !== action.key) {
          ws.send(encode({ type: MSG.ERROR, code: "AUTH", message: `Contraseña incorrecta para ${name}` }));
          return;
        }
        members(name).add(userId);
        ws.send(encode({ type: MSG.HISTORY, channel: name, history: state.history[name] ?? [] }));
      }
    });

    ws.on("close", () => {
      if (!joined) return;
      const name = state.users[userId]?.name ?? "someone";
      state = reduce(state, { type: "leave", userId });
      sockets.delete(userId);
      for (const set of channelMembers.values()) set.delete(userId);
      if (hostId === userId) hostId = null;
      broadcast({ type: "leave", userId });
      broadcast({ type: MSG.SYSTEM, text: `${name} left the office` });
    });
  });

  const ready = new Promise((resolve, reject) => {
    wss.on("listening", resolve);
    wss.on("error", reject);
  });

  return {
    port,
    ready,
    close: () => new Promise((res) => wss.close(res)),
  };
}

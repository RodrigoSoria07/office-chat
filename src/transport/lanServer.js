// src/transport/lanServer.js
import { WebSocketServer } from "ws";
import { MSG, encode, decode } from "../protocol.js";
import { initialState, reduce } from "../state.js";

export function startServer({ port = 4040, password = null } = {}) {
  const wss = new WebSocketServer({ port });
  let state = initialState();
  const sockets = new Map(); // userId -> ws
  let counter = 0;
  let monotonicTs = 0;
  const nextTs = () => ++monotonicTs;

  function broadcast(action) {
    const raw = encode(action);
    for (const ws of sockets.values()) {
      if (ws.readyState === ws.OPEN) ws.send(raw);
    }
  }

  function uniqueName(name) {
    const taken = new Set(Object.values(state.users).map((u) => u.name));
    if (!taken.has(name)) return name;
    let i = 2;
    while (taken.has(`${name}-${i}`)) i++;
    return `${name}-${i}`;
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
        const joinAction = {
          type: "join", userId, name, avatar: action.avatar, color: action.color,
        };
        state = reduce(state, joinAction);
        sockets.set(userId, ws);
        joined = true;
        ws.send(encode({
          type: MSG.WELCOME,
          userId,
          name,
          channels: state.channels,
          users: state.users,
          history: state.history,
        }));
        broadcast(joinAction);
        broadcast({ type: MSG.SYSTEM, text: `${name} joined the office` });
        return;
      }

      if (!joined) return;

      // Stamp authoritative fields, apply, rebroadcast.
      if (action.type === MSG.MESSAGE) {
        const stamped = { type: "message", channel: action.channel, from: userId, text: action.text, ts: nextTs() };
        state = reduce(state, stamped);
        broadcast(stamped);
      } else if (action.type === MSG.DM) {
        const stamped = { type: MSG.DM, from: userId, to: action.to, text: action.text, ts: nextTs() };
        const target = sockets.get(action.to);
        if (target?.readyState === target.OPEN) target.send(encode(stamped));
        ws.send(encode(stamped));
      } else if (action.type === MSG.PRESENCE) {
        const stamped = { type: "presence", userId, presence: action.presence };
        state = reduce(state, stamped);
        broadcast(stamped);
      } else if (action.type === MSG.STATUS) {
        const stamped = { type: "status", userId, statusText: action.statusText };
        state = reduce(state, stamped);
        broadcast(stamped);
      } else if (action.type === MSG.CHANNEL) {
        const stamped = { type: "channel", action: action.action, name: action.name };
        state = reduce(state, stamped);
        broadcast(stamped);
      }
    });

    ws.on("close", () => {
      if (!joined) return;
      const name = state.users[userId]?.name ?? "someone";
      state = reduce(state, { type: "leave", userId });
      sockets.delete(userId);
      broadcast({ type: "leave", userId });
      broadcast({ type: MSG.SYSTEM, text: `${name} left the office` });
    });
  });

  return {
    port,
    close: () => new Promise((res) => wss.close(res)),
  };
}

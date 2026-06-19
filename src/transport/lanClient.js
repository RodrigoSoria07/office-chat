// src/transport/lanClient.js
import WebSocket from "ws";
import { encode, decode } from "../protocol.js";

export function createLanClient({ url, joinMessage, maxBackoff = 5000 }) {
  let ws = null;
  let closedByUser = false;
  let backoff = 250;
  const messageHandlers = [];
  const statusHandlers = [];

  const emitMessage = (a) => messageHandlers.forEach((h) => h(a));
  const emitStatus = (s) => statusHandlers.forEach((h) => h(s));

  function open() {
    return new Promise((resolve, reject) => {
      ws = new WebSocket(url);
      let settled = false;
      ws.on("open", () => {
        backoff = 250;
        emitStatus("connected");
        ws.send(encode(joinMessage));
        if (!settled) { settled = true; resolve(); }
      });
      ws.on("message", (data) => {
        const a = decode(data.toString());
        if (a) emitMessage(a);
      });
      ws.on("error", (err) => {
        if (!settled) { settled = true; reject(err); }
      });
      ws.on("close", () => {
        if (closedByUser) { emitStatus("closed"); return; }
        emitStatus("reconnecting");
        setTimeout(open, backoff);
        backoff = Math.min(backoff * 2, maxBackoff);
      });
    });
  }

  return {
    connect: () => open(),
    send: (message) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(encode(message));
    },
    onMessage: (h) => messageHandlers.push(h),
    onStatusChange: (h) => statusHandlers.push(h),
    close: () => {
      closedByUser = true;
      ws?.close();
    },
  };
}

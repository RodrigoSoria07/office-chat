// src/transport/index.js
// Transport interface:
//   connect(): Promise<void>
//   send(message): void
//   onMessage(handler): void       handler(actionObject)
//   onStatusChange(handler): void  handler("connected"|"reconnecting"|"closed")
//   close(): void
import { createLanClient } from "./lanClient.js";

export function createTransport(kind, opts) {
  if (kind === "lan") return createLanClient(opts);
  throw new Error(`Unknown transport: ${kind}`);
}

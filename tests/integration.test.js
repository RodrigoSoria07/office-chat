import { describe, it, expect, afterEach } from "vitest";
import { startServer } from "../src/transport/lanServer.js";
import { createLanClient } from "../src/transport/lanClient.js";
import { MSG } from "../src/protocol.js";

let server;
afterEach(async () => { if (server) await server.close(); server = null; });

function waitFor(client, predicate, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout waiting for message")), timeout);
    client.onMessage((a) => { if (predicate(a)) { clearTimeout(t); resolve(a); } });
  });
}

describe("integration: relay + clients", () => {
  it("delivers a message from client A to client B", async () => {
    server = startServer({ port: 4055 });
    const url = "ws://127.0.0.1:4055";

    const a = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "ana", avatar: "👩‍💻", color: "#D97757" } });
    const b = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "leo", avatar: "👨‍💻", color: "#D97757" } });

    await a.connect();
    await b.connect();

    const got = waitFor(b, (m) => m.type === MSG.MESSAGE && m.text === "hello team");
    a.send({ type: MSG.MESSAGE, channel: "#general", text: "hello team" });

    const msg = await got;
    expect(msg.channel).toBe("#general");

    a.close();
    b.close();
  });

  it("rejects a client with the wrong password", async () => {
    server = startServer({ port: 4056, password: "secret" });
    const url = "ws://127.0.0.1:4056";
    const c = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "ana", avatar: "👩‍💻", color: "#D97757", password: "wrong" } });
    const gotError = waitFor(c, (m) => m.type === MSG.ERROR);
    await c.connect();
    const err = await gotError;
    expect(err.code).toBe("AUTH");
    c.close();
  });
});

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
    await server.ready;
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
    await server.ready;
    const url = "ws://127.0.0.1:4056";
    const c = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "ana", avatar: "👩‍💻", color: "#D97757", password: "wrong" } });
    const gotError = waitFor(c, (m) => m.type === MSG.ERROR);
    await c.connect();
    const err = await gotError;
    expect(err.code).toBe("AUTH");
    c.close();
  });

  it("rejects ready when the port is already in use", async () => {
    server = startServer({ port: 4057 });
    await server.ready;
    const second = startServer({ port: 4057 });
    await expect(second.ready).rejects.toMatchObject({ code: "EADDRINUSE" });
  });

  it("assigns the host seat 6 and the next joiner seat 1", async () => {
    server = startServer({ port: 4058 });
    await server.ready;
    const url = "ws://127.0.0.1:4058";

    const host = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "host", avatar: "👨‍💻", color: "#D97757" } });
    const wHost = waitFor(host, (m) => m.type === MSG.WELCOME);
    await host.connect();
    const hw = await wHost;
    expect(hw.seats["6"]).toBe(hw.userId); // host at seat 6

    const guest = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "guest", avatar: "👩‍💻", color: "#D97757" } });
    const wGuest = waitFor(guest, (m) => m.type === MSG.WELCOME);
    await guest.connect();
    const gw = await wGuest;
    expect(gw.seats["1"]).toBe(gw.userId); // first guest at seat 1

    host.close();
    guest.close();
  });

  it("lets the host kick a user but rejects kicks from non-hosts", async () => {
    server = startServer({ port: 4060 });
    await server.ready;
    const url = "ws://127.0.0.1:4060";

    const host = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "host", avatar: "👨‍💻", color: "#D97757" } });
    const guest = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "leo", avatar: "👨‍💻", color: "#D97757" } });
    await host.connect();
    await guest.connect();

    // a non-host cannot kick
    const denied = waitFor(guest, (m) => m.type === MSG.ERROR && m.code === "KICK");
    guest.send({ type: MSG.KICK, target: "host" });
    expect((await denied).message).toMatch(/host/i);

    // the host kicks the guest -> guest receives KICK, everyone sees the leave
    const kicked = waitFor(guest, (m) => m.type === MSG.KICK).then((k) => { guest.close(); return k; });
    const left = waitFor(host, (m) => m.type === MSG.LEAVE);
    host.send({ type: MSG.KICK, target: "@leo" });
    const k = await kicked;
    expect(k.by).toBe("host");
    await left;

    host.close();
  });

  it("broadcasts a poll and tallies votes to everyone", async () => {
    server = startServer({ port: 4061 });
    await server.ready;
    const url = "ws://127.0.0.1:4061";

    const a = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "ana", avatar: "👨‍💻", color: "#D97757" } });
    const b = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "leo", avatar: "👨‍💻", color: "#D97757" } });
    await a.connect();
    await b.connect();

    // ana creates a poll -> both see the "new" event
    const bNew = waitFor(b, (m) => m.type === MSG.POLL && m.event === "new");
    a.send({ type: MSG.POLL, question: "¿Deploy hoy?", options: ["Sí", "No", "Mañana"] });
    const np = await bNew;
    expect(np.options).toEqual(["Sí", "No", "Mañana"]);
    expect(np.by).toBe("ana");

    // both vote -> tally updates broadcast to everyone
    const upd = waitFor(a, (m) => m.type === MSG.POLL && m.event === "update" && m.total === 2);
    a.send({ type: MSG.VOTE, vote: 1 }); // Sí
    b.send({ type: MSG.VOTE, vote: 1 }); // Sí
    const u = await upd;
    expect(u.tally[0]).toBe(2); // two votes for "Sí"
    expect(u.total).toBe(2);

    // invalid vote is rejected
    const err = waitFor(b, (m) => m.type === MSG.ERROR && m.code === "VOTE");
    b.send({ type: MSG.VOTE, vote: 9 });
    expect((await err).message).toMatch(/inválido/i);

    a.close();
    b.close();
  });

  it("keeps private-channel messages to members only", async () => {
    server = startServer({ port: 4059 });
    await server.ready;
    const url = "ws://127.0.0.1:4059";

    const a = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "ana", avatar: "👩‍💻", color: "#D97757" } });
    const b = createLanClient({ url, joinMessage: { type: MSG.JOIN, name: "leo", avatar: "👨‍💻", color: "#D97757" } });
    const bSeen = [];
    b.onMessage((m) => bSeen.push(m));
    await a.connect();
    await b.connect();

    // ana creates a private channel and waits for the HISTORY (= joined) ack
    const created = waitFor(a, (m) => m.type === MSG.HISTORY && m.channel === "#secret");
    a.send({ type: MSG.CHANNEL, action: "create", name: "#secret", private: true, password: "k" });
    await created;

    a.send({ type: MSG.MESSAGE, channel: "#secret", text: "topsecret" });

    // leo is NOT a member — must never see it. Give it time to (not) arrive.
    await new Promise((r) => setTimeout(r, 150));
    expect(bSeen.some((m) => m.type === MSG.MESSAGE && m.text === "topsecret")).toBe(false);

    // wrong key is rejected
    const denied = waitFor(b, (m) => m.type === MSG.ERROR && m.code === "AUTH");
    b.send({ type: MSG.CHANNEL, action: "join", name: "#secret", key: "wrong" });
    await denied;

    // correct key lets leo in and replays the backlog
    const hist = waitFor(b, (m) => m.type === MSG.HISTORY && m.channel === "#secret");
    b.send({ type: MSG.CHANNEL, action: "join", name: "#secret", key: "k" });
    const h = await hist;
    expect(h.history.some((m) => m.text === "topsecret")).toBe(true);

    a.close();
    b.close();
  });
});

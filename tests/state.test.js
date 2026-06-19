import { describe, it, expect } from "vitest";
import { initialState, reduce } from "../src/state.js";

describe("state reducer", () => {
  it("starts with a #general channel and empty roster", () => {
    const s = initialState();
    expect(s.channels).toContain("#general");
    expect(Object.keys(s.users)).toHaveLength(0);
  });

  it("adds a user on join", () => {
    const s = reduce(initialState(), {
      type: "join", userId: "u1", name: "ana", avatar: "👩‍💻", color: "#D97757",
    });
    expect(s.users.u1).toMatchObject({ name: "ana", presence: "online" });
  });

  it("appends a message to a channel's history", () => {
    let s = initialState();
    s = reduce(s, { type: "message", channel: "#general", from: "u1", text: "hi", ts: 1 });
    expect(s.history["#general"]).toHaveLength(1);
    expect(s.history["#general"][0].text).toBe("hi");
  });

  it("caps channel history at 100 messages", () => {
    let s = initialState();
    for (let i = 0; i < 150; i++) {
      s = reduce(s, { type: "message", channel: "#general", from: "u1", text: `m${i}`, ts: i });
    }
    expect(s.history["#general"]).toHaveLength(100);
    expect(s.history["#general"][0].text).toBe("m50");
  });

  it("updates presence", () => {
    let s = reduce(initialState(), { type: "join", userId: "u1", name: "ana", avatar: "👩‍💻", color: "#D97757" });
    s = reduce(s, { type: "presence", userId: "u1", presence: "away" });
    expect(s.users.u1.presence).toBe("away");
  });

  it("updates a user's status text", () => {
    let s = reduce(initialState(), { type: "join", userId: "u1", name: "ana", avatar: "👩‍💻", color: "#D97757" });
    s = reduce(s, { type: "status", userId: "u1", statusText: "fixing auth" });
    expect(s.users.u1.statusText).toBe("fixing auth");
  });

  it("creates a channel and removes a user on leave", () => {
    let s = reduce(initialState(), { type: "join", userId: "u1", name: "ana", avatar: "👩‍💻", color: "#D97757" });
    s = reduce(s, { type: "channel", action: "create", name: "#api" });
    expect(s.channels).toContain("#api");
    s = reduce(s, { type: "leave", userId: "u1" });
    expect(s.users.u1).toBeUndefined();
  });

  it("does not mutate the input state", () => {
    const s0 = initialState();
    const s1 = reduce(s0, { type: "channel", action: "create", name: "#api" });
    expect(s0.channels).not.toContain("#api");
    expect(s1).not.toBe(s0);
  });
});

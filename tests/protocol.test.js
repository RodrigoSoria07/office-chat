import { describe, it, expect } from "vitest";
import { MSG, encode, decode } from "../src/protocol.js";

describe("protocol", () => {
  it("exposes message type constants", () => {
    expect(MSG.JOIN).toBe("join");
    expect(MSG.MESSAGE).toBe("message");
    expect(MSG.WELCOME).toBe("welcome");
  });

  it("round-trips a message through encode/decode", () => {
    const msg = { type: MSG.MESSAGE, channel: "#general", text: "hi", ts: 1, from: "u1" };
    expect(decode(encode(msg))).toEqual(msg);
  });

  it("decode returns null on invalid JSON", () => {
    expect(decode("{not json")).toBeNull();
  });

  it("decode returns null when type is missing", () => {
    expect(decode(JSON.stringify({ text: "hi" }))).toBeNull();
  });
});

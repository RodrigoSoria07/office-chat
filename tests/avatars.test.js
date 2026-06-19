import { describe, it, expect } from "vitest";
import { AVATARS, isValidAvatar, defaultAvatar } from "../src/avatars.js";

describe("avatars", () => {
  it("only contains person emojis (no animals)", () => {
    expect(AVATARS).toContain("👨‍💻");
    expect(AVATARS).toContain("👩‍💻");
    expect(AVATARS).not.toContain("🐢");
    expect(AVATARS.length).toBeGreaterThanOrEqual(4);
  });

  it("validates avatars against the list", () => {
    expect(isValidAvatar("👩‍💻")).toBe(true);
    expect(isValidAvatar("🐢")).toBe(false);
  });

  it("has a default avatar that is in the list", () => {
    expect(AVATARS).toContain(defaultAvatar());
  });
});

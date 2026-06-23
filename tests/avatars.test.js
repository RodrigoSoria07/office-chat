import { describe, it, expect } from "vitest";
import { AVATARS, AVATAR_LABELS, isValidAvatar, defaultAvatar } from "../src/avatars.js";

describe("avatars", () => {
  it("contains male human avatars", () => {
    expect(AVATARS).toContain("👨");
    expect(AVATARS).toContain("👨‍💻");
    expect(AVATARS).not.toContain("🐢");
    expect(AVATARS.length).toBeGreaterThanOrEqual(4);
  });

  it("has a label for every avatar", () => {
    expect(AVATAR_LABELS.length).toBe(AVATARS.length);
  });

  it("validates avatars against the list", () => {
    expect(isValidAvatar("👨")).toBe(true);
    expect(isValidAvatar("🐢")).toBe(false);
  });

  it("has a default avatar that is in the list", () => {
    expect(AVATARS).toContain(defaultAvatar());
  });
});

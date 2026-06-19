import { describe, it, expect } from "vitest";
import { welcomeBanner } from "../src/ui/banner.js";

describe("welcome banner", () => {
  it("includes the logo, room, and join hint", () => {
    const out = welcomeBanner({ room: "creative-latam", joinHint: "office join 192.168.1.5", hosting: true });
    expect(out).toContain("✺");
    expect(out).toContain("creative-latam");
    expect(out).toContain("office join 192.168.1.5");
    expect(out).toContain("╭");
    expect(out).toContain("╰");
  });
});

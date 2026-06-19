import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readConfig, writeConfig } from "../src/config.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "office-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("config", () => {
  it("returns defaults when no file exists", () => {
    const cfg = readConfig(dir);
    expect(cfg.name).toBeDefined();
    expect(cfg.avatar).toBeDefined();
    expect(cfg.color).toBeDefined();
  });

  it("persists and reads back values", () => {
    writeConfig({ name: "ana", avatar: "👩‍💻", color: "#D97757" }, dir);
    const cfg = readConfig(dir);
    expect(cfg.name).toBe("ana");
    expect(cfg.avatar).toBe("👩‍💻");
  });
});

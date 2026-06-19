// src/config.js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, userInfo } from "node:os";
import { defaultAvatar } from "./avatars.js";

function configDir(base) {
  return join(base ?? homedir(), ".office");
}
function configPath(base) {
  return join(configDir(base), "config.json");
}

export function defaults() {
  let name = "dev";
  try { name = userInfo().username || "dev"; } catch { /* ignore */ }
  return { name, avatar: defaultAvatar(), color: "#D97757" };
}

export function readConfig(base) {
  const path = configPath(base);
  if (!existsSync(path)) return defaults();
  try {
    return { ...defaults(), ...JSON.parse(readFileSync(path, "utf8")) };
  } catch {
    return defaults();
  }
}

export function writeConfig(cfg, base) {
  const dir = configDir(base);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const merged = { ...readConfig(base), ...cfg };
  writeFileSync(configPath(base), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

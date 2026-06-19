import { describe, it, expect } from "vitest";
import { renderMessageLine, renderCodeBlocks } from "../src/ui/messages.js";
import { renderRoster } from "../src/ui/sidebar.js";
import { parseInput } from "../src/ui/input.js";

describe("ui helpers", () => {
  it("renders a message line with avatar and name", () => {
    const line = renderMessageLine({ avatar: "👩‍💻", name: "ana", text: "hi" });
    expect(line).toContain("👩‍💻");
    expect(line).toContain("ana");
    expect(line).toContain("hi");
  });

  it("highlights fenced code blocks (keeps the code text)", () => {
    const out = renderCodeBlocks("```js\nconst x = 1\n```");
    expect(out).toContain("const x");
  });

  it("renders roster with presence dots", () => {
    const users = { u1: { name: "ana", avatar: "👩‍💻", presence: "online", statusText: "fixing auth" } };
    const out = renderRoster(users);
    expect(out).toContain("ana");
    expect(out).toContain("fixing auth");
  });

  it("parses a slash command", () => {
    expect(parseInput("/status fixing auth")).toEqual({ kind: "command", name: "status", arg: "fixing auth" });
  });

  it("parses plain text as a message", () => {
    expect(parseInput("hello")).toEqual({ kind: "message", text: "hello" });
  });

  it("parses a dm command with target and text", () => {
    expect(parseInput("/dm @ana hey there")).toEqual({ kind: "command", name: "dm", arg: "@ana hey there" });
  });
});

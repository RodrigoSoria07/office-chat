import { describe, it, expect } from "vitest";
import { resolveColor, colorNames, rotationColor, BRAND } from "../src/colors.js";
import { stateColor, normalizeState, stateNames } from "../src/states.js";
import { renderTable, renderTableSidebar } from "../src/ui/table.js";
import { initialState, reduce } from "../src/state.js";

describe("colors", () => {
  it("resolves palette names and hex, rejects junk", () => {
    expect(resolveColor("azul")).toBe("#5B9BD5");
    expect(resolveColor("#abcdef")).toBe("#abcdef");
    expect(resolveColor("morado")).toBeTruthy();
    expect(resolveColor("notacolor")).toBeNull();
  });
  it("rotation gives distinct colors for the first few joiners", () => {
    expect(rotationColor(0)).not.toBe(rotationColor(1));
    expect(rotationColor(1)).not.toBe(rotationColor(2));
  });
  it("exposes named colors and a brand default", () => {
    expect(colorNames()).toContain("azul");
    expect(BRAND).toBe("#D97757");
  });
});

describe("states", () => {
  it("maps presets to colors, case-insensitive", () => {
    expect(stateColor("QA")).toBeTruthy();
    expect(stateColor("desarrollo")).toBeTruthy();
    expect(stateColor("cualquier cosa")).toBeNull();
  });
  it("normalizes preset casing, passes free text through", () => {
    expect(normalizeState("qa")).toBe("QA");
    expect(normalizeState("revisando PR")).toBe("revisando PR");
  });
  it("lists the presets", () => {
    expect(stateNames()).toEqual(["Disponible", "QA", "Desarrollo", "RYD"]);
  });
});

describe("reducer: color / seat / private channel", () => {
  it("changes a user's color", () => {
    let s = reduce(initialState(), { type: "join", userId: "u1", name: "ana", avatar: "👩‍💻", color: "#000000" });
    s = reduce(s, { type: "color", userId: "u1", color: "#5B9BD5" });
    expect(s.users.u1.color).toBe("#5B9BD5");
  });
  it("seats a user and moves them (one seat each)", () => {
    let s = reduce(initialState(), { type: "join", userId: "u1", name: "ana", avatar: "👩‍💻", color: "#000" });
    s = reduce(s, { type: "seat", userId: "u1", seat: 3 });
    expect(s.seats[3]).toBe("u1");
    s = reduce(s, { type: "seat", userId: "u1", seat: 5 });
    expect(s.seats[5]).toBe("u1");
    expect(s.seats[3]).toBeUndefined();
  });
  it("frees the seat on leave", () => {
    let s = reduce(initialState(), { type: "join", userId: "u1", name: "ana", avatar: "👩‍💻", color: "#000" });
    s = reduce(s, { type: "seat", userId: "u1", seat: 6 });
    s = reduce(s, { type: "leave", userId: "u1" });
    expect(s.seats[6]).toBeUndefined();
  });
  it("marks created channels as private when flagged", () => {
    let s = reduce(initialState(), { type: "channel", action: "create", name: "#backend", private: true });
    expect(s.channels).toContain("#backend");
    expect(s.channelPrivate["#backend"]).toBe(true);
    expect(s.channelPrivate["#general"]).toBe(false);
  });
});

describe("table render", () => {
  it("shows seat numbers, the host marker, and an empty seat", () => {
    let s = reduce(initialState(), { type: "join", userId: "u1", name: "ana", avatar: "👩‍💻", color: "#5B9BD5" });
    s = reduce(s, { type: "seat", userId: "u1", seat: 6 }); // host
    const out = renderTable(s);
    expect(out).toContain("ana");
    expect(out).toContain("★");      // host marker on seat 6
    expect(out).toContain("vacío");  // unoccupied seats
    expect(out).toContain("ESTACIÓN");
  });

  it("renders the compact sidebar table with the seated avatar and legend", () => {
    let s = reduce(initialState(), { type: "join", userId: "u1", name: "ana", avatar: "👩‍💻", color: "#5B9BD5" });
    s = reduce(s, { type: "seat", userId: "u1", seat: 6 });
    const out = renderTableSidebar(s);
    expect(out).toContain("ESTACIÓN");
    expect(out).toContain("👩‍💻");   // the emoji sits in its seat
    expect(out).toContain("ana");   // legend
    expect(out).toContain("★");     // host marker
  });
});

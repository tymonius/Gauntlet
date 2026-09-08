import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const helper = readFileSync("playtest/onboarding/event-game-busy-focus-accessibility.js", "utf8");
const loader = readFileSync("playtest/onboarding/app.js", "utf8");
const games = readFileSync("playtest/onboarding/games.js", "utf8");

describe("event table busy focus", () => {
  it("loads the focus handoff before the event game manager", () => {
    expect(loader.indexOf("event-game-busy-focus-accessibility.js")).toBeGreaterThan(-1);
    expect(loader.indexOf("event-game-busy-focus-accessibility.js")).toBeLessThan(loader.indexOf("games.js"));
  });

  it("hands focus to status when create or refresh disables its active button", () => {
    expect(games).toContain("el.eventCreateGames.disabled = busy;");
    expect(games).toContain("el.eventRefreshGames.disabled = true;");
    expect(helper).toContain('new Set(["eventCreateGames", "eventRefreshGames"])');
    expect(helper).toContain('status.setAttribute("role", "status");');
    expect(helper).toContain("status.focus({ preventScroll: true });");
  });

  it("returns focus only when the status still owns it after the action completes", () => {
    expect(helper).toContain('attributeFilter: ["disabled"]');
    expect(helper).toContain("if (document.activeElement === status && target.isConnected)");
    expect(helper).toContain("target.focus({ preventScroll: true });");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/onboarding/games.js", "utf8");

describe("event game close focus", () => {
  it("keeps a stable identity on rendered game cards", () => {
    expect(source).toContain('card.dataset.gameSessionId = String(game.sessionId || "");');
    expect(source).toContain('querySelectorAll("[data-game-session-id]")');
  });

  it("restores focus after the close action refreshes the game list", () => {
    expect(source).toContain('function focusGameAfterRefresh(sessionId)');
    expect(source).toContain('focusGameAfterRefresh(game.sessionId);');
    expect(source).toContain('<h2 id="event-games-title" tabindex="-1">One QR code per game.</h2>');
  });
});

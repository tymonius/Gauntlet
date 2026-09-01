import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const authority = JSON.parse(read("game-data/current-game.json"));
const bulk = read("deckbuilder/print-all-starters.js");
const html = read("deckbuilder/index.html");

describe("Deckbuilder starter count authority", () => {
  it("keeps the current starter set at one Deck per Leader", () => {
    const leaderCount = authority.gameplay.factions
      .reduce((sum: number, faction: any) => sum + (faction.leaders || []).length, 0);
    expect(leaderCount).toBe(12);
    expect(authority.starterDecks.decks).toHaveLength(leaderCount);
  });

  it("derives the expected bulk starter count from current-game Leader authority", () => {
    expect(bulk).toContain("expectedDeckCount = (currentGame.factions || [])");
    expect(bulk).toContain(".reduce((sum, faction) => sum + (faction.leaders || []).length, 0)");
    expect(bulk).toContain("starterDecks.length !== expectedDeckCount");
    expect(bulk).toContain("Expected one starter Deck per Leader");
    expect(bulk).not.toContain("EXPECTED_DECK_COUNT");
  });

  it("keeps bulk print progress and labels count-dynamic", () => {
    expect(bulk).toContain("Print all ${expectedDeckCount} starter decks");
    expect(bulk).toContain("Preparing 0 of ${expectedDeckCount}");
    expect(bulk).toContain("Preparing ${index + 1} of ${expectedDeckCount}");
    expect(bulk).toContain("Preparing all ${expectedDeckCount} starter Decks");
    expect(bulk).toContain("<title>All ${expectedDeckCount} Gauntlet");
    expect(bulk).not.toContain("all twelve");
    expect(bulk).not.toContain("All 12 Gauntlet");
    expect(html).toContain("Print all starter decks");
    expect(html).not.toContain("Print all 12 starter decks");
  });
});

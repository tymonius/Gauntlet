import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const rulebook = readFileSync(new URL("../rulebook/player-facing/current-rulebook.md", import.meta.url), "utf8");
const currentGame = readFileSync(new URL("../game-data/current-game.json", import.meta.url), "utf8");

describe("v0.7.2 Leveraged Buyout authority", () => {
  test("keeps battle collateral timing aligned between the card and candidate rulebook", () => {
    expect(rulebook).toContain("Leveraged Buyout collateral used from battle goes to the Graveyard when battle cards are cleared.");
    expect(rulebook).not.toContain("Leveraged Buyout collateral used from battle goes to the Graveyard after the purchase.");
    expect(currentGame).toContain("battle collateral goes there when battle cards are cleared");
  });
});

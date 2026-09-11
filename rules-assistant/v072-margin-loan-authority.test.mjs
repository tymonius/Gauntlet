import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const current = JSON.parse(readFileSync(new URL("../game-data/current-game.json", import.meta.url), "utf8"));

describe("v0.7.2 Margin Loan authority", () => {
  test("uses printed effects as the single card authority", () => {
    const margin = current.gameplay.cards.find((card) => card.id === "financiers-margin-loan");
    expect(margin).toBeTruthy();
    expect(margin).not.toHaveProperty("loan");
    const asset = margin.effects.find((effect) => effect.label === "Asset");
    expect(asset.text).toContain("After income");
    expect(asset.text).toContain("Repay");
    expect(asset.text).toContain("Default");
  });
});

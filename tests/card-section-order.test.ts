import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const renderer = readFileSync("card-design/face-templates/playable.mjs", "utf8");

describe("card renderer section ordering", () => {
  it("preserves canonical effect order without re-sorting sections", () => {
    expect(renderer).toContain("(card.effects || []).map(renderRuleSection).join('')");
    expect(renderer).not.toContain(".sort(");
  });

  it("uses current card-value terminology in accessible text", () => {
    expect(renderer).toContain('aria-label="Card value ${Number(card.cost)}"');
    expect(renderer).not.toContain("Deckbuilding value");
  });
});

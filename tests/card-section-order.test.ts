import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const renderer = readFileSync("card-design/playable-card-renderer.js", "utf8");

describe("card renderer section ordering", () => {
  it("preserves canonical source order for Action, Asset, Use, and Battle headings", () => {
    expect(renderer).toContain(
      "const sections = sectionEntries.filter(([label]) => label.toLowerCase() !== 'reminder');"
    );
    expect(renderer).not.toContain("const sections = [action, battle, ...other]");
  });

  it("uses current card-value terminology in accessible text", () => {
    expect(renderer).toContain('aria-label="Card value ${card.cost}"');
    expect(renderer).not.toContain('aria-label="Deckbuilding value ${card.cost}"');
  });
});

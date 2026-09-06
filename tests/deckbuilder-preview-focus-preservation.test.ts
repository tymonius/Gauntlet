import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Deckbuilder preview focus preservation", () => {
  it("restores focus after playable-card preview rerenders", () => {
    const source = readFileSync("deckbuilder/app.js", "utf8");
    expect(source).toContain(
      'el.availableCards.querySelector(".compact-card-row.selected .compact-row-preview-button")'
    );
  });

  it("restores focus after Territory preview rerenders", () => {
    const source = readFileSync("deckbuilder/territories.js", "utf8");
    expect(source).toContain(
      'list.querySelector(".compact-territory-row.selected .compact-row-preview-button")'
    );
  });

  it("restores focus after Rite preview rerenders", () => {
    const source = readFileSync("deckbuilder/mystics-rites.js", "utf8");
    expect(source).toContain(
      'list.querySelector(".compact-rite-row.selected .compact-row-preview-button")'
    );
  });
});

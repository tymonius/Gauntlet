import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readCombined = (paths: string[]) =>
  paths.map((path) => readFileSync(path, "utf8")).join("\n");

const governingCombined = readCombined([
  "rulebook/player-facing/current-rulebook.md",
  "game-data/current-game.json",
]);

const websiteCombined = readCombined([
  "start/index.html",
  "playtest/onboarding/index.html",
  "playtest/player-mat/index.html",
  "factions/inquisition/index.html",
  "factions/intelligence/index.html",
  "factions/financiers/index.html",
  "factions/mystics/index.html",
  "start/app.js",
  "deckbuilder/app.js",
  "deckbuilder/faction-components.js",
  "deckbuilder/print.js",
]);

const printableReferenceCombined = readCombined([
  "card-design/reference-copy/v0.7.0/inquisition-purge-reference.md",
  "card-design/reference-copy/v0.7.0/financier-reference.md",
]);

describe("player-facing terminology", () => {
  it("does not classify cards as Action cards in current governing sources", () => {
    expect(governingCombined).not.toMatch(/\bAction cards?\b/i);
  });

  it("keeps Purge on the current Action-phase model", () => {
    expect(governingCombined).toContain("If one Action that turn is Purge, you may also take one Action in the other Action phase");
    expect(governingCombined).toContain("Purge never permits two Actions during the same phase");
    expect(governingCombined).not.toMatch(/\bPurge may be performed\b/i);
    expect(governingCombined).not.toMatch(/Action Opportunit(?:y|ies)/i);
  });

  it("keeps current website copy on the same faction-feature model", () => {
    expect(websiteCombined).not.toMatch(/Action Opportunit(?:y|ies)/i);
    expect(websiteCombined).not.toMatch(/\bdeckbuilding value\b/i);
    expect(websiteCombined).toContain("Financial Capacity");
    expect(websiteCombined).toContain("without spending an Action");
    expect(websiteCombined).toContain("without taking an Action");
    expect(websiteCombined).toContain("value is at least 1 plus your completed Rites");
    expect(websiteCombined).toContain("Supplemental reference — not a Playable Deck card");
  });

  it("keeps printable faction references on the same current model", () => {
    expect(printableReferenceCombined).not.toMatch(/Action Opportunit(?:y|ies)/i);
    expect(printableReferenceCombined).toContain("Financial Capacity");
    expect(printableReferenceCombined).toContain("If one Action that turn is Purge");
    expect(printableReferenceCombined).toContain("one Action in the other Action phase");
    expect(printableReferenceCombined).toContain("Purge is a Faction Feature, not a card play.");
  });

  it("keeps current Mystics shared binding language in governing authority", () => {
    expect(governingCombined).toContain("If a Rite or Ritual binding ends without another instruction");
    expect(governingCombined).toContain("value is at least 1 plus your completed Rites");
  });
});

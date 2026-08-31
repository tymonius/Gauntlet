import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readRepoFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("Mystics Ritual Deckbuilder component", () => {
  it("adds the Ritual of Ascension to the Mystics supplemental package", () => {
    const source = readRepoFile("deckbuilder/faction-components.js");

    expect(source).toContain('const MYSTICS_RITUAL_COMPONENT_ID = "mystics-ritual-of-ascension"');
    expect(source).toContain('const ritual = currentGame.mystics?.ritual');
    expect(source).toContain('const summaryLabel = `${ritual.name} card`');
    expect(source).toContain('title: ritual.name');
    expect(source).toContain('kind: "ritual"');
    expect(source).toContain('type: "reference"');
    expect(source).toContain('label: "Convergence"');
    expect(source).toContain('label: "Complete"');
    expect(source).toContain('label: "Interruption"');
    expect(source).toContain('footer: "Supplemental Ritual card — not a Playable Deck card"');
  });

  it("loads the Ritual augmentation after supplemental data and before printing", () => {
    const html = readRepoFile("deckbuilder/index.html");
    const supplementalIndex = html.indexOf("v061-supplementals.js");
    const componentsIndex = html.indexOf("faction-components.js?v=20260802-1");
    const printIndex = html.indexOf("print.js");

    expect(supplementalIndex).toBeGreaterThan(-1);
    expect(componentsIndex).toBeGreaterThan(supplementalIndex);
    expect(printIndex).toBeGreaterThan(componentsIndex);
  });
  it("derives completed-Rite progression from current Mystics authority", () => {
    const print = readRepoFile("deckbuilder/print.js");

    expect(print).toContain("state.currentGameData?.mystics");
    expect(print).toContain("mystics.ritual?.name");
    expect(print).toContain("mystics.unlocks || []");
    expect(print).not.toContain("Ritual of Ascendance");
  });

});

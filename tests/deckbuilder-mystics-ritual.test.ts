import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readRepoFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("Mystics Ritual Deckbuilder component", () => {
  it("adds the Ritual of Ascendance to the Mystics supplemental package", () => {
    const source = readRepoFile("deckbuilder/faction-components.js");

    expect(source).toContain('const MYSTICS_RITUAL_COMPONENT_ID = "mystics-ritual-of-ascendance"');
    expect(source).toContain('const summaryLabel = "Ritual of Ascendance card"');
    expect(source).toContain('title: "Ritual of Ascendance"');
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
});

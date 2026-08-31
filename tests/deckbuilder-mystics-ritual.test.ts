import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readRepoFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("Mystics Ritual Deckbuilder component", () => {
  it("adds the Ritual of Ascension to the Mystics supplemental package", () => {
    const source = readRepoFile("deckbuilder/faction-components.js");

    expect(source).toContain('const MYSTICS_RITUAL_COMPONENT_ID = "mystics-ritual-of-ascension"');
    expect(source).toContain('const ritual = currentGame.mystics?.ritual');
    expect(source).toContain('packages.mystics.summary.push(`${ritual.name} card`)');
    expect(source).toContain('title: ritual.name');
    expect(source).toContain('kind: "ritual"');
    expect(source).toContain('type: "reference"');
    expect(source).toContain('label: "Convergence"');
    expect(source).toContain('label: "Complete"');
    expect(source).toContain('label: "Interruption"');
    expect(source).toContain('contractId: MYSTICS_RITUAL_COMPONENT_ID');
  });

  it("derives Ritual print data from current authority before the print module runs", () => {
    const html = readRepoFile("deckbuilder/index.html");
    const componentsIndex = html.indexOf("faction-components.js?v=20260802-1");
    const printIndex = html.indexOf("print.js");

    expect(componentsIndex).toBeGreaterThan(-1);
    expect(printIndex).toBeGreaterThan(componentsIndex);
    expect(html).not.toContain("v061-supplementals.js");
    expect(html).not.toContain("completed-supplementals.js");
    expect(html).not.toContain("supplemental-data.js");
  });
});

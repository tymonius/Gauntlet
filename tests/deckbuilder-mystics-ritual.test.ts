import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readRepoFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("Mystics Ritual Deckbuilder component", () => {
  it("derives the Ritual of Ascension package entry from physical component authority", () => {
    const source = readRepoFile("deckbuilder/faction-components.js");
    const currentGame = JSON.parse(readRepoFile("game-data/current-game.json"));
    const ritual = currentGame.componentContract.components.find((component: any) => component.id === "mystics-ritual-of-ascension");

    expect(ritual).toMatchObject({
      family: "ritual-card",
      productionStatus: "ready",
      backPolicy: "specialBack",
    });
    expect(source).toContain('component.family === "reference-card" || component.family === "ritual-card"');
    expect(source).toContain('const ritual = component.family === "ritual-card" ? currentGame.mystics?.ritual : null;');
    expect(source).toContain('kind: component.renderSource?.kind || ""');
    expect(source).toContain('label: "Convergence"');
    expect(source).toContain('label: "Complete"');
    expect(source).toContain('label: "Interruption"');
    expect(source).not.toContain("MYSTICS_RITUAL_COMPONENT_ID");
  });

  it("derives Ritual print data from current authority before the print module runs", () => {
    const html = readRepoFile("deckbuilder/index.html");
    const componentsIndex = html.indexOf("faction-components.js");
    const printIndex = html.indexOf("print.js");

    expect(componentsIndex).toBeGreaterThan(-1);
    expect(printIndex).toBeGreaterThan(componentsIndex);
    expect(html).not.toContain("v061-supplementals.js");
    expect(html).not.toContain("completed-supplementals.js");
    expect(html).not.toContain("supplemental-data.js");
  });
  it("delegates Rite faces to the current production component authority", () => {
    const print = readRepoFile("deckbuilder/print.js");

    expect(print).toContain('productionPrint().component(rite.contractId, completed ? "reverse" : "front")');
    expect(print).not.toContain("Ritual of Ascendance");
    expect(print).not.toContain("rite-completed-copy");
  });

});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const catalog = readFileSync("card-design/index.html", "utf8");
const catalogOverlay = readFileSync("card-design/v064-card-candidates.js", "utf8");
const printRenderer = readFileSync("card-design/component-print-render.html", "utf8");

describe("Deckbuilder component print renderer parity", () => {
  it("loads every current component-specific style and refinement layer used by Card Design", () => {
    for (const dependency of [
      "leader-card.css",
      "proposal-card.css",
      "rite-card.css",
      "reference-card.css",
      "supplemental-card.css",
      "supplemental-refinements.css",
      "deed-card.css",
    ]) {
      expect(catalog).toContain(dependency);
      expect(printRenderer).toContain(`/card-design/${dependency}`);
    }
  });

  it("loads every current component rendering layer needed by the Card Design catalog", () => {
    for (const dependency of [
      "proposal-card.js",
      "rite-card.js",
      "supplemental-card.js",
    ]) {
      expect(catalog).toContain(dependency);
      expect(printRenderer).toContain(`/card-design/${dependency}`);
    }

    expect(catalogOverlay).toContain("./leader-card-copy.js");
    expect(printRenderer).toContain("/card-design/leader-card-copy.js");
  });

  it("keeps the supplemental refinement layer on the production print surface", () => {
    const refinementIndex = printRenderer.indexOf("/card-design/supplemental-refinements.css");
    const supplementalBaseIndex = printRenderer.indexOf("/card-design/supplemental-card.css");

    expect(refinementIndex).toBeGreaterThan(supplementalBaseIndex);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parchmentCss = readFileSync("card-design/card-parchment.css", "utf8");
const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");

describe("card parchment backgrounds", () => {
  it("loads the approved parchment layer in the card mockup system", () => {
    expect(refinementCss).toContain('@import url("card-parchment.css");');
    expect(parchmentCss).toContain(
      'background-image: url("../images/artwork/card-backgrounds/parchments.webp");'
    );
  });

  it.each([
    ["neutral", "0%"],
    ["military", "16.6667%"],
    ["diplomats", "33.3333%"],
    ["financiers", "50%"],
    ["intelligence", "66.6667%"],
    ["mystics", "83.3333%"],
    ["inquisition", "100%"],
  ])("maps %s to its approved sprite frame", (faction, position) => {
    expect(parchmentCss).toContain(`[data-faction="${faction}"]`);
    expect(parchmentCss).toContain(`--parchment-position: ${position};`);
  });
});

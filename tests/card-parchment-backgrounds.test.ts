import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parchmentCss = readFileSync("card-design/card-parchment.css", "utf8");
const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");
const cardScript = readFileSync("card-design/card-design.js", "utf8");

describe("card parchment backgrounds", () => {
  it("uses the opaque loaded grid as the card background with a color fallback", () => {
    expect(refinementCss).toContain('@import url("card-parchment.css");');
    expect(parchmentCss).toContain("background-color: var(--card-parchment);");
    expect(parchmentCss).toContain("background-image: var(--parchment-image);");
    expect(parchmentCss).toContain("background-size: 300% 300%;");
    expect(parchmentCss).toContain(".card-interior::before");
    expect(parchmentCss).toContain("content: none;");
    expect(parchmentCss).not.toContain("parchments.webp");
    expect(parchmentCss).not.toContain("--parchment-opacity");
    expect(parchmentCss).not.toContain("mix-blend-mode");
  });

  it.each([
    ["neutral", "0% 0%"],
    ["military", "50% 0%"],
    ["diplomats", "100% 0%"],
    ["financiers", "0% 50%"],
    ["intelligence", "50% 50%"],
    ["mystics", "100% 50%"],
    ["inquisition", "0% 100%"],
  ])("maps %s to its approved grid panel", (faction, position) => {
    expect(parchmentCss).toContain(`[data-faction="${faction}"]`);
    expect(parchmentCss).toContain(`--parchment-position: ${position};`);
  });

  it("assembles the four grid chunks once into a cached WebP object URL", () => {
    for (let part = 0; part < 4; part += 1) {
      const path = `images/artwork/card-backgrounds/parchments-grid.webp.b64.${part}`;
      expect(existsSync(path)).toBe(true);
      expect(cardScript).toContain(`../${path}`);
    }

    expect(cardScript).toContain("const PARCHMENT_PARTS");
    expect(cardScript).toContain("Promise.all(PARCHMENT_PARTS.map");
    expect(cardScript).toContain("parts.join('')");
    expect(cardScript).toContain("window.atob");
    expect(cardScript).toContain("new Blob([bytes], { type: 'image/webp' })");
    expect(cardScript).toContain("URL.createObjectURL");
    expect(cardScript).toContain("parchmentPromise");
    expect(cardScript).toContain("cache: 'force-cache'");
    expect(cardScript).toContain("Using fallback parchment color");
  });
});

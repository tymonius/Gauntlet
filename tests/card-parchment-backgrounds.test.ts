import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parchmentCss = readFileSync("card-design/card-parchment.css", "utf8");
const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");
const cardScript = readFileSync("card-design/card-design.js", "utf8");

const factions = [
  "neutral",
  "military",
  "diplomats",
  "financiers",
  "intelligence",
  "mystics",
  "inquisition",
];

describe("card parchment backgrounds", () => {
  it("loads one separate full-resolution source per faction", () => {
    expect(refinementCss).toContain('@import url("card-parchment.css");');

    for (const faction of factions) {
      const path = `images/artwork/card-backgrounds/${faction}.webp.b64`;
      expect(existsSync(path)).toBe(true);
      expect(cardScript).toContain(`../${path}`);
    }

    expect(cardScript).toContain("const PARCHMENT_SOURCES");
    expect(cardScript).toContain("const parchmentPromises = new Map()");
    expect(cardScript).toContain("cache: 'force-cache'");
    expect(cardScript).toContain("card.dataset.parchmentSource = faction");
  });

  it("decodes the original bytes directly without raster processing", () => {
    expect(cardScript).toContain("window.atob");
    expect(cardScript).toContain("new Blob([bytes], { type: 'image/webp' })");
    expect(cardScript).toContain("URL.createObjectURL");

    for (const forbidden of [
      "PARCHMENT_PARTS",
      "PARCHMENT_FRAMES",
      "canvas",
      "drawImage",
      "getImageData",
      "putImageData",
      "toBlob",
      "normalizeParchmentContrast",
    ]) {
      expect(cardScript).not.toContain(forbidden);
    }
  });

  it("centers each source and scales it proportionally to cover the card", () => {
    expect(parchmentCss).toContain("background-color: var(--card-parchment);");
    expect(parchmentCss).toContain("background-image: var(--parchment-image);");
    expect(parchmentCss).toContain("background-position: center center;");
    expect(parchmentCss).toContain("background-size: cover;");
    expect(parchmentCss).toContain("background-repeat: no-repeat;");
    expect(parchmentCss).toContain(".card-interior::before");
    expect(parchmentCss).toContain("content: none;");
    expect(parchmentCss).not.toContain("mix-blend-mode");
    expect(parchmentCss).not.toContain("--parchment-opacity");
    expect(parchmentCss).not.toContain("filter:");
  });
});

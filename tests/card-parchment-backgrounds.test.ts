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
  it("uses the opaque loaded image as the card background with a color fallback", () => {
    expect(refinementCss).toContain('@import url("card-parchment.css");');
    expect(parchmentCss).toContain("background-color: var(--card-parchment);");
    expect(parchmentCss).toContain("background-image: var(--parchment-image);");
    expect(parchmentCss).toContain("background-size: 100% 100%;");
    expect(parchmentCss).toContain(".card-interior::before");
    expect(parchmentCss).toContain("content: none;");
    expect(parchmentCss).not.toContain("parchments.webp");
    expect(parchmentCss).not.toContain("--parchment-opacity");
    expect(parchmentCss).not.toContain("mix-blend-mode");
  });

  it.each(factions)("loads a separate higher-resolution %s source", faction => {
    const path = `images/artwork/card-backgrounds/${faction}.webp.b64`;
    expect(existsSync(path)).toBe(true);
    expect(cardScript).toContain(`../${path}`);
  });

  it("decodes each source once into a cached WebP object URL", () => {
    expect(cardScript).toContain("window.atob");
    expect(cardScript).toContain("new Blob([bytes], { type: 'image/webp' })");
    expect(cardScript).toContain("URL.createObjectURL");
    expect(cardScript).toContain("parchmentPromises");
    expect(cardScript).toContain("cache: 'force-cache'");
    expect(cardScript).toContain("Using fallback parchment color");
  });
});

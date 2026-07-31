import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parchmentCss = readFileSync("card-design/card-parchment.css", "utf8");
const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");
const cardScript = readFileSync("card-design/card-design.js", "utf8");

describe("card parchment backgrounds", () => {
  it("uses each opaque extracted panel as the card background with a color fallback", () => {
    expect(refinementCss).toContain('@import url("card-parchment.css");');
    expect(parchmentCss).toContain("background-color: var(--card-parchment);");
    expect(parchmentCss).toContain("background-image: var(--parchment-image);");
    expect(parchmentCss).toContain("background-size: 100% 100%;");
    expect(parchmentCss).toContain(".card-interior::before");
    expect(parchmentCss).toContain("content: none;");
    expect(parchmentCss).not.toContain("background-size: 300% 300%");
    expect(parchmentCss).not.toContain("--parchment-opacity");
    expect(parchmentCss).not.toContain("mix-blend-mode");
  });

  it("assembles the four grid chunks once", () => {
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
    expect(cardScript).toContain("cache: 'force-cache'");
  });

  it("extracts and caches one native-size panel per faction", () => {
    expect(cardScript).toContain("const PARCHMENT_FRAMES");
    expect(cardScript).toContain("const parchmentPanelPromises = new Map()");
    expect(cardScript).toContain("context.drawImage(");
    expect(cardScript).toContain("canvas.toBlob");
    expect(cardScript).toContain("URL.createObjectURL(panelBlob)");
    expect(cardScript).toContain("card.dataset.parchmentSource = faction");
    expect(cardScript).toContain("Using fallback parchment color for ${faction}");
  });

  it("normalizes weak line art without reducing opacity", () => {
    for (const entry of [
      "neutral: { column: 0, row: 0, contrast: 1.10 }",
      "military: { column: 1, row: 0, contrast: 1.40 }",
      "diplomats: { column: 2, row: 0, contrast: 1.50 }",
      "financiers: { column: 0, row: 1, contrast: 1.12 }",
      "intelligence: { column: 1, row: 1, contrast: 1.48 }",
      "mystics: { column: 2, row: 1, contrast: 1.42 }",
      "inquisition: { column: 0, row: 2, contrast: 1.00 }",
    ]) {
      expect(cardScript).toContain(entry);
    }

    expect(cardScript).toContain("normalizeParchmentContrast");
    expect(cardScript).toContain("context.getImageData");
    expect(cardScript).toContain("context.putImageData");
    expect(cardScript).not.toContain("opacity =");
  });
});

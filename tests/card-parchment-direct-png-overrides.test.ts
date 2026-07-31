import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parchmentCss = readFileSync("card-design/card-parchment.css", "utf8");

const directParchments = {
  financiers: "images/artwork/card-backgrounds/financiers-parchment-v2.png",
  mystics: "images/artwork/card-backgrounds/mystics-parchment-v2.png",
};

function pngDimensions(path: string) {
  const source = readFileSync(path);
  expect(source.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  expect(source.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return {
    width: source.readUInt32BE(16),
    height: source.readUInt32BE(20),
  };
}

describe("direct Financiers and Mystics card parchment sources", () => {
  it("keeps both uploaded PNG originals at full resolution", () => {
    for (const path of Object.values(directParchments)) {
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path).byteLength).toBeGreaterThan(150_000);
      expect(pngDimensions(path)).toEqual({ width: 1061, height: 1482 });
    }
  });

  it("applies the originals directly to every supported mockup selector", () => {
    expect(parchmentCss).toContain(
      '--parchment-image: url("../images/artwork/card-backgrounds/financiers-parchment-v2.png") !important;'
    );
    expect(parchmentCss).toContain(
      '--parchment-image: url("../images/artwork/card-backgrounds/mystics-parchment-v2.png") !important;'
    );

    for (const selector of [
      ".gauntlet-card.financier-card",
      ".gauntlet-card.financiers-card",
      ".gauntlet-card.faction-financiers",
      '.gauntlet-card[data-faction="financiers"]',
      ".gauntlet-card.mystic-card",
      ".gauntlet-card.mystics-card",
      ".gauntlet-card.faction-mystics",
      '.gauntlet-card[data-faction="mystics"]',
    ]) {
      expect(parchmentCss).toContain(selector);
    }
  });

  it("preserves centered proportional cover rendering without image processing", () => {
    expect(parchmentCss).toContain("background-position: center center;");
    expect(parchmentCss).toContain("background-size: cover;");
    expect(parchmentCss).toContain("background-repeat: no-repeat;");
    expect(parchmentCss).not.toContain("filter:");
    expect(parchmentCss).not.toContain("mix-blend-mode");
  });
});

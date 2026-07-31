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
] as const;

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

describe("card parchment backgrounds", () => {
  it("loads all seven full-resolution PNG originals directly", () => {
    expect(refinementCss).toContain('@import url("card-parchment.css");');

    for (const faction of factions) {
      const path = `images/artwork/card-backgrounds/${faction}-parchment-v2.png`;
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path).byteLength).toBeGreaterThan(50_000);
      const dimensions = pngDimensions(path);
      expect(dimensions.width).toBeGreaterThanOrEqual(1_000);
      expect(dimensions.height).toBeGreaterThanOrEqual(1_400);
      expect(cardScript).toContain(`${faction}: '../${path}'`);
    }
  });

  it("preloads direct image URLs and preserves renderer readiness metadata", () => {
    expect(cardScript).toContain("const PARCHMENT_SOURCES");
    expect(cardScript).toContain("function preloadParchment(sourcePath)");
    expect(cardScript).toContain("const image = new Image()");
    expect(cardScript).toContain("image.naturalWidth > 0");
    expect(cardScript).toContain("card.dataset.parchmentLoaded = 'true'");
    expect(cardScript).toContain("card.dataset.parchmentSource = faction");
    expect(cardScript).toContain("card.dataset.parchmentFallback = 'false'");
  });

  it("does not use legacy base64, multipart, Blob, object URL, or canvas processing", () => {
    for (const forbidden of [
      ".webp.b64",
      "uploaded.webp.b64",
      "window.atob",
      "new Blob",
      "URL.createObjectURL",
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

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parchmentCss = readFileSync("card-design/card-parchment.css", "utf8");
const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");
const cardScript = readFileSync("card-design/card-design.js", "utf8");

const unchangedSources = [
  "neutral",
  "military",
  "diplomats",
  "intelligence",
  "inquisition",
];

const uploadedMultipartSources = {
  financiers: ["00", "01", "02", "03"],
  mystics: ["00", "01"],
};

function decodeMultipartWebp(faction: keyof typeof uploadedMultipartSources) {
  const encoded = uploadedMultipartSources[faction]
    .map(part => readFileSync(
      `images/artwork/card-backgrounds/${faction}-uploaded.webp.b64.${part}`,
      "utf8"
    ).trim())
    .join("");

  return Buffer.from(encoded, "base64");
}

function webpDimensions(source: Buffer) {
  expect(source.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(source.subarray(8, 12).toString("ascii")).toBe("WEBP");

  const format = source.subarray(12, 16).toString("ascii");
  if (format === "VP8 ") {
    const payload = 20;
    expect(source.subarray(payload + 3, payload + 6)).toEqual(Buffer.from([0x9d, 0x01, 0x2a]));
    return {
      width: source.readUInt16LE(payload + 6) & 0x3fff,
      height: source.readUInt16LE(payload + 8) & 0x3fff,
    };
  }

  if (format === "VP8X") {
    return {
      width: 1 + source.readUIntLE(24, 3),
      height: 1 + source.readUIntLE(27, 3),
    };
  }

  if (format === "VP8L") {
    const packed = source.readUInt32LE(21);
    return {
      width: 1 + (packed & 0x3fff),
      height: 1 + ((packed >> 14) & 0x3fff),
    };
  }

  throw new Error(`Unsupported WebP payload: ${format}`);
}

function expectCompleteRiffContainer(source: Buffer) {
  expect(source.byteLength).toBeGreaterThanOrEqual(20);
  expect(source.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(source.subarray(8, 12).toString("ascii")).toBe("WEBP");

  // RIFF stores the complete file length minus its first eight bytes. This
  // detects missing or truncated transport chunks without assuming that a
  // valid, efficiently compressed full-resolution WebP must exceed an
  // arbitrary byte-size threshold.
  expect(source.readUInt32LE(4) + 8).toBe(source.byteLength);
}

describe("card parchment backgrounds", () => {
  it("loads the unchanged faction sources and the uploaded multipart replacements", () => {
    expect(refinementCss).toContain('@import url("card-parchment.css");');

    for (const faction of unchangedSources) {
      const path = `images/artwork/card-backgrounds/${faction}.webp.b64`;
      expect(existsSync(path)).toBe(true);
      expect(cardScript).toContain(`../${path}`);
    }

    for (const [faction, parts] of Object.entries(uploadedMultipartSources)) {
      for (const part of parts) {
        const path = `images/artwork/card-backgrounds/${faction}-uploaded.webp.b64.${part}`;
        expect(existsSync(path)).toBe(true);
        expect(cardScript).toContain(`../${path}`);
      }
    }

    expect(cardScript).toContain("const PARCHMENT_SOURCES");
    expect(cardScript).toContain("const parchmentPromises = new Map()");
    expect(cardScript).toContain("Array.isArray(configuredSources)");
    expect(cardScript).toContain("Promise.all(sources.map");
    expect(cardScript).toContain("parts.join('')");
    expect(cardScript).toContain("cache: 'force-cache'");
    expect(cardScript).toContain("card.dataset.parchmentSource = faction");
  });

  it("reconstructs complete full-resolution Financiers and Mystics WebPs", () => {
    for (const faction of Object.keys(uploadedMultipartSources) as Array<keyof typeof uploadedMultipartSources>) {
      const source = decodeMultipartWebp(faction);
      expectCompleteRiffContainer(source);
      expect(webpDimensions(source)).toEqual({ width: 1061, height: 1482 });
    }
  });

  it("decodes each complete source directly without card-sized raster processing", () => {
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

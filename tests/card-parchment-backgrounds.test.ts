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

const directFallbackDimensions = {
  financiers: { width: 480, height: 672 },
  mystics: { width: 640, height: 896 },
};

function decodeBase64File(path: string) {
  return Buffer.from(readFileSync(path, "utf8").replace(/\s+/g, ""), "base64");
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

function expectWebpSignature(source: Buffer) {
  expect(source.byteLength).toBeGreaterThanOrEqual(20);
  expect(source.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(source.subarray(8, 12).toString("ascii")).toBe("WEBP");
}

describe("card parchment backgrounds", () => {
  it("loads unchanged sources and retains the uploaded multipart candidates", () => {
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
      expect(cardScript).toContain(`fallback: '../images/artwork/card-backgrounds/${faction}.webp.b64'`);
    }

    expect(cardScript).toContain("const PARCHMENT_SOURCES");
    expect(cardScript).toContain("fetchParchmentParts");
    expect(cardScript).toContain("parts.join('')");
    expect(cardScript).toContain("cache: 'force-cache'");
    expect(cardScript).toContain("card.dataset.parchmentSource = faction");
    expect(cardScript).toContain("card.dataset.parchmentFallback = String(result.fallback)");
  });

  it("rejects headerless multipart payloads before creating image object URLs", () => {
    expect(cardScript).toContain("hasAsciiSignature(bytes, 0, 'RIFF')");
    expect(cardScript).toContain("hasAsciiSignature(bytes, 8, 'WEBP')");
    expect(cardScript).toContain("Invalid WebP parchment source: missing RIFF/WEBP signature.");
    expect(cardScript).toContain("catch(async primaryError");
    expect(cardScript).toContain("using the verified direct fallback");
  });

  it("keeps signed browser-decodable direct WebPs as deterministic fallbacks", () => {
    for (const [faction, dimensions] of Object.entries(directFallbackDimensions)) {
      const source = decodeBase64File(`images/artwork/card-backgrounds/${faction}.webp.b64`);
      expectWebpSignature(source);
      expect(webpDimensions(source)).toEqual(dimensions);
    }
  });

  it("decodes each selected source directly without card-sized raster processing", () => {
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

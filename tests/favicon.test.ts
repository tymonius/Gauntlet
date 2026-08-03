import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const favicon = readFileSync("favicon.ico");
const homepage = readFileSync("index.html", "utf8");

const pngAssets = [
  ["favicon-32.png", 32],
  ["favicon-192.png", 192],
  ["apple-touch-icon.png", 180]
] as const;

describe("temporary Gauntlet favicon", () => {
  it("uses one clean compatible BMP frame for the legacy ICO fallback", () => {
    expect(favicon.readUInt16LE(0)).toBe(0);
    expect(favicon.readUInt16LE(2)).toBe(1);
    expect(favicon.readUInt16LE(4)).toBe(1);

    const entryOffset = 6;
    const width = favicon[entryOffset] || 256;
    const height = favicon[entryOffset + 1] || 256;
    const imageSize = favicon.readUInt32LE(entryOffset + 8);
    const imageOffset = favicon.readUInt32LE(entryOffset + 12);

    expect([width, height]).toEqual([16, 16]);
    expect(imageOffset).toBe(22);
    expect(imageOffset + imageSize).toBe(favicon.length);
    expect(favicon.readUInt32LE(imageOffset)).toBe(40);
  });

  it.each(pngAssets)("ships %s at %d by %d pixels", (path, size) => {
    const png = readFileSync(path);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  });

  it("retains the cache-busted homepage favicon declaration", () => {
    expect(homepage).toContain(
      '<link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260802-2" sizes="any" />'
    );
  });
});

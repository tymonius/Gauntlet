import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const favicon = readFileSync("favicon.ico");
const homepage = readFileSync("index.html", "utf8");

describe("temporary Gauntlet favicon", () => {
  it("uses broadly compatible BMP frames inside the Windows icon container", () => {
    expect(favicon.readUInt16LE(0)).toBe(0);
    expect(favicon.readUInt16LE(2)).toBe(1);

    const imageCount = favicon.readUInt16LE(4);
    expect(imageCount).toBe(2);

    const sizes = Array.from({ length: imageCount }, (_, index) => {
      const entryOffset = 6 + index * 16;
      const width = favicon[entryOffset] || 256;
      const height = favicon[entryOffset + 1] || 256;
      const imageOffset = favicon.readUInt32LE(entryOffset + 12);

      expect(width).toBe(height);
      expect(favicon.readUInt32LE(imageOffset)).toBe(40);
      return width;
    });

    expect(sizes).toEqual([16, 32]);
  });

  it("declares a cache-busted favicon on the homepage", () => {
    expect(homepage).toContain(
      '<link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260802-2" sizes="any" />'
    );
  });
});

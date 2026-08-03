import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const favicon = readFileSync("favicon.ico");
const homepage = readFileSync("index.html", "utf8");

describe("temporary Gauntlet favicon", () => {
  it("is a multi-resolution Windows icon for the site-wide fallback path", () => {
    expect(favicon.readUInt16LE(0)).toBe(0);
    expect(favicon.readUInt16LE(2)).toBe(1);

    const imageCount = favicon.readUInt16LE(4);
    expect(imageCount).toBe(6);

    const sizes = Array.from({ length: imageCount }, (_, index) => {
      const width = favicon[6 + index * 16] || 256;
      const height = favicon[7 + index * 16] || 256;
      expect(width).toBe(height);
      return width;
    });

    expect(sizes).toEqual([16, 32, 48, 64, 128, 256]);
  });

  it("declares a cache-busted favicon on the homepage", () => {
    expect(homepage).toContain(
      '<link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260802-2" sizes="any" />'
    );
  });
});

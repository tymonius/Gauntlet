import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const favicon = readFileSync("favicon.ico");

const pngAssets = [
  ["favicon-32.png", 32],
  ["favicon-192.png", 192],
  ["apple-touch-icon.png", 180]
] as const;

const faviconLinks = [
  '<link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />',
  '<link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />'
] as const;

const ignoredDirectories = new Set([
  ".git",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules"
]);

function collectHtmlFiles(directory = "."): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(entryPath.replaceAll(path.sep, "/"));
    }
  }

  return files;
}

const completeHtmlPages = collectHtmlFiles().filter((file) => {
  const html = readFileSync(file, "utf8");
  return /<head\b[^>]*>[\s\S]*?<\/head>/i.test(html);
});

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

  it.each(pngAssets)("ships %s at %d by %d pixels", (assetPath, size) => {
    const png = readFileSync(assetPath);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  });

  it.each(completeHtmlPages)("declares the site favicon in %s", (pagePath) => {
    const html = readFileSync(pagePath, "utf8");
    for (const link of faviconLinks) {
      expect(html).toContain(link);
    }
  });
});

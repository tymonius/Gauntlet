import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Integrity repeated action names", () => {
  const source = readFileSync("playtest/analysis/integrity/app.js", "utf8");

  it("adds record context to exclusion controls", () => {
    expect(source).toContain('aria-label="${escapeAttribute(`Exclude response — ${game.sheetSerial}');
    expect(source).toContain('aria-label="${escapeAttribute(`Exclude entire game — ${game.sheetSerial}`)}"');
  });

  it("adds record context to restore controls", () => {
    expect(source).toContain('aria-label="${escapeAttribute(`Restore record — ${title}`)}"');
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Mystics Rite action labels", () => {
  const source = readFileSync("deckbuilder/mystics-rites.js", "utf8");

  it("names repeated choose/remove buttons with the Rite", () => {
    expect(source).toContain('aria-label="${selected ? "Remove" : "Choose"} ${escapeHtml(rite.name)}"');
  });

  it("names selected-list remove buttons with the Rite", () => {
    expect(source).toContain('aria-label="Remove ${escapeHtml(rite.name)}"');
  });
});

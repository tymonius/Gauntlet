import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Deckbuilder Territory action labels", () => {
  it("names repeated choose/remove buttons with the Territory", () => {
    const app = readFileSync("deckbuilder/territories.js", "utf8");
    expect(app).toContain('aria-label="${selected ? "Remove" : "Choose"} ${escapeHtml(territory.name)}"');
  });
});

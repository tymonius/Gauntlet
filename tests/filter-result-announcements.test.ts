import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("filter result announcements", () => {
  it("announces Card Reference match count changes", () => {
    const html = readFileSync("card-reference/index.html", "utf8");
    expect(html).toContain('<h2 aria-live="polite" aria-atomic="true"><span id="resultCount">0</span> matches</h2>');
  });

  it("announces Deckbuilder card and Territory count changes with context", () => {
    const html = readFileSync("deckbuilder/index.html", "utf8");
    expect(html).toContain('id="availableCount" class="pill" role="status" aria-live="polite" aria-atomic="true" aria-label="Available cards"');
    expect(html).toContain('id="territoryAvailableCount" class="pill" role="status" aria-live="polite" aria-atomic="true" aria-label="Available Territories"');
  });
});

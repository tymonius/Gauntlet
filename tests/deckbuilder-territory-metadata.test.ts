import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const territories = readFileSync("deckbuilder/territories.js", "utf8");

describe("Deckbuilder Territory metadata", () => {
  it("does not expose the retired complexity concept", () => {
    expect(territories).not.toContain("territory.complexity");
    expect(territories).not.toContain('complexity: territory.complexity');
    expect(territories).not.toContain('${escapeHtml(territory.complexity)}');
  });

  it("keeps useful Territory classification metadata", () => {
    expect(territories).toContain('${territory.arena ? "Arena" : "Territory"}');
    expect(territories).toContain("territory.watchlist");
  });
});

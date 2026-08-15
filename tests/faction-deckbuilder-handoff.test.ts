import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const factionIds = ["military", "diplomats", "financiers", "intelligence", "mystics", "inquisition"];
const app = readFileSync("deckbuilder/app.js", "utf8");

describe("faction guide to Deckbuilder handoff", () => {
  it("passes the current faction through every Deckbuilder link on each faction guide", () => {
    for (const faction of factionIds) {
      const html = readFileSync(`factions/${faction}/index.html`, "utf8");
      expect(html).toContain(`../../deckbuilder/?faction=${faction}`);
      expect(html).not.toContain('href="../../deckbuilder/"');
    }
  });

  it("applies a valid faction query before initial Deckbuilder rendering", () => {
    expect(app).toContain("applyUrlSelection();");
    expect(app).toContain('const requestedFactionId = String(params.get("faction") || "").trim();');
    expect(app).toContain('const requestedLeaderId = String(params.get("leader") || "").trim();');
    expect(app).toContain("state.factionId = faction.id;");
    expect(app).toContain('state.leaderId = leader?.id || faction.leaders[0]?.id || "";');
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const factionIds = ["military", "diplomats", "financiers", "intelligence", "mystics", "inquisition"];
const handoff = readFileSync("deckbuilder/starter-handoff.js", "utf8");

describe("faction guide to Deckbuilder handoff", () => {
  it("passes the current faction through every Deckbuilder link on each faction guide", () => {
    for (const faction of factionIds) {
      const html = readFileSync(`factions/${faction}/index.html`, "utf8");
      expect(html).toContain(`../../deckbuilder/?faction=${faction}`);
      expect(html).not.toContain('href="../../deckbuilder/"');
    }
  });

  it("applies a valid faction query before the Deckbuilder initializes", () => {
    expect(handoff).toContain('const factionId = String(params.get("faction") || "").trim();');
    expect(handoff).toContain('const leaderId = String(params.get("leader") || "").trim();');
    expect(handoff).toContain("state.factionId = faction.id;");
    expect(handoff).toContain('state.leaderId = requestedLeader?.id || faction.leaders[0]?.id || "";');
    expect(handoff.indexOf('if (faction) {')).toBeLessThan(handoff.indexOf('if (params.get("starter") !== "1") return;'));
  });
});
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const territories = readFileSync("deckbuilder/territories.js", "utf8");
const rites = readFileSync("deckbuilder/mystics-rites.js", "utf8");

describe("Deckbuilder supplemental component focus", () => {
  it("restores focus after Territory choose/remove rerenders", () => {
    expect(territories).toContain("row.dataset.territoryId = territory.id;");
    expect(territories).toContain("function restoreTerritoryFocus(id, target)");
    expect(territories).toContain('toggleTerritory(territory.id, "picker")');
    expect(territories).toContain('toggleTerritory(territory.id, "preview")');
    expect(territories).toContain("if (focusTarget) restoreTerritoryFocus(id, focusTarget);");
  });

  it("restores focus after Rite choose/remove rerenders", () => {
    expect(rites).toContain("row.dataset.riteId = rite.id;");
    expect(rites).toContain("function restoreRiteFocus(id, target)");
    expect(rites).toContain('toggleRite(rite.id, "picker")');
    expect(rites).toContain('toggleRite(rite.id, "preview")');
    expect(rites).toContain("if (focusTarget) restoreRiteFocus(id, focusTarget);");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = JSON.parse(readFileSync("docs/v0.6.4-territories.json", "utf8"));
const baseline = JSON.parse(
  readFileSync(
    "artifacts/reconstruction/clean-v0.6.3/complete-authority/territories.json",
    "utf8",
  ),
);

describe("v0.6.4 Territory candidate source", () => {
  it("pins the approved issue #738 candidate", () => {
    expect(source.version).toBe("v0.6.4-candidate");
    expect(source.base_version).toBe("v0.6.3");
    expect(source.source_issue).toBe(738);
    expect(source.mechanics_changed).toBe(true);
    expect(source.count).toBe(25);
    expect(source.territories).toHaveLength(25);
  });

  it("preserves stable Territory identity from the v0.6.3 reconstruction", () => {
    expect(baseline.territories).toHaveLength(25);

    for (let index = 0; index < source.territories.length; index += 1) {
      const candidate = source.territories[index];
      const current = baseline.territories[index];

      expect(candidate.id).toBe(current.id);
      expect(candidate.number).toBe(current.number);
      expect(candidate.name).toBe(current.name);
      expect(candidate.arena).toBe(current.arena);
      expect(candidate.type).toBe(current.type);
    }
  });

  it("keeps each player-facing text field synchronized with its effect text", () => {
    for (const territory of source.territories) {
      expect(territory.effects).toEqual([
        {
          label: "Text",
          text: territory.text,
        },
      ]);
    }
  });

  it("keeps the approved Arena compression", () => {
    const arenas = source.territories.filter((territory: { arena: boolean }) => territory.arena);
    expect(arenas).toHaveLength(4);

    for (const arena of arenas) {
      expect(arena.text).toContain("Defensive Edge does not apply.");
      expect(arena.text).not.toContain("Tiebreak Roll");
      expect(arena.text).not.toContain("If battle totals remain tied");
    }
  });

  it("keeps the approved Occupation terminology repairs", () => {
    const byName = new Map(
      source.territories.map((territory: { name: string; text: string }) => [territory.name, territory.text]),
    );

    expect(byName.get("Disrupted Supply Lines")).toBe(
      "While a player is here, only 1 of their Assets can be active. They choose which.",
    );
    expect(byName.get("Ruined Storehouse")).toContain("a player here");
    expect(byName.get("Insurgency")).toContain("in Occupation here");
    expect(byName.get("Exposed Flank")).toContain("the occupier");
    expect(byName.get("Smuggler's Run")).not.toContain("occupying and controlling");
  });
});

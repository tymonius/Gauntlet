import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const factionGuideRoot = "releases/v0.6.1/faction-guides";
const factionGuides = readdirSync(factionGuideRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) =>
    readdirSync(join(factionGuideRoot, entry.name))
      .filter((name) => name.endsWith(".md"))
      .map((name) => join(factionGuideRoot, entry.name, name))
  );

const playerFacingSources = [
  "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
  "docs/Gauntlet_v0.6.1_Territory_Pool.md",
  "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
  ...factionGuides,
];

const combined = playerFacingSources
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

describe("player-facing terminology", () => {
  it("does not classify cards as Action cards", () => {
    expect(combined).not.toMatch(/\bAction cards?\b/i);
  });

  it("describes Purge through use of Action Opportunities, not performance", () => {
    expect(combined).not.toMatch(/\bPurge may be performed\b/i);
  });
});

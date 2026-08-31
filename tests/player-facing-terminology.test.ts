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

const governingSources = [
  "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
  "docs/Gauntlet_v0.6.1_Territory_Pool.md",
  "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
  ...factionGuides,
];

const publicRulesSources = [
  "start/index.html",
  "playtest/onboarding/index.html",
  "playtest/player-mat/index.html",
  "v0.6.2/print/player-mat.html",
  "factions/inquisition/index.html",
  "factions/intelligence/index.html",
  "factions/financiers/index.html",
  "factions/mystics/index.html",
  "start/app.js",
  "deckbuilder/app.js",
  "deckbuilder/starter-decks.json",
  "deckbuilder/faction-components.js",
  "deckbuilder/print.js",
  "faction-sheets/v061-runtime.js",
  "faction-sheets/v061-release-runtime.js",
];

const readCombined = (paths: string[]) =>
  paths.map((path) => readFileSync(path, "utf8")).join("\n");

const governingCombined = readCombined(governingSources);
const publicCombined = readCombined(publicRulesSources);

describe("player-facing terminology", () => {
  it("does not classify cards as Action cards in governing sources", () => {
    expect(governingCombined).not.toMatch(/\bAction cards?\b/i);
  });

  it("describes Purge through use of Action Opportunities, not performance", () => {
    expect(governingCombined).not.toMatch(/\bPurge may be performed\b/i);
  });

  it("distinguishes Action costs from Action Opportunity timing in governing sources", () => {
    expect(governingCombined).not.toMatch(/without using (?:another |an )?Action Opportunit(?:y|ies)/i);
    expect(governingCombined).not.toMatch(/(?:uses|using) (?:one|an) Action Opportunity/i);
    expect(governingCombined).toMatch(/No more than 1 Action may be spent during the same Action Opportunity/i);
  });

  it("keeps independent website and printable-reference copy on the same model", () => {
    expect(publicCombined).not.toMatch(/without using (?:the |an |another )?Action Opportunit(?:y|ies)/i);
    expect(publicCombined).not.toMatch(/without an Action Opportunity/i);
    expect(publicCombined).not.toMatch(/instead of playing (?:an Action|a card for its Action effect, spend Conviction)/i);
    expect(publicCombined).not.toMatch(/\bdeckbuilding value\b/i);
    expect(publicCombined).not.toContain("One normal Action Opportunity");
    expect(publicCombined).not.toContain("after card destinations");

    expect(publicCombined).toContain("1 Action · two normal Action Opportunities");
    expect(publicCombined).toContain("The first Action spent to Purge each turn grants 1 additional Action");
    expect(publicCombined).toContain("Financial Capacity");
    expect(publicCombined).toContain("without spending an Action");
    expect(publicCombined).toContain("value is at least 1 plus your completed Rites");
    expect(publicCombined).toContain("If a Rite or Ritual binding ends without another instruction");
    expect(publicCombined).toContain("Supplemental reference — not a Playable Deck card");
  });
});

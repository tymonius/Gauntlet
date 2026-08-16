import { expect, test } from "vitest";
import {
  buildRulesCorpus,
  defaultSourceUrls,
  parseRulebookSections,
  retrieveRules
} from "./local-search.js";

const rulebook = `# GAUNTLET

# 4. Turn Structure

## Movement

Advance, hold, or withdraw. Entering an occupied position begins a battle.

## Capture

At the start of the turn, if the active player occupies a Territory they do not control, they capture it.

# 6. Battles

## How it works

A Gambit is set from Hand and normally goes to the Graveyard. A Tactic is chosen from Reserve and normally goes to the Discard Pile.

## Complete rules

A battle begins when a player enters a position occupied by the opponent. Resolve opening effects, set Gambits, form Reserves, reveal Gambits, choose Tactics, reveal Tactics, resolve the battle, then resolve the Aftermath.
`;

const canonicalData = {
  version: "v0.6.1",
  name: "First Playtest Revision",
  cards: [
    {
      id: "military-onward",
      name: "Onward",
      allegiance: "Military",
      cost: 1,
      action: "During Movement, before a battle begins, move one additional position. This movement may start a battle.",
      source: "releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md"
    },
    {
      id: "intelligence-disinformation",
      name: "Disinformation",
      allegiance: "Intelligence",
      cost: 2,
      gambit: "When Gambits are revealed, if the opponent also set a Gambit, gain advantage. During the Aftermath, return this to Hand instead of the Graveyard.",
      source: "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md"
    }
  ],
  territories: [
    {
      id: "territory-command-tent",
      name: "Command Tent",
      text: "Its occupying controller may play an Action card both before and after movement that turn.",
      source: "docs/Gauntlet_v0.6.1_Territory_Pool.md"
    }
  ]
};

test("uses v0.6.3 canonical source URLs by default", () => {
  const urls = defaultSourceUrls("https://example.test");
  expect(urls.canonicalDataUrl).toContain("releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json");
  expect(urls.rulebookUrl).toContain("releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md");
  expect(urls.rulebookPdfUrl).toContain("releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.pdf");
  expect(urls.rulebookBrowserUrl).toBe("https://example.test/rulebook/");
});

test("parses layered markdown into titled rulebook sections", () => {
  const sections = parseRulebookSections(rulebook, "https://example.test/rulebook/");
  const howItWorks = sections.find((section) => section.title.includes("How it works"));
  expect(howItWorks).toBeDefined();
  expect(howItWorks.sourceUrl).toBe("https://example.test/rulebook/#how-it-works");
  expect(sections.some((section) => section.body.includes("occupied position"))).toBe(true);
});

test("matches duplicate browser-rulebook heading anchors", () => {
  const repeatedHeadings = `# First chapter

## Timing

First timing rule.

# Second chapter

## Timing

Second timing rule.
`;
  const sections = parseRulebookSections(repeatedHeadings, "https://example.test/rulebook/");
  const timingUrls = sections
    .filter((section) => section.heading === "Timing")
    .map((section) => section.sourceUrl);
  expect(timingUrls).toEqual([
    "https://example.test/rulebook/#timing",
    "https://example.test/rulebook/#timing-2"
  ]);
});

test("ranks an exact card title above generic movement text", () => {
  const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown: rulebook });
  const results = retrieveRules(corpus, "Can Onward be used after a battle?", { limit: 4 });
  expect(results[0].title).toMatch(/Onward/i);
});

test("finds Gambit and Tactic destinations", () => {
  const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown: rulebook });
  const results = retrieveRules(corpus, "Where do Gambits and Tactics go?", { limit: 4 });
  expect(results.some((result) => /Gambit|Battle/i.test(result.title + result.excerpt))).toBe(true);
  expect(results.some((result) => result.excerpt.includes("Graveyard"))).toBe(true);
  expect(results.some((result) => result.excerpt.includes("Discard Pile"))).toBe(true);
});

test("indexes canonical Gambit text", () => {
  const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown: rulebook });
  const results = retrieveRules(corpus, "What does Disinformation do as a Gambit?", { limit: 3 });
  expect(results[0].title).toMatch(/Disinformation/i);
});

test("finds capture timing in the rulebook", () => {
  const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown: rulebook });
  const results = retrieveRules(corpus, "When is an occupied Territory captured?", { limit: 4 });
  const capture = results.find((result) => result.title.includes("Capture"));
  expect(capture).toBeDefined();
  expect(capture.sourceUrl).toBe("https://gauntlet.run/rulebook/#capture");
  expect(capture.sourceUrl).not.toContain(".pdf");
});

test("indexes canonical Territory text", () => {
  const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown: rulebook });
  const results = retrieveRules(corpus, "What does Command Tent do?", { limit: 3 });
  expect(results[0].title).toMatch(/Command Tent/i);
});

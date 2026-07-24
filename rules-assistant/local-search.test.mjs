import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRulesCorpus,
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

A battle begins when a player enters a position occupied by the opponent.
`;

const canonicalData = {
  version: "v0.6.0",
  name: "Faction Framework Release",
  cards: [
    {
      id: "military-onward",
      name: "Onward",
      allegiance: "Military",
      cost: 1,
      action: "Move one additional position this turn. It may initiate a battle.",
      source: "releases/v0.6.0/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md"
    },
    {
      id: "military-rout",
      name: "Rout",
      allegiance: "Military",
      cost: 1,
      battle: "After you win a battle you initiated, move one position toward the opponent's end.",
      source: "releases/v0.6.0/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md"
    }
  ],
  territories: [
    {
      id: "territory-command-tent",
      name: "Command Tent",
      text: "A player may use both normal Action Opportunities.",
      source: "docs/Gauntlet_v0.6_Territory_Pool.md"
    }
  ]
};

test("parses markdown into titled rulebook sections", () => {
  const sections = parseRulebookSections(rulebook, "https://example.test/rulebook.pdf");
  assert.ok(sections.some((section) => section.title.includes("Movement")));
  assert.ok(sections.some((section) => section.body.includes("occupied position")));
});

test("ranks an exact card title above generic movement text", () => {
  const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown: rulebook });
  const results = retrieveRules(corpus, "Can Onward be used after a battle?", { limit: 4 });
  assert.match(results[0].title, /Onward/i);
});

test("finds capture timing in the rulebook", () => {
  const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown: rulebook });
  const results = retrieveRules(corpus, "When is an occupied Territory captured?", { limit: 4 });
  assert.ok(results.some((result) => result.title.includes("Capture")));
});

test("indexes canonical Territory text", () => {
  const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown: rulebook });
  const results = retrieveRules(corpus, "What does Command Tent do?", { limit: 3 });
  assert.match(results[0].title, /Command Tent/i);
});

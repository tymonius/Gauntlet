import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildRulesCorpus } from "./local-search.js";
import { retrieveRulesForQuestion } from "./worker-v061.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md", import.meta.url),
  "utf8"
);
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown });

function combinedText(results) {
  return results.map((result) => `${result.title}\n${result.excerpt}`).join("\n\n");
}

test("game-night regression: starting-hand questions retrieve Setup instead of the normal turn draw", () => {
  for (const question of [
    "How many cards do I draw to start?",
    "How big is your starting hand?"
  ]) {
    const text = combinedText(retrieveRulesForQuestion(corpus, question));
    expect(text).toMatch(/3\. Setup/i);
    expect(text).toMatch(/draws three cards/i);
  }
});

test("game-night regression: general played-Action destinations retrieve the shared Action rule", () => {
  const text = combinedText(retrieveRulesForQuestion(
    corpus,
    "When does a card go to the discard after being played?"
  ));
  expect(text).toMatch(/Actions and Assets/i);
  expect(text).toMatch(/put it in the Discard Pile/i);
});

test("game-night regression: a Ritual follow-up retains the immediately preceding subject", () => {
  const history = [
    {
      role: "user",
      content: "How do I complete the Ritual of Ascendance?"
    },
    {
      role: "assistant",
      content: "Bind three Arcane cards from different zones, initiate a battle while they remain bound, and win that battle."
    }
  ];
  const text = combinedText(retrieveRulesForQuestion(
    corpus,
    "What benefit does this give me?",
    history
  ));
  expect(text).toMatch(/Ritual of Ascendance/i);
  expect(text).toMatch(/win/i);
});

test("game-night regression: Transmutation retrieves the shared Mystics ability even for Spirit Walker", () => {
  const text = combinedText(retrieveRulesForQuestion(
    corpus,
    "I am a Spirit Walker. How do I do Transmutation?"
  ));
  expect(text).toMatch(/Transmutation/i);
  expect(text).toMatch(/before dice are rolled/i);
  expect(text).toMatch(/put one card from your Hand in your Graveyard/i);
});

test("game-night regression: fifth-Proposal victory retrieves exact Peace Treaty timing", () => {
  const text = combinedText(retrieveRulesForQuestion(
    corpus,
    "I just ratified my fifth proposal. Do I win immediately, or at the start of my next turn?"
  ));
  expect(text).toMatch(/Peace Treaty/i);
  expect(text).toMatch(/after the Capture step and before the Draw step/i);
});

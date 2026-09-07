import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { augmentRetrievalForContext, contextualQuery } from "./worker-v071.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url),
  "utf8"
);

const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run",
  rulebookBrowserUrl: "https://gauntlet.run/rulebook/",
  canonicalDataUrl: "https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json"
});

function sourcesFor(question, history = []) {
  const retrievalQuery = contextualQuery(question, history);
  const raw = retrieveRules(corpus, retrievalQuery, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

function hasFirstPlayerTieRule(source) {
  return String(source?.body || "").includes("Reroll ties.");
}

describe("v0.7.1 setup first-player authority retrieval", () => {
  test("retrieves the explicit reroll rule for the reviewed tied-opening-roll question", () => {
    const sources = sourcesFor("We tied the initial roll to see who goes first. Does one of us choose, or do we roll again?");
    expect(sources.slice(0, 3).some(hasFirstPlayerTieRule)).toBe(true);
  });

  test("retrieves the same rule from natural first-player tie paraphrases", () => {
    for (const question of [
      "What happens if we tie the roll for first player?",
      "Who goes first if the opening roll is tied?",
      "We rolled the same number when deciding who starts. What do we do?"
    ]) {
      const sources = sourcesFor(question);
      expect(sources.some(hasFirstPlayerTieRule), question).toBe(true);
    }
  });

  test("preserves setup authority on a genuinely elliptical follow-up", () => {
    const history = [
      { role: "user", content: "We tied the roll to determine the first player." },
      { role: "assistant", content: "The higher roll takes the first turn." }
    ];
    const sources = sourcesFor("Then what?", history);
    expect(sources.some(hasFirstPlayerTieRule)).toBe(true);
  });

  test("does not drag setup authority into an unrelated topic pivot", () => {
    const history = [
      { role: "user", content: "We tied the roll to determine the first player." },
      { role: "assistant", content: "The higher roll takes the first turn." }
    ];
    const sources = sourcesFor("How much does my Deed cost?", history);
    expect(sources.slice(0, 3).some(hasFirstPlayerTieRule)).toBe(false);
  });
});

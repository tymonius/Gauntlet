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

const setupProcedureId = "rulebook:complete-rules-2";

function sourcesFor(question, history = []) {
  const retrievalQuery = contextualQuery(question, history);
  const raw = retrieveRules(corpus, retrievalQuery, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

function expectOpeningHandProcedure(question) {
  const sources = sourcesFor(question);
  const topThree = sources.slice(0, 3);
  expect(topThree.map((source) => source.canonicalId), question).toContain(setupProcedureId);

  const setup = topThree.find((source) => source.canonicalId === setupProcedureId);
  expect(String(setup?.body || ""), question).toContain("Draw four cards");
  expect(String(setup?.body || ""), question).toContain("The other three cards form your opening Hand");
}

describe("v0.7.1 setup opening-Hand retrieval", () => {
  test("retrieves the setup procedure for both reviewed opening-Hand failures", () => {
    expectOpeningHandProcedure("How many cards do I draw to start?");
    expectOpeningHandProcedure("How big is your starting hand?");
  });

  test("retrieves the same procedure from natural setup paraphrases", () => {
    for (const question of [
      "How many cards are in my opening hand?",
      "During setup, how many cards do I draw and which ones do I keep?",
      "How many cards do I begin with?"
    ]) {
      expectOpeningHandProcedure(question);
    }
  });

  test("does not confuse the normal turn draw with the opening Hand", () => {
    const sources = sourcesFor("How many cards do I draw on my turn?");
    expect(sources[0]?.canonicalId).toBe("rulebook:draw");
    expect(sources[0]?.canonicalId).not.toBe(setupProcedureId);
  });

  test("does not drag generic setup authority into Intelligence Mission startup", () => {
    const sources = sourcesFor("How does starting a Mission work?");
    expect(sources[0]?.canonicalId).toBe("rulebook:starting-a-mission");
    expect(sources[0]?.canonicalId).not.toBe(setupProcedureId);
  });
});

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

function sourcesFor(question) {
  const query = contextualQuery(question, []);
  const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1500 });
  return augmentRetrievalForContext(corpus, question, [], raw);
}

function expectDefensiveEdgeFirst(question) {
  const sources = sourcesFor(question);
  expect(sources[0]?.canonicalId, question).toBe("rulebook:defensive-edge");
  const body = String(sources[0]?.body || "");
  expect(body, question).toContain("wins tied battle totals");
  expect(body, question).toContain("controls the contested Territory");
  expect(body, question).toContain("making a Last Stand");
  expect(body, question).toContain("does not have it merely because they are the defender");
}

describe("v0.7.1 legacy defender-advantage retrieval", () => {
  test("maps the reviewed legacy wording to current Defensive Edge authority", () => {
    expectDefensiveEdgeFirst("How does defender advantage work?");
  });

  test("handles common legacy variants", () => {
    for (const question of [
      "How does defender's advantage work?",
      "What is defender advantage?",
      "How does defensive advantage work?"
    ]) {
      expectDefensiveEdgeFirst(question);
    }
  });

  test("modern Defensive Edge wording remains direct", () => {
    expectDefensiveEdgeFirst("How does Defensive Edge work?");
  });

  test("does not hijack ordinary dice Advantage questions", () => {
    for (const question of [
      "How does advantage work?",
      "What does double advantage do?"
    ]) {
      expect(sourcesFor(question)[0]?.canonicalId, question).toBe("rulebook:advantage-and-disadvantage");
    }
  });
});

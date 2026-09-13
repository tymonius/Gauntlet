import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { BEHAVIOR_REVISION, augmentRetrievalForContext, contextualQuery } from "./worker-v071.js";
import { V071_CANONICAL_SOURCE_PATH, V071_RULEBOOK_SOURCE_PATH } from "./v071-public-corpus.js";

const canonicalData = JSON.parse(readFileSync(V071_CANONICAL_SOURCE_PATH, "utf8"));
const rulebookMarkdown = readFileSync(V071_RULEBOOK_SOURCE_PATH, "utf8");
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown, siteOrigin: "https://gauntlet.run" });

function sourcesFor(question) {
  const query = contextualQuery(question, []);
  const raw = retrieveRules(corpus, query, { limit: 12, excerptLength: 2200 });
  return augmentRetrievalForContext(corpus, question, [], raw);
}

const reviewedQuestion = "Can a player replace an asset in their bank with one in their hand";

describe("v0.7.1 Asset replacement review", () => {
  test("the reviewed simple replacement wording promotes the direct current authority", () => {
    const sources = sourcesFor(reviewedQuestion);
    expect(sources.slice(0, 4).map((source) => source.canonicalId)).toContain("rulebook:replacing-an-asset");

    const rule = sources.find((source) => source.canonicalId === "rulebook:replacing-an-asset");
    const body = String(rule?.body || "");
    expect(body).toContain("When banking an Asset at the Asset limit, the player may discard one Asset they control to make room and bank the new Asset as part of the same effect.");
    expect(body).toContain("This replacement is not a separate Action.");
  });

  test("banked-Asset and make-room paraphrases promote the replacement rule", () => {
    for (const question of [
      "Can I replace one of my banked Assets with an Asset from my Hand?",
      "I am at my Asset limit. Can I discard an Asset to make room and bank a new one from Hand?"
    ]) {
      expect(sourcesFor(question).slice(0, 4).map((source) => source.canonicalId), question)
        .toContain("rulebook:replacing-an-asset");
    }
  });

  test("unrelated card replacement language does not promote the Asset replacement rule", () => {
    const ids = sourcesFor("Can I replace a Tactic with another card during battle?")
      .slice(0, 4)
      .map((source) => source.canonicalId);
    expect(ids).not.toContain("rulebook:replacing-an-asset");
  });

  test("the behavior revision records the retrieval change", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260913-9");
  });
});

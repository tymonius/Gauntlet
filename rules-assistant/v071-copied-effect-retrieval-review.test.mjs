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

const reviewedQuestion = "I reveal Heresy as a Tactic and spend 4 Conviction to apply the Tactic effect of an opponent's Rend the Veil in their Graveyard. Rend the Veil says to choose a card in your Graveyard. Whose Graveyard supplies that second card, and does the opponent's Rend the Veil card move?";

describe("v0.7.1 copied-effect retrieval review", () => {
  test("the reviewed Heresy/Rend the Veil question retrieves the shared copied-effect authority", () => {
    const sources = sourcesFor(reviewedQuestion);
    const ids = sources.slice(0, 4).map((source) => source.canonicalId);
    expect(ids).toContain("card:inquisition-heresy");
    expect(ids).toContain("card:mystics-rend-the-veil");
    expect(ids).toContain("rulebook:applying-and-repeating-another-effect");

    const rule = sources.find((source) => source.canonicalId === "rulebook:applying-and-repeating-another-effect");
    const body = String(rule?.body || "");
    expect(body).toContain("The player instructed to apply or repeat the effect controls that application.");
    expect(body).toContain("Make all choices again and pay all costs again for each new application.");
    expect(body).toContain("Applying another card's effect does not play, set, choose, or otherwise move the source card unless the instruction expressly says so. The source card remains in its current zone.");
  });

  test("card-name-heavy copied-effect phrasing still retrieves the shared rule", () => {
    const sources = sourcesFor("If I use Heresy to apply an opponent's Rend the Veil from their Graveyard, whose Graveyard does 'your Graveyard' mean, and does Rend the Veil move?");
    expect(sources.slice(0, 4).map((source) => source.canonicalId)).toContain("rulebook:applying-and-repeating-another-effect");
  });

  test("generic source-card movement questions promote the copied-effect rule", () => {
    const sources = sourcesFor("Can I apply an opponent's card from their Graveyard without moving that source card?");
    expect(sources[0]?.canonicalId).toBe("rulebook:applying-and-repeating-another-effect");
  });

  test("the behavior revision records the retrieval change", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260910-2");
  });
});

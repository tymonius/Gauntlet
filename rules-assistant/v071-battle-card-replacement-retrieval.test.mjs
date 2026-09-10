import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { augmentRetrievalForContext, contextualQuery } from "./worker-v071.js";
import { V071_CANONICAL_SOURCE_PATH, V071_RULEBOOK_SOURCE_PATH } from "./v071-public-corpus.js";

const canonicalData = JSON.parse(readFileSync(V071_CANONICAL_SOURCE_PATH, "utf8"));
const rulebookMarkdown = readFileSync(V071_RULEBOOK_SOURCE_PATH, "utf8");
const workerSource = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown, siteOrigin: "https://gauntlet.run" });

function sourcesFor(question, history = []) {
  const query = contextualQuery(question, history);
  const raw = retrieveRules(corpus, query, { limit: 12, excerptLength: 2200 });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

const reviewedQuestion = "Operational Reassessment is my Gambit. After Tactics are revealed, I replace it with an eligible Battle card from my Hand. What happens to both cards?";
const followUp = "Can that replacement apply a Gambit effect whose reveal timing has already passed?";
const history = [
  { role: "user", content: reviewedQuestion },
  { role: "assistant", content: "Operational Reassessment goes to your Graveyard; the replacement remains the Gambit." }
];

describe("v0.7.1 battle-card replacement retrieval", () => {
  test("the exact Operational Reassessment question gets card, replacement, and clearing authority in order", () => {
    const sources = sourcesFor(reviewedQuestion);
    expect(sources.slice(0, 3).map((source) => source.canonicalId)).toEqual([
      "card:intelligence-operational-reassessment",
      "rulebook:replacing-a-gambit-or-tactic",
      "rulebook:clearing-battle-cards"
    ]);
    expect(String(sources[0]?.body || "")).toContain("If you replace it, put this card in your Graveyard.");
    expect(String(sources[1]?.body || "")).toContain("A replacement takes the same role as the card it replaces.");
    expect(String(sources[1]?.body || "")).toContain("Replacing a card does not reopen an earlier timing window.");
    expect(String(sources[1]?.body || "")).toContain("Only effects whose timing is still available and that have not already been applied may apply after the replacement.");
    expect(String(sources[2]?.body || "")).toContain("Gambits go to their owners' Graveyards");
  });

  test("the reviewed passed-timing follow-up promotes replacement authority with and without conversation history", () => {
    expect(sourcesFor(followUp)[0]?.canonicalId).toBe("rulebook:replacing-a-gambit-or-tactic");
    expect(sourcesFor(followUp, history)[0]?.canonicalId).toBe("rulebook:replacing-a-gambit-or-tactic");
  });

  test("generic battle-card replacement wording is covered without hijacking Asset replacement", () => {
    expect(sourcesFor("If I replace a Gambit with another Battle card, does the new card keep the Gambit role?")[0]?.canonicalId)
      .toBe("rulebook:replacing-a-gambit-or-tactic");
    const assetIds = sourcesFor("Can I replace an Asset when I am already at my Asset limit?").slice(0, 3).map((source) => source.canonicalId);
    expect(assetIds).not.toContain("rulebook:replacing-a-gambit-or-tactic");
  });

  test("the current prompt retains explicit classification discipline", () => {
    expect(workerSource).toContain("Use explicit only when clean authority directly states each material premise required by the answer");
    expect(workerSource).toContain('export const BEHAVIOR_REVISION = "v071-qa-20260910-3"');
  });
});

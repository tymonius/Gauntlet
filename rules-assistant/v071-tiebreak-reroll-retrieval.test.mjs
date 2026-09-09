import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { augmentRetrievalForContext, contextualQuery, BEHAVIOR_REVISION } from "./worker-v071.js";

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

function retrieve(question, limit = 10) {
  const query = contextualQuery(question, []);
  const raw = retrieveRules(corpus, query, { limit, excerptLength: 1700 });
  return augmentRetrievalForContext(corpus, question, [], raw);
}

describe("v0.7.1 battle Tiebreak Roll retrieval", () => {
  test("promotes current Tiebreak Roll authority for the exact reviewed reroll wording", () => {
    const sources = retrieve("When re-rolling after a tie, do gambits and tactics that add to your total or grant advantage still apply?");
    const ids = sources.slice(0, 3).map((source) => source.canonicalId);
    expect(ids).toContain("rulebook:tiebreak-roll");

    const authority = sources.find((source) => source.canonicalId === "rulebook:tiebreak-roll");
    expect(authority?.body).toContain("Do not apply advantage, disadvantage, card effects, numerical modifiers, or the previous battle totals");
    expect(authority?.body).toContain("separate sudden-death procedure");
    expect(authority?.body).toContain("not a recalculation or reroll of the original battle totals");
  });

  test.each([
    "After a tied battle, when we reroll, do advantage and card bonuses still apply?",
    "If battle totals tie and we roll again, do Gambit or Tactic modifiers carry over?"
  ])("keeps natural battle-tie paraphrases on Tiebreak authority: %s", (question) => {
    const ids = retrieve(question).slice(0, 4).map((source) => source.canonicalId);
    expect(ids).toContain("rulebook:tiebreak-roll");
  });

  test("keeps setup first-player tie rerolls led by setup authority", () => {
    const sources = retrieve("We tied when rolling for first player. Do we reroll?");
    expect(sources[0]?.canonicalId).toBe("rulebook:complete-rules-2");
    expect(`${sources[0]?.title} ${sources[0]?.body}`).toMatch(/first player|first turn|reroll ties/i);
    expect(sources.findIndex((source) => source.canonicalId === "rulebook:tiebreak-roll")).not.toBe(0);
  });

  test("records a current v0.7.1 QA behavior revision", () => {
    expect(BEHAVIOR_REVISION).toMatch(/^v071-qa-\d{8}-\d+$/);
  });
});
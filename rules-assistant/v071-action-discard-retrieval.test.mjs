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

const actionDestinationId = "rulebook:playing-a-card-for-its-action-effect";

function sourcesFor(question, history = []) {
  const retrievalQuery = contextualQuery(question, history);
  const raw = retrieveRules(corpus, retrievalQuery, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

function expectActionDestinationAuthority(question) {
  const topThree = sourcesFor(question).slice(0, 3);
  expect(topThree.map((source) => source.canonicalId), question).toContain(actionDestinationId);
  const authority = topThree.find((source) => source.canonicalId === actionDestinationId);
  expect(String(authority?.body || ""), question).toContain("put the card in the Discard Pile");
  expect(String(authority?.body || ""), question).toContain("unless it becomes an Asset, becomes an Overlay, or its effect gives another destination");
}

describe("v0.7.1 Action-card discard destination retrieval", () => {
  test("retrieves the explicit destination rule for the reviewed played-card discard question", () => {
    expectActionDestinationAuthority("When does a card go to the discard after being played?");
  });

  test("retrieves the same rule from natural Action-play paraphrases", () => {
    for (const question of [
      "After I play an Action card, when do I discard it?",
      "Does a played card go to the discard immediately or after its effect?",
      "Where does a normal card go after I use its Action effect?",
      "If an Action card becomes an Asset, does it still get discarded?"
    ]) {
      expectActionDestinationAuthority(question);
    }
  });

  test("does not override Gambit or Tactic destination authority", () => {
    for (const [question, roleAuthority] of [
      ["Where does a Gambit go after it is played?", "rulebook:gambit-area"],
      ["Where does a Tactic go after it is played?", "rulebook:tactic-area"]
    ]) {
      const ids = sourcesFor(question).slice(0, 4).map((source) => source.canonicalId);
      expect(ids, question).toContain(roleAuthority);
      const roleRank = ids.indexOf(roleAuthority);
      const actionRank = ids.indexOf(actionDestinationId);
      expect(actionRank < 0 || roleRank < actionRank, question).toBe(true);
    }
  });
});

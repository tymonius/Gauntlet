import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { BEHAVIOR_REVISION, augmentRetrievalForContext, contextualQuery } from "./worker-v071.js";
import { V071_CANONICAL_SOURCE_PATH, V071_RULEBOOK_SOURCE_PATH } from "./v071-public-corpus.js";

const canonicalData = JSON.parse(readFileSync(V071_CANONICAL_SOURCE_PATH, "utf8"));
const rulebookMarkdown = readFileSync(V071_RULEBOOK_SOURCE_PATH, "utf8");
const workerSource = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown, siteOrigin: "https://gauntlet.run" });

function sourcesFor(question) {
  const query = contextualQuery(question, []);
  const raw = retrieveRules(corpus, query, { limit: 12, excerptLength: 2200 });
  return augmentRetrievalForContext(corpus, question, [], raw);
}

const reviewedQuestion = "If I have Fortifications active, may I choose one Tactic, see my opponent’s choice, then choose my second Tactic?";

describe("v0.7.1 Fortifications reviewed Tactic-choice case", () => {
  test("the reviewed question retrieves Fortifications and the governing multiple-Tactic timing rule", () => {
    const sources = sourcesFor(reviewedQuestion);
    const ids = sources.slice(0, 4).map((source) => source.canonicalId);
    expect(ids[0]).toBe("card:neutral-fortifications");
    expect(ids).toContain("rulebook:multiple-gambits-or-tactics");

    const fortifications = sources.find((source) => source.canonicalId === "card:neutral-fortifications");
    expect(String(fortifications?.body || "")).toContain("When defending, you may choose up to two Tactics instead of one.");

    const multiple = sources.find((source) => source.canonicalId === "rulebook:multiple-gambits-or-tactics");
    expect(String(multiple?.body || "")).toContain("When several Tactics are chosen as part of the same choice, choose them simultaneously.");
  });

  test("generic multiple-Tactic sequencing language also retrieves the same authority", () => {
    const sources = sourcesFor("May I choose one Tactic, wait, and then select a second Tactic?");
    expect(sources.slice(0, 4).map((source) => source.canonicalId)).toContain("rulebook:multiple-gambits-or-tactics");
  });

  test("current classification discipline does not permit a provisional ruling when clean authority resolves every premise", () => {
    expect(workerSource).toContain("Use explicit only when clean authority directly states each material premise required by the answer");
    expect(workerSource).toContain("Provisional is only for a genuine remaining gap or ambiguity");
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260911-1");
  });
});

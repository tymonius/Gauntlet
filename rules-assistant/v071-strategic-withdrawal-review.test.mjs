import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { augmentRetrievalForContext, contextualQuery } from "./worker-v071.js";
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

const reviewedQuestion = "I lose as the defender while Strategic Withdrawal is one of my Battle cards. After my normal retreat I take its additional movement. May I return the other Gambit I set in that battle to my Hand before cards are cleared?";

describe("v0.7.1 Strategic Withdrawal reviewed case", () => {
  test("the exact reviewed question retrieves Strategic Withdrawal first", () => {
    const sources = sourcesFor(reviewedQuestion);
    expect(sources[0]?.canonicalId).toBe("card:neutral-strategic-withdrawal");
    expect(String(sources[0]?.body || "")).toContain("In the Aftermath, if you lose, after your normal retreat you may move one additional Position toward your own end and return one other card you controlled in this battle to your Hand.");
  });

  test("the timing paraphrase retrieves battle-card clearing authority alongside the card", () => {
    const sources = sourcesFor("When does Strategic Withdrawal's extra movement happen relative to clearing battle cards?");
    const ids = sources.slice(0, 3).map((source) => source.canonicalId);
    expect(ids[0]).toBe("card:neutral-strategic-withdrawal");
    expect(ids).toContain("rulebook:clearing-battle-cards");
    const clearing = sources.find((source) => source.canonicalId === "rulebook:clearing-battle-cards");
    expect(String(clearing?.body || "")).toContain("If a card tells you to put it somewhere else, follow the card.");
  });

  test("the current prompt requires explicit classification when authority directly states every material premise", () => {
    expect(workerSource).toContain("Use explicit only when clean authority directly states each material premise required by the answer");
    expect(workerSource).toContain("could the cited text itself be quoted or paraphrased to state that claim without adding a deductive bridge");
    expect(workerSource).toContain('export const BEHAVIOR_REVISION = "v071-qa-20260910-4"');
  });
});

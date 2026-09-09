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
const workerSource = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");

const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run",
  rulebookBrowserUrl: "https://gauntlet.run/rulebook/",
  canonicalDataUrl: "https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json"
});

function sourcesFor(question, history = []) {
  const query = contextualQuery(question, history);
  const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1700 });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

const reviewedQuestion = "Different ability: can Fieldcraft ignore an effect that changes control of a Territory?";

describe("v0.7.1 Fieldcraft Territory-state retrieval", () => {
  test("the exact reviewed question promotes the detailed Ranger authority", () => {
    const sources = sourcesFor(reviewedQuestion);
    expect(sources[0]?.canonicalId).toBe("rulebook:ranger");
    expect(sources.slice(0, 3).map((source) => source.canonicalId)).toContain("faction:fieldcraft");
  });

  test.each([
    "Can Fieldcraft ignore a Territory effect that changes control?",
    "Does Fieldcraft let the Ranger ignore Capture or Occupation?",
    "Can Fieldcraft change Defensive Edge or Last Stand bonuses?"
  ])("Fieldcraft state-limit paraphrase keeps the detailed rule in the top three: %s", (question) => {
    const sources = sourcesFor(question);
    expect(sources.slice(0, 3).map((source) => source.canonicalId)).toContain("rulebook:ranger");
  });

  test("the promoted authority directly states the controlling limitation", () => {
    const source = sourcesFor(reviewedQuestion).find((candidate) => candidate.canonicalId === "rulebook:ranger");
    const body = String(source?.body || "");
    expect(body).toContain("Fieldcraft does not alter Territory control, Occupation, Capture, Defensive Edge, Last Stand battle bonuses, or limits calculated from Territories");
  });

  test("ordinary Territory-control questions are not hijacked by Fieldcraft", () => {
    const sources = sourcesFor("How does Territory control change?");
    expect(sources[0]?.canonicalId).not.toBe("rulebook:ranger");
  });

  test("the behavior revision records the retrieval change", () => {
    expect(workerSource).toMatch(/export const BEHAVIOR_REVISION = \"v071-qa-\d{8}-\d+\";/);
  });
});

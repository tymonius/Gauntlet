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

function sourcesFor(question) {
  const query = contextualQuery(question, []);
  const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1700 });
  return augmentRetrievalForContext(corpus, question, [], raw);
}

const reviewedQuestion = "I am the Commandant and win my first battle of the turn while defending during my opponent's turn. Do I gain Command, and can that newly gained Command pay for Repel in the same Aftermath?";

describe("v0.7.1 Commandant Command and Repel reviewed case", () => {
  test("the exact reviewed question retrieves both Command and Repel authority", () => {
    const sources = sourcesFor(reviewedQuestion);
    const ids = sources.map((source) => source.canonicalId);

    expect(ids.slice(0, 2)).toContain("faction:command");
    expect(ids.slice(0, 2)).toContain("faction:repel");
    expect(ids).toContain("rulebook:complete-rules-17");
  });

  test("complete Military authority directly states both disputed timing points", () => {
    const source = sourcesFor(reviewedQuestion)
      .find((candidate) => candidate.canonicalId === "rulebook:complete-rules-17");
    const body = String(source?.body || "");

    expect(body).toContain("This trigger may occur during either player's turn");
    expect(body).toContain("Newly gained Command may pay for an Order whose timing occurs during the Aftermath");
  });

  test("Repel authority directly states its cost, timing, and defensive-win requirement", () => {
    const source = sourcesFor("How does Repel work?")
      .find((candidate) => candidate.canonicalId === "faction:repel");
    const body = String(source?.body || "");

    expect(body).toContain("Cost: 1 Command");
    expect(body).toContain("No Action · Aftermath · Win as defender");
    expect(body).toContain("After the opponent's normal retreat, they retreat one additional Position, if able");
  });

  test("current prompt requires explicit classification when clean authority directly states every material premise", () => {
    expect(workerSource).toContain("Use explicit only when clean authority directly states each material premise required by the answer");
    expect(workerSource).toContain("could the cited text itself be quoted or paraphrased to state that claim without adding a deductive bridge");
    expect(workerSource).toMatch(/export const BEHAVIOR_REVISION = "v071-qa-\d{8}-\d+"/);
  });
});

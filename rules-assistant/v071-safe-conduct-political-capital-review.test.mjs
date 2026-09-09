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

const reviewedQuestion = "Switching subjects: if Safe Conduct makes me withdraw, does Political Capital still trigger?";

describe("v0.7.1 Safe Conduct and Political Capital reviewed case", () => {
  test("the exact reviewed question retrieves Safe Conduct first and Political Capital in the top three", () => {
    const sources = sourcesFor(reviewedQuestion);
    expect(sources[0]?.canonicalId).toBe("card:diplomats-safe-conduct");
    expect(sources.slice(0, 3).map((source) => source.canonicalId)).toContain("faction:political-capital");
  });

  test("Safe Conduct expressly replaces the battle loss with withdrawal", () => {
    const source = sourcesFor(reviewedQuestion).find((candidate) => candidate.canonicalId === "card:diplomats-safe-conduct");
    const body = String(source?.body || "");
    expect(body).toContain("When you would lose a battle following refused Terms");
    expect(body).toContain("withdraw instead");
  });

  test("Political Capital is expressly conditioned on losing following refused Terms", () => {
    const source = sourcesFor(reviewedQuestion).find((candidate) => candidate.canonicalId === "faction:political-capital");
    const body = String(source?.body || "");
    expect(body).toContain("When you would lose staked Influence");
    expect(body).toContain("After losing following refused Terms");
  });

  test("current prompt treats a directly stated replacement and timing condition as explicit authority", () => {
    expect(workerSource).toContain("Use explicit only when clean authority directly states each material premise required by the answer");
    expect(workerSource).toContain("Before returning provisional, check the retrieved clean authority for a direct answer to the requested property");
    expect(workerSource).toMatch(/export const BEHAVIOR_REVISION = "v071-qa-\d{8}-\d+"/);
  });
});

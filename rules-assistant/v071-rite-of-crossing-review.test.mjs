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

const reviewedQuestion = "How does Rite of Crossing complete?";

describe("v0.7.1 Rite of Crossing reviewed case", () => {
  test("the exact reviewed question retrieves Rite of Crossing authority first", () => {
    const sources = sourcesFor(reviewedQuestion);
    expect(sources[0]?.canonicalId).toBe("rulebook:rite-of-crossing");
  });

  test("the complete Rite authority directly states next-turn completion and interruption", () => {
    const source = sourcesFor(reviewedQuestion)[0];
    const body = String(source?.body || "");

    expect(body).toMatch(/start of your next turn/i);
    expect(body).toMatch(/after (?:the )?Capture/i);
    expect(body).toMatch(/still (?:the )?occupier/i);
    expect(body).toMatch(/now control/i);
    expect(body).toMatch(/interrupt/i);
    expect(body).toMatch(/reset/i);
  });

  test("Rite procedure authority preserves no same-turn completion and paid-cost semantics", () => {
    const sources = sourcesFor(reviewedQuestion);
    const source = sources.find((candidate) => candidate.canonicalId === "rulebook:beginning-a-rite");
    expect(source).toBeTruthy();
    const body = String(source?.body || "");

    expect(body).toMatch(/cannot complete (?:during|on) the turn it begins/i);
    expect(body).toMatch(/paid costs? (?:are|is) not returned/i);
  });

  test("current prompt classifies a directly stated completion procedure as explicit", () => {
    expect(workerSource).toContain("Use explicit only when clean authority directly states each material premise required by the answer");
    expect(workerSource).toContain("Before returning provisional, check the retrieved clean authority for a direct answer to the requested property");
    expect(workerSource).toMatch(/export const BEHAVIOR_REVISION = "v071-qa-\d{8}-\d+"/);
  });
});

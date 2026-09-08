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

const reviewedQuestion = "The opponent cannot form a Reserve because both their Draw Pile and Discard Pile are empty. Does the Inquisition immediately win through Purification?";

describe("v0.7.1 Inquisition Purification reviewed case", () => {
  test("the exact reviewed question retrieves complete Purification authority first", () => {
    const sources = sourcesFor(reviewedQuestion);
    expect(sources[0]?.canonicalId).toBe("rulebook:purification");
  });

  test("complete authority directly excludes failed Reserve draws", () => {
    const source = sourcesFor(reviewedQuestion)[0];
    const body = String(source?.body || "");

    expect(body).toContain("after their normal start-of-turn draw attempt");
    expect(body).toContain("both their Draw Pile and Discard Pile are empty");
    expect(body).toContain("A failed Reserve draw or effect-generated draw does not trigger Purification");
  });

  test("direct failed-Reserve wording keeps Purification authority in context", () => {
    const sources = sourcesFor("Does a failed Reserve draw trigger Purification?");
    const source = sources.find((candidate) => candidate.canonicalId === "rulebook:purification");
    expect(source).toBeTruthy();
    expect(String(source?.body || "")).toContain("A failed Reserve draw or effect-generated draw does not trigger Purification");
  });

  test("current prompt requires explicit classification for directly stated exclusions", () => {
    expect(workerSource).toContain("A negative answer may be explicit when the rules expressly confine an action, effect, timing, zone, or permission to the stated condition");
    expect(workerSource).toContain("Use explicit only when clean authority directly states each material premise required by the answer");
    expect(workerSource).toMatch(/export const BEHAVIOR_REVISION = "v071-qa-\d{8}-\d+"/);
  });
});

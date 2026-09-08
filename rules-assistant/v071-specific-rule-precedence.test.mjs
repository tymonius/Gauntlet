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

function augmented(question) {
  const raw = retrieveRules(corpus, contextualQuery(question, []), { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, [], raw);
}

describe("v0.7.1 specific-rule precedence retrieval", () => {
  const questions = [
    "What happens when a card’s specific instruction conflicts with the normal battle sequence?",
    "If a card tells me to do something different from the normal battle order, which rule wins?",
    "Does a card-specific battle instruction override the normal sequence?"
  ];

  for (const question of questions) {
    test(question, () => {
      const sources = augmented(question);
      const topThree = sources.slice(0, 3).map((source) => source.canonicalId);
      expect(topThree).toContain("rulebook:golden-rules");
      expect(sources.slice(0, 4).map((source) => source.canonicalId)).toContain("rulebook:battle-sequence");
      const golden = sources.find((source) => source.canonicalId === "rulebook:golden-rules");
      expect(golden?.body).toContain("follow the more specific one");
    });
  }

  test("behavior revision remains versioned without pinning a historical revision", () => {
    expect(workerSource).toMatch(/export const BEHAVIOR_REVISION = "v071-qa-\d{8}-\d+"/);
  });
});

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

function augmented(question) {
  const raw = retrieveRules(corpus, contextualQuery(question, []), { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, [], raw);
}

describe("v0.7.1 Onward and battle-initiated movement termination", () => {
  const questions = [
    "Can Onward continue after the battle it helped initiate?",
    "Can Onward be used after a battle?",
    "If Onward starts a battle, do I still get its remaining movement afterward?"
  ];

  for (const question of questions) {
    test(question, () => {
      const sources = augmented(question);
      const topFive = sources.slice(0, 5).map((source) => source.canonicalId);
      expect(topFive.some((id) => id === "faction:onward" || id === "leader:onward" || id === "rulebook:orders")).toBe(true);
      expect(topFive.some((id) => id === "rulebook:movement" || id === "rulebook:movement-granted-by-effects" || id === "rulebook:complete-rules-5")).toBe(true);
    });
  }

  test("Onward authority permits the extra movement to start a battle", () => {
    const sources = augmented("Can Onward continue after the battle it helped initiate?");
    const onward = sources.find((source) => source.canonicalId === "faction:onward")
      || sources.find((source) => source.canonicalId === "leader:onward")
      || sources.find((source) => source.canonicalId === "rulebook:orders");
    expect(onward?.body).toContain("This may start a Battle");
  });

  test("normal movement authority ends the sequence when it starts a battle", () => {
    const sources = augmented("If Onward starts a battle, do I still get its remaining movement afterward?");
    const movement = sources.find((source) => source.canonicalId === "rulebook:movement")
      || sources.find((source) => source.canonicalId === "rulebook:complete-rules-5");
    expect(movement?.body).toContain("movement sequence ends");
    expect(movement?.body).toContain("unused movement");
  });
});

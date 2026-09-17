import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { augmentRetrievalForContext } from "./worker-v071.js";

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
  const retrieval = retrieveRules(corpus, question, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, [], retrieval);
}

describe("Gate 3 tranche D named-mechanic retrieval priority", () => {
  test("inflected Transmutation phrasing promotes the direct authority", () => {
    const results = augmented("i transmuted a card. do i get the text on the card too");
    expect(results[0]?.canonicalId).toBe("rulebook:transmutation");
  });

  test("inflected Condemnation phrasing promotes the direct authority", () => {
    const results = augmented("i lost. their tactic still gets condemned?");
    expect(results[0]?.canonicalId).toBe("rulebook:condemnation");
  });
});

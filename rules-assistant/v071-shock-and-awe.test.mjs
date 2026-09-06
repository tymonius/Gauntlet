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

function augmentedIds(question, history = []) {
  const retrievalQuery = contextualQuery(question, history);
  const raw = retrieveRules(corpus, retrievalQuery, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, raw).map((source) => source.canonicalId);
}

describe("v0.7.1 Shock and Awe authority retrieval", () => {
  test("retrieves the card and conflicting-victory rule for the same-victory restriction", () => {
    const ids = augmentedIds("If Shock and Awe applies to this victory, can I move, capture, or use an Order afterward?");
    expect(ids).toContain("card:military-shock-and-awe");
    expect(ids).toContain("rulebook:conflicting-victory-benefits");
  });

  test("preserves the same-victory restriction on a terse follow-up", () => {
    const history = [
      { role: "user", content: "What happens if I win with Shock and Awe?" },
      { role: "assistant", content: "You choose Breakthrough or Consolidate for that victory." }
    ];
    const ids = augmentedIds("Can I use an Order too?", history);
    expect(ids).toContain("card:military-shock-and-awe");
    expect(ids).toContain("rulebook:conflicting-victory-benefits");
  });

  test("retrieves the controlling shared rule when Shock and Awe and War Crimes overlap", () => {
    const ids = augmentedIds("Shock and Awe and War Crimes both apply to the same victory. What am I allowed to do afterward?");
    expect(ids).toContain("card:military-shock-and-awe");
    expect(ids).toContain("rulebook:conflicting-victory-benefits");
  });

  test("does not pin Shock and Awe authority after a topic pivot", () => {
    const history = [
      { role: "user", content: "What happens if I win with Shock and Awe?" },
      { role: "assistant", content: "You choose Breakthrough or Consolidate for that victory." }
    ];
    const question = "When does Peace Treaty win?";
    const query = contextualQuery(question, history);
    expect(query).toBe(question);
    const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1300 });
    const ids = augmentRetrievalForContext(corpus, question, history, raw).map((source) => source.canonicalId);
    expect(ids).toContain("rulebook:treaty-articles-and-peace-treaty");
    expect(ids).not.toContain("card:military-shock-and-awe");
    expect(ids).not.toContain("rulebook:conflicting-victory-benefits");
  });
});

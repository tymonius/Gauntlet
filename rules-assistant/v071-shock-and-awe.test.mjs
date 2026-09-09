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

function augmentedSources(question, history = []) {
  const retrievalQuery = contextualQuery(question, history);
  const raw = retrieveRules(corpus, retrievalQuery, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

function augmentedIds(question, history = []) {
  return augmentedSources(question, history).map((source) => source.canonicalId);
}

describe("v0.7.1 Shock and Awe authority retrieval", () => {
  test("retrieves complete current authority for the exact reviewed broad question", () => {
    const sources = augmentedSources("What does shock and awe do?");
    expect(sources[0]?.canonicalId).toBe("card:military-shock-and-awe");
    expect(sources.slice(0, 3).map((source) => source.canonicalId)).toContain("rulebook:conflicting-victory-benefits");

    const body = sources[0]?.body ?? "";
    expect(body).toContain("Unique Rule: Maximum one copy per Deck");
    expect(body).toContain("Asset: During Onset");
    expect(body).toContain("apply its Gambit/Tactic effect after Tactics are revealed");
    expect(body).toContain("When attacking on an enemy-controlled Territory");
    expect(body).toContain("+1 Tactic from Hand");
    expect(body).toContain("Lose — Retreat +1");
    expect(body).toContain("Breakthrough — Opponent: Retreat +1, if able; then you advance one Position");
    expect(body).toContain("Consolidate — Advance Front Line 1, if able; Command = 2");
    expect(body).toContain("Afterward, you cannot move, advance your Front Line, or use an Order as a result of this victory");
    expect(body).toContain("In the Aftermath, put both cards in your Graveyard");

    expect(workerSource).toContain("For a multi-step procedure, reconstruct the whole applicable sequence from the supplied authority before answering");
    expect(workerSource).toContain("Preserve prerequisites, separate costs, timing windows, destinations");
  });

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

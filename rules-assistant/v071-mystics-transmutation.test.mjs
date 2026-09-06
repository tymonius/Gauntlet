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

function rawIds(question, history = []) {
  const retrievalQuery = contextualQuery(question, history);
  return retrieveRules(corpus, retrievalQuery, { limit: 10, excerptLength: 1300 })
    .map((source) => source.canonicalId);
}

function augmentedIds(question, history = []) {
  const retrievalQuery = contextualQuery(question, history);
  const raw = retrieveRules(corpus, retrievalQuery, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, raw).map((source) => source.canonicalId);
}

describe("v0.7.1 Mystics Transmutation authority retrieval", () => {
  test("retrieves progression and Transmutation when a Spirit Walker asks about the second-Rite ability", () => {
    const ids = augmentedIds("Does Spirit Walker get the same ability after the second Rite as the Alchemist?");
    expect(ids).toContain("rulebook:progression");
    expect(ids).toContain("rulebook:transmutation");
    expect(ids).toContain("rulebook:spirit-walker");
  });

  test("retrieves the complete Transmutation procedure from a natural paraphrase", () => {
    const ids = augmentedIds("I finished my second Rite. Before dice, can I put a card from Hand in the Graveyard for its value?");
    expect(ids).toContain("rulebook:progression");
    expect(ids).toContain("rulebook:transmutation");
  });

  test("preserves Transmutation authority on a terse follow-up about the unlocked feature", () => {
    const history = [
      { role: "user", content: "My Spirit Walker just completed the second Rite." },
      { role: "assistant", content: "The second completed Rite unlocks Transmutation." }
    ];
    const ids = augmentedIds("What can I do with it before dice?", history);
    expect(ids).toContain("rulebook:progression");
    expect(ids).toContain("rulebook:transmutation");
  });

  test("keeps the no-printed-effects restriction with the procedure", () => {
    const ids = augmentedIds("If I use Transmutation, does the card I put in my Graveyard also use its printed effect?");
    expect(ids).toContain("rulebook:transmutation");
  });

  test("does not pin Mystics authority after a topic pivot", () => {
    const history = [
      { role: "user", content: "My Spirit Walker just completed the second Rite." },
      { role: "assistant", content: "The second completed Rite unlocks Transmutation." }
    ];
    const question = "How much does my Deed cost?";
    const raw = rawIds(question, history);
    const ids = augmentedIds(question, history);
    expect(ids).toEqual(raw);
  });
});

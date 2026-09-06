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

describe("v0.7.1 Peace Treaty authority retrieval", () => {
  test("keeps the exact Peace Treaty timing authority for the sixth ratification", () => {
    const ids = augmentedIds("I just ratified my sixth different Proposal. Do I win immediately?");
    expect(ids).toContain("rulebook:treaty-articles-and-peace-treaty");
  });

  test("preserves Peace Treaty authority on a terse timing follow-up", () => {
    const history = [
      { role: "user", content: "I just ratified my sixth different Proposal." },
      { role: "assistant", content: "That gives you six ratified Treaty Articles." }
    ];
    const question = "Do I win now?";
    const ids = augmentedIds(question, history);
    expect(ids).toContain("rulebook:treaty-articles-and-peace-treaty");
  });

  test("retrieves acceptance and victory timing together when acceptance supplies the sixth ratification", () => {
    const ids = augmentedIds("My opponent accepted my sixth unratified Proposal. Does that ratify it, and do I win right now?");
    expect(ids).toContain("rulebook:accepted-terms");
    expect(ids).toContain("rulebook:treaty-articles-and-peace-treaty");
  });

  test("does not pin Peace Treaty authority after a topic pivot", () => {
    const history = [
      { role: "user", content: "I just ratified my sixth different Proposal." },
      { role: "assistant", content: "That gives you six ratified Treaty Articles." }
    ];
    const question = "How much does my Deed cost?";
    const raw = rawIds(question, history);
    const ids = augmentedIds(question, history);
    expect(ids).toEqual(raw);
  });
});

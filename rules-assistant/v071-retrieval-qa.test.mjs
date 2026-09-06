import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { contextualQuery } from "./worker-v071.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url),
  "utf8"
);
const benchmark = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-evals.v071.json", import.meta.url),
  "utf8"
));

const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run",
  rulebookBrowserUrl: "https://gauntlet.run/rulebook/",
  canonicalDataUrl: "https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json"
});

function sourceHaystack(source) {
  return [
    source.title,
    source.heading,
    source.body,
    source.excerpt,
    source.canonicalId,
    source.id
  ].filter(Boolean).join("\n").toLowerCase();
}

describe("v0.7.1 Rules Arbiter retrieval QA", () => {
  for (const item of benchmark.cases) {
    test(item.id, () => {
      const query = contextualQuery(item.question, item.history || []);
      const sources = retrieveRules(corpus, query, {
        limit: 10,
        excerptLength: 1300
      });

      expect(sources.length, `${item.id}: retrieval returned no sources for "${query}"`).toBeGreaterThan(0);

      const haystacks = sources.map(sourceHaystack);
      for (const pattern of item.expectedSourcePatterns) {
        const normalized = String(pattern).toLowerCase();
        expect(
          haystacks.some((text) => text.includes(normalized)),
          [
            `${item.id}: expected source pattern "${pattern}" was not retrieved.`,
            `Query: ${query}`,
            "Retrieved:",
            ...sources.map((source, index) => `  ${index + 1}. ${source.title} [${source.canonicalId || source.id}]`)
          ].join("\n")
        ).toBe(true);
      }

      if (item.expectedTopic) {
        const topThree = sources.slice(0, 3).map(sourceHaystack).join("\n");
        const topicTerms = String(item.expectedTopic)
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((term) => term.length > 2);
        expect(
          topicTerms.some((term) => topThree.includes(term)),
          [
            `${item.id}: top retrieval did not preserve expected topic "${item.expectedTopic}".`,
            `Query: ${query}`,
            "Top three:",
            ...sources.slice(0, 3).map((source, index) => `  ${index + 1}. ${source.title} [${source.canonicalId || source.id}]`)
          ].join("\n")
        ).toBe(true);
      }
    });
  }
});

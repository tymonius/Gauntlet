import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildRulesCorpus } from "./local-search.js";
import { buildRetrievalQueries } from "./worker-v061.js";
import { analyzeQuestionLocally, retrieveIntelligentRules } from "./rules-intelligence.js";
import { enrichPlanFromEntityDocuments } from "./rules-plan-enrichment.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md", import.meta.url),
  "utf8"
);
const benchmark = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-evals.v061.json", import.meta.url),
  "utf8"
));
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown });

for (const item of benchmark.cases) {
  test(`rules intelligence benchmark: ${item.id}`, () => {
    const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, item.question));
    const result = retrieveIntelligentRules(corpus, item.question, [], plan, {
      baseQueries: buildRetrievalQueries(item.question),
      limit: 14,
      excerptLength: 1600
    });
    const text = result.sources.map((source) => `${source.title}\n${source.body}`).join("\n\n");
    for (const pattern of item.expectedRetrievalPatterns) {
      expect(text.toLowerCase()).toContain(pattern.toLowerCase());
    }
  });
}

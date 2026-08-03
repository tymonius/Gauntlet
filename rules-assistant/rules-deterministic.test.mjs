import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildRulesCorpus } from "./local-search.js";
import { analyzeQuestionLocally } from "./rules-intelligence.js";
import { enrichPlanFromEntityDocuments } from "./rules-plan-enrichment.js";
import { buildRulePacket, prioritizeRulePacketSources } from "./rules-packets.js";
import { resolveDeterministicRuling } from "./rules-deterministic.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md", import.meta.url),
  "utf8"
);
const regressions = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-regressions.v061.json", import.meta.url),
  "utf8"
));
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown });

for (const item of regressions.cases) {
  test(`deterministic Rules Arbiter regression: ${item.id}`, () => {
    const history = item.history || [];
    const localPlan = analyzeQuestionLocally(corpus, item.question, history);
    const plan = enrichPlanFromEntityDocuments(corpus, localPlan);
    const packet = buildRulePacket(corpus, { question: item.question, history, plan });
    const ruling = resolveDeterministicRuling(corpus, {
      question: item.question,
      history,
      plan,
      packet
    });

    expect(ruling, `${item.id} must not fall through to the model`).toBeTruthy();
    expect(ruling.rulingStatus).toBe(item.expectedStatus);
    if (item.expectedSubject) expect(ruling.subject).toBe(item.expectedSubject);
    if (item.expectedResponseType) expect(ruling.responseType).toBe(item.expectedResponseType);
    for (const sourceId of item.expectedSourceIds || []) {
      expect(ruling.sourceIds).toContain(sourceId);
    }
    const answer = ruling.answer.toLowerCase();
    for (const pattern of item.requiredAnswerPatterns || []) {
      expect(answer).toContain(pattern.toLowerCase());
    }
    for (const pattern of item.forbiddenAnswerPatterns || []) {
      expect(answer).not.toContain(pattern.toLowerCase());
    }
  });
}

test("the deterministic gate covers the required explicit and follow-up failures", () => {
  expect(regressions.cases.length).toBeGreaterThanOrEqual(regressions.minimumDeterministicCases);
});

test("named rule packets guarantee governing passages ahead of lexical retrieval", () => {
  const question = "I am a Spirit Walker. How do I do Transmutation?";
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question));
  const packet = buildRulePacket(corpus, { question, plan });
  expect(packet.sourceIds).toEqual(expect.arrayContaining([
    "rulebook:progression",
    "rulebook:transmutation",
    "rulebook:spirit-walker"
  ]));

  const prioritized = prioritizeRulePacketSources({ sources: [], queries: [] }, corpus, packet, { limit: 8 });
  expect(prioritized.sources.slice(0, 3).map((source) => source.canonicalId)).toEqual([
    "rulebook:progression",
    "rulebook:transmutation",
    "rulebook:spirit-walker"
  ]);
});

test("unknown multi-card interactions remain eligible for the single model pass", () => {
  const question = "If I copy an effect that adds a Tactic while another effect replaces that Tactic, which resolves first?";
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question));
  const packet = buildRulePacket(corpus, { question, plan });
  expect(resolveDeterministicRuling(corpus, { question, plan, packet })).toBeNull();
});

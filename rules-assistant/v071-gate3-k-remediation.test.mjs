import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  augmentRetrievalForContext,
  BEHAVIOR_REVISION,
  buildQuestionSpecificAdjudicationReminder,
  contextualQuery
} from "./worker-v071.js";
import { normalizeR13RulingStatus } from "./r13-classification.js";

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

function augmented(question, history = []) {
  const query = contextualQuery(question, history);
  const retrieval = retrieveRules(corpus, query, { limit: 10, excerptLength: 1400 });
  return augmentRetrievalForContext(corpus, question, history, retrieval);
}

function textOf(source) {
  return [source?.title, source?.heading, source?.body, source?.excerpt]
    .map((value) => String(value || ""))
    .join("\n");
}

describe("Gate 3 tranche K r22 remediation", () => {
  test("bumps production behavior to r22", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260918-26");
  });

  test("condition-prefix questions retrieve the direct condition-prefix rule", () => {
    const question = "A printed effect reads 'Defender — gain Advantage. +1 Battle Total.' Does the Defender condition automatically apply to the later +1 Battle Total clause too?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:condition-prefixes");
    expect(textOf(sources[0])).toContain("A condition prefix applies only to the clause that immediately follows it");
    expect(normalizeR13RulingStatus("provisional", question, sources)).toBe("explicit");
    expect(buildQuestionSpecificAdjudicationReminder(question, sources, [])).toContain("only to the clause that immediately follows it");
  });

  test("negated Tactic destination retrieves Negation as governing authority", () => {
    const question = "My Tactic is negated but no effect gives it a different destination. Does it still go to my Discard Pile in the Aftermath?";
    const sources = augmented(question);
    expect(sources.some((source) => source.canonicalId === "rulebook:negation")).toBe(true);
    expect(sources.some((source) => /negated Tactic still goes to its owner's Discard Pile/i.test(textOf(source)))).toBe(true);
  });

  test("generic direct banking instructions retrieve the direct-permission rule", () => {
    const question = "An effect directly tells me to bank another card immediately. Do I also spend a separate Action for that banking unless the instruction says so?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:directly-permitted-card-procedures");
    expect(textOf(sources[0])).toContain("does not spend or require another Action");
    expect(buildQuestionSpecificAdjudicationReminder(question, sources, [])).toContain("does not spend or require another Action");
  });

  test("Conscription plus direct-permission authority is a combined inference", () => {
    const question = "Conscription resolves its Action and then lets me immediately play a card from Hand whose Action effect banks it. Does that immediate bank require me to spend another Action?";
    const sources = augmented(question);
    expect(sources.some((source) => /Card: Conscription/i.test(source.title || ""))).toBe(true);
    expect(sources.some((source) => source.canonicalId === "rulebook:directly-permitted-card-procedures")).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
  });

  test("Trade Concessions banking plus direct-permission authority is a combined inference", () => {
    const question = "The opponent accepts my Trade Concessions and chooses 'Bank one eligible card from Hand.' Does banking that chosen card consume my normal Action for the turn?";
    const sources = augmented(question);
    expect(sources.some((source) => /Card: Trade Concessions/i.test(source.title || ""))).toBe(true);
    expect(sources.some((source) => source.canonicalId === "rulebook:directly-permitted-card-procedures")).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
  });

  test("terse late-Tactic language retrieves the explicit additional-Tactic rule", () => {
    const question = "+1 tactic after reveal. comes in faceup?";
    const sources = augmented(question);
    expect(sources.some((source) => source.canonicalId === "rulebook:additional-tactics")).toBe(true);
    expect(sources.some((source) => /after Tactics are revealed, play it face up/i.test(textOf(source)))).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("No Martyrs retreat question remains explicit direct authority", () => {
    const question = "no martyrs stops their retreat?";
    const sources = augmented(question);
    expect(sources.some((source) => source.canonicalId === "rulebook:no-martyrs")).toBe(true);
    expect(sources.some((source) => /does not prevent harmful consequences, the retreat itself/i.test(textOf(source)))).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("Court Martial plus Stand Ground follow-up remains a combined inference", () => {
    const history = [
      { role: "user", content: "I lost, retreated normally, then Court Martial tried to make me retreat one more Position. I discarded Stand Ground against that extra movement." },
      { role: "assistant", content: "Stand Ground can address movement caused by the opposing card effect." }
    ];
    const question = "But my original retreat still happened, right?";
    const sources = augmented(question, history);
    expect(sources.some((source) => /Card: Court Martial/i.test(source.title || ""))).toBe(true);
    expect(sources.some((source) => /Card: Stand Ground/i.test(source.title || ""))).toBe(true);
    expect(sources.some((source) => /A player retreats because they lost a battle/i.test(textOf(source)))).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
  });
});

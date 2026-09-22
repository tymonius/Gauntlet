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

describe("Gate 3 tranche N r25 remediation", () => {
  test("bumps production behavior to r25", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260922-34");
  });

  test("Safe Conduct is direct explicit authority despite downstream withdrawal consequences", () => {
    const question = "After refused Terms I would lose the battle. If I discard Safe Conduct, what does the battle result become?";
    const sources = augmented(question);
    expect(sources.some((source) =>
      /Safe Conduct/i.test(textOf(source))
      && /discard this card to withdraw instead/i.test(textOf(source))
    )).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("terse Safe Conduct is also explicit", () => {
    const question = "safe conduct after refused terms turns my loss into withdrawal?";
    const sources = augmented(question);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("Retribution reminder assigns Conviction to the card controller, not the opponent", () => {
    const question = "retribution fires and they have no assets. +2 conviction?";
    const sources = augmented(question);
    expect(sources.some((source) =>
      /Card: Retribution/i.test(source?.title || "")
      && /If they have no Assets, \+2 Conviction/i.test(textOf(source))
    )).toBe(true);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("controller gains +2 Conviction");
    expect(reminder).toContain("Do not say the opponent gains Conviction");
  });
});

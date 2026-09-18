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

describe("Gate 3 tranche L r23 remediation", () => {
  test("bumps production behavior to r23", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260918-26");
  });

  test("counterintel shorthand retrieves Counterintelligence direct authority", () => {
    const question = "counterintel blocks the whole reveal effect, not just seeing the cards?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:counterintelligence");
    expect(textOf(sources[0])).toContain("prevents the entire opposing revealing effect");
    expect(buildQuestionSpecificAdjudicationReminder(question, sources, [])).toContain("prevents the entire opposing revealing effect");
  });

  test("Poison Gas shorthand retrieves Poisonous Gas rather than generic battle sequence", () => {
    const question = "poison gas: set gambit, so no tactics for me?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("territory:territory-poisonous-gas");
    expect(textOf(sources[0])).toContain("may employ Gambits or Tactics, but not both");
    expect(buildQuestionSpecificAdjudicationReminder(question, sources, [])).toContain("cannot also use Tactics");
  });

  test("Contingency Plan forced-removal interaction retrieves both authorities and is inferred", () => {
    const question = "contingency plan gets forced out by lower asset cap. +1 card?";
    const sources = augmented(question);
    expect(sources.some((source) => source.canonicalId === "card:neutral-contingency-plan")).toBe(true);
    expect(sources.some((source) => source.canonicalId === "rulebook:removed-assets")).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
  });

  test("Monastery plus Invocation retrieves both authorities and is inferred", () => {
    const question = "monastery active. invocation can't move my grave card out?";
    const sources = augmented(question);
    expect(sources.some((source) => source.canonicalId === "territory:territory-monastery")).toBe(true);
    expect(sources.some((source) => source.canonicalId === "rulebook:invocation")).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
  });

  test("Rite bound-card destination gets an affirmative polarity reminder", () => {
    const question = "rite binding ends with no special destination. bound cards go grave?";
    const sources = augmented(question);
    expect(sources.some((source) => source.canonicalId === "rulebook:bound-cards-3")).toBe(true);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("answer Yes, not No");
  });

  test("Divestment retrieval stays direct and question-scoped", () => {
    const question = "I own four Deeds and play Divestment for its Action. How much Capital do I gain, and when is the Deed count measured?";
    const sources = augmented(question);
    expect(sources.some((source) =>
      /Divestment/i.test(textOf(source))
      && /number of Deeds you owned before doing so/i.test(textOf(source))
    )).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("explicit");
  });
});

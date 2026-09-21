import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  augmentRetrievalForContext,
  BEHAVIOR_REVISION,
  buildAmbiguousReferentClarification,
  buildQuestionSpecificAdjudicationReminder,
  contextualQuery
} from "./worker-v071.js";

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

describe("r31 restraint hardening from final blind tranche S", () => {
  test("bumps production behavior to r31", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260921-33");
  });

  test("universal staked-Influence Leverage rule is not diverted by 'that Proposal'", () => {
    const question = "After my Terms are refused, can I spend the Influence I staked on that Proposal as Leverage before dice?";
    const sources = augmented(question);
    expect(sources.some((source) => /leverage/i.test(String(source.title || "")) || /staked influence cannot be spent as leverage/i.test(String(source.excerpt || source.body || "")))).toBe(true);
    expect(buildAmbiguousReferentClarification(question, [], sources)).toBeNull();
  });

  test("unsupported official cocked-die procedure gets a rules-gap reminder", () => {
    const question = "A die lands cocked against a card during a battle roll. Does published v0.7.1 define an official cocked-die reroll procedure?";
    const sources = augmented(question);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("genuine rules gap");
    expect(reminder).toContain("Classify the ruling provisional");
    expect(reminder).toContain("minimal usable table ruling");
  });
});

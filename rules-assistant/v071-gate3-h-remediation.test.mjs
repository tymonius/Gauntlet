import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  augmentRetrievalForContext,
  BEHAVIOR_REVISION,
  buildAmbiguousReferentClarification,
  buildQuestionSpecificAdjudicationReminder,
  contextualQuery,
  normalizeOutOfScopeAnswerR19
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

describe("Gate 3 tranche H r19 remediation", () => {
  test("bumps production behavior to r19", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260918-23");
  });

  test("does not ask which Proposal for the universal Stake/Leverage rule", () => {
    const question = "After my Terms are refused, can I spend the Influence still tied up in that Proposal's Stake on Leverage before dice?";
    const sources = augmented(question);
    expect(buildAmbiguousReferentClarification(question, [], sources)).toBeNull();
    expect(sources.some((source) =>
      String(source.body || source.excerpt || "").includes("Staked Influence cannot be spent as Leverage")
    )).toBe(true);
  });

  test("carries an active Special Operation into a Territory-capture follow-up", () => {
    const history = [
      { role: "user", content: "My Operation Progress is 4, the opponent controls 3 Territories, and I already started a Special Operation." },
      { role: "assistant", content: "It is currently ready because 4 exceeds 3, assuming its other requirements remain satisfied." }
    ];
    const question = "They capture another Territory before my Denouement. What happens now?";
    const sources = augmented(question, history);
    expect(sources[0]?.canonicalId).toBe("rulebook:readiness-and-completion");
    expect(String(sources[0]?.body || "")).toContain("If readiness is lost, it immediately fails and goes to the Graveyard");
  });

  test("adds a salient reminder not to replace a stated win with withdrawal", () => {
    const question = "win defense at zero command. can repel now?";
    const sources = augmented(question);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("The player explicitly states that the battle was won");
    expect(reminder).toContain("Do not substitute withdrawal");
    expect(sources.some((source) => /Repel/i.test(String(source.title || "")))).toBe(true);
    expect(sources.some((source) =>
      String(source.body || source.excerpt || "").includes("Newly gained Command may pay for an Order")
    )).toBe(true);
  });

  test("out-of-scope routing cannot fulfill creative work", () => {
    expect(normalizeOutOfScopeAnswerR19("Certainly: a line of flavor text.")).toBe(
      "That request is outside the Rules Arbiter's gameplay-rules scope."
    );
  });

  test("preserves deterministic clarification for genuinely ambiguous recent objects", () => {
    const history = [
      { role: "user", content: "I have Armistice and Tariffs banked." },
      { role: "assistant", content: "Both are Assets, but each has its own restriction on when it may leave play." }
    ];
    const question = "Can I discard that one during Denouement?";
    const clarification = buildAmbiguousReferentClarification(question, history, augmented(question, history));
    expect(clarification?.responseType).toBe("clarification");
    expect(clarification?.executionPath).toBe("deterministic-clarification");
  });
});

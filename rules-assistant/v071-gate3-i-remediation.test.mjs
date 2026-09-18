import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  augmentRetrievalForContext,
  BEHAVIOR_REVISION,
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

describe("Gate 3 tranche I r20 remediation", () => {
  test("bumps production behavior to r20", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260918-27");
  });

  test("literal +N Action shorthand prioritizes the card-shorthand Actions authority", () => {
    const question = "During Opening a card resolves '+1 Action'. I already used one Opening Action. May I take another Action in Opening?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:actions");
    expect(String(sources[0]?.body || "")).toContain("+N Action");
    expect(String(sources[0]?.body || "")).toContain("current phase");
    expect(sources.some((source) => source.canonicalId === "rulebook:additional-actions")).toBe(false);
  });

  test("reveal-zone questions prioritize Revealing cards and zones", () => {
    const question = "An effect makes me reveal my Hand to the opponent. Are those cards treated as leaving my Hand while they are revealed?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:revealing-cards-and-zones");
    expect(String(sources[0]?.body || "")).toContain("The cards remain in that zone");
  });

  test("baseline questions warn against applying an unstated optional card", () => {
    const question = "The opponent accepts a Proposal that was already ratified before I offered it. Do I gain the normal Influence reward for ratifying it again?";
    const sources = augmented(question);
    expect(sources.some((source) => String(source?.title || "").includes("Détente"))).toBe(true);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("normal/default rule");
    expect(reminder).toContain("did not state is present or active");
    expect(reminder).toContain("must not reverse the direct yes/no answer");
  });

  test("negative yes-no follow-ups get polarity discipline", () => {
    const history = [
      { role: "user", content: "Grand Inquisitor just used Final Judgment to Purge after winning." },
      { role: "assistant", content: "Final Judgment's Purge is directly permitted by the Leader Ability and does not spend an Action." }
    ];
    const question = "And does that stop me from using my normal Purge Action later?";
    const sources = augmented(question, history);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, history);
    expect(reminder).toContain("negative-form yes/no question");
    expect(reminder).toContain("answer No");
  });

  test("preserves r19 Special Operation follow-up retrieval", () => {
    const history = [
      { role: "user", content: "My Special Operation is already started. Operation Progress is 5 and the opponent controls 4 Territories." },
      { role: "assistant", content: "It is ready while 5 exceeds 4, assuming its printed requirement is otherwise satisfied." }
    ];
    const sources = augmented("They take one more Territory, so now it's 5 to 5. What happens to the operation?", history);
    expect(sources[0]?.canonicalId).toBe("rulebook:readiness-and-completion");
  });
});

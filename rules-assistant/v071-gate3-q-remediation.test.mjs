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

describe("Gate 3 tranche Q r28 remediation", () => {
  test("bumps production behavior to r28", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260922-34");
  });

  test("replacement language with 'instead' is treated as replacement, not addition", () => {
    const question = "A Territory with Demilitarized Zone would be captured. What happens to the Overlay and the capture?";
    const sources = augmented(question);
    expect(sources.some((source) => source.canonicalId === "card:diplomats-demilitarized-zone")).toBe(true);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("do Y instead");
    expect(reminder).toContain("Y replace X");
    expect(reminder).toContain("Do not also apply X");
  });

  test("optional cost then benefit preserves the activation condition", () => {
    const question = "I lose a battle only after a Tiebreak Roll. Can Actuarial Alchemy measure the loss margin from that Tiebreak Roll?";
    const sources = augmented(question);
    expect(sources.some((source) => source.canonicalId === "card:financiers-actuarial-alchemy")).toBe(true);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("optional activation or cost");
    expect(reminder).toContain("preserve that activation condition");
  });

  test("longer declarative confirmation questions get polarity discipline", () => {
    const question = "strategic withdrawal in denouement after movement ended starts a new 1-position movement sequence?";
    const sources = augmented(question);
    expect(sources.some((source) => source.canonicalId === "card:neutral-strategic-withdrawal")).toBe(true);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("declarative player-language question");
    expect(reminder).toContain("Do not begin with No and then restate the proposition as true");
  });

  test("ordinary wh-questions are not misclassified as declarative confirmations", () => {
    const question = "What happens when Strategic Withdrawal is played during Denouement after normal Movement has ended?";
    const sources = augmented(question);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).not.toContain("declarative player-language question");
  });
});

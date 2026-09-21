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

function textOf(source) {
  return [source?.title, source?.heading, source?.body, source?.excerpt]
    .map((value) => String(value || ""))
    .join("\n");
}

describe("Gate 3 tranche O r26 remediation", () => {
  test("bumps production behavior to r26", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260921-33");
  });

  test("Counterworks terse Overlay questions preserve the discard activation condition", () => {
    const question = "counterworks stops an opposing overlay and discards the overlay card?";
    const sources = augmented(question);
    expect(sources.some((source) =>
      source.canonicalId === "card:neutral-counterworks"
      && /you may discard this card to prevent that Overlay/i.test(textOf(source))
    )).toBe(true);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("requires discarding Counterworks");
    expect(reminder).toContain("Do not describe the prevention as automatic or passive");
  });

  test("Counterworks into Bombardment keeps the same activation condition", () => {
    const question = "counterworks into their bombardment overlay: bombardment gets discarded?";
    const sources = augmented(question);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("the player may discard Counterworks to prevent the Overlay");
  });
});

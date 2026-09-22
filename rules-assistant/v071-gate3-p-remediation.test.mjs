import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  augmentRetrievalForContext,
  BEHAVIOR_REVISION,
  buildQuestionSpecificAdjudicationReminder,
  contextualQuery
} from "./worker-v071.js";
import {
  normalizeR13RulingStatus,
  shouldResolveR27CombinedInteraction
} from "./r13-classification.js";

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

describe("Gate 3 tranche P r27 remediation", () => {
  test("bumps production behavior to r27", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260922-34");
  });

  test("wrong-first-player rollback request is a provisional gap", () => {
    const question = "We accidentally let the wrong player take the first turn and only noticed during that turn's Denouement. Does published v0.7.1 define an official rollback or repair procedure?";
    const sources = augmented(question);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("provisional");
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("genuine rules gap");
    expect(reminder).toContain("Classify the ruling provisional");
    expect(reminder).toContain("minimal usable table ruling");
  });

  test("Reinforcements plus +N Action phase meaning is combined-authority inferred", () => {
    const question = "During Denouement I discard banked Reinforcements for its +1 Action. Is that extra Action available in Denouement immediately?";
    const sources = augmented(question);
    expect(sources.some((source) => source.canonicalId === "card:neutral-reinforcements")).toBe(true);
    expect(sources.some((source) => source.canonicalId === "rulebook:actions")).toBe(true);
    expect(shouldResolveR27CombinedInteraction(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
    expect(buildQuestionSpecificAdjudicationReminder(question, sources, [])).toContain("Classify the ruling inferred");
  });

  test("terse Reinforcements phase question is also inferred", () => {
    const question = "discard reinforcements in denouement for +1 action, so that extra action is usable right there in denouement?";
    const sources = augmented(question);
    expect(shouldResolveR27CombinedInteraction(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("inferred");
  });

  test("direct +N Action definition by itself remains explicit", () => {
    const question = "What does +1 Action mean during a phase?";
    const sources = augmented(question);
    expect(shouldResolveR27CombinedInteraction(question, sources)).toBe(false);
    expect(normalizeR13RulingStatus("explicit", question, sources)).toBe("explicit");
  });
});

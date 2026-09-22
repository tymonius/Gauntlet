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

describe("Gate 3 tranche M r24 remediation", () => {
  test("bumps production behavior to r24", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260922-34");
  });

  test("Diplomat mirror question prioritizes the one-offer rule", () => {
    const question = "The attacking Diplomat passes on offering Terms, so the defending Diplomat offers a Proposal and it is refused. Can the attacker now offer Terms in that same battle sequence?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:diplomat-mirrors");
    expect(textOf(sources[0])).toContain("Once either player offers Terms, the other cannot offer Terms in that battle sequence");
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("explicitly named Diplomatic Recognition prevents false Proposal clarification", () => {
    const question = "Diplomatic Recognition is refused and the Diplomat later wins. Do they gain Influence for imposing that Proposal?";
    const sources = augmented(question);
    expect(buildAmbiguousReferentClarification(question, [], sources)).toBeNull();
    expect(sources.some((source) =>
      /Diplomatic Recognition/i.test(textOf(source))
      && /No Influence for imposing this Proposal/i.test(textOf(source))
    )).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("explicitly named Smuggler's Run prevents false Territory clarification", () => {
    const question = "I stashed a card beneath Smuggler's Run, then I lose control of that Territory before returning the card to Hand. What happens to the stashed card?";
    const sources = augmented(question);
    expect(buildAmbiguousReferentClarification(question, [], sources)).toBeNull();
    expect(sources.some((source) =>
      /Smuggler's Run/i.test(textOf(source))
      && /If they lose control, it is discarded/i.test(textOf(source))
    )).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("terse Asset-limit replacement prioritizes the replacement procedure", () => {
    const question = "at asset cap, ditch one to bank new one. extra action?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:replacing-an-asset");
    expect(textOf(sources[0])).toContain("This replacement is not a separate Action");
    expect(buildQuestionSpecificAdjudicationReminder(question, sources, [])).toContain("not a separate Action");
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("Ritual withdrawal is direct explicit authority", () => {
    const question = "ritual running, i withdraw. no completion and no interruption?";
    const sources = augmented(question);
    expect(sources.some((source) => /Withdrawal neither completes nor interrupts the Ritual/i.test(textOf(source)))).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("literal +1 Action shorthand remains current-phase shorthand", () => {
    const question = "generic +1 action means one opening one denouement, not both opening?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:actions");
    expect(textOf(sources[0])).toContain("+N Action grants N additional Actions during the current phase");
  });
});

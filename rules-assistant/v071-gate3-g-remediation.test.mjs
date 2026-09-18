import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  normalizeR13RulingStatus,
  shouldPromoteR18DirectProcedure
} from "./r13-classification.js";
import {
  augmentRetrievalForContext,
  BEHAVIOR_REVISION,
  buildAmbiguousReferentClarification,
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

describe("Gate 3 tranche G r18 remediation", () => {
  test("bumps production behavior to r18", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260918-28");
  });

  test("resolves a locally introduced banked Asset instead of asking which Asset", () => {
    const question = "My Asset limit drops from 3 to 2, so I choose one banked Asset to discard. Is that Asset considered Removed even though I chose which one?";
    expect(buildAmbiguousReferentClarification(question, [], augmented(question))).toBeNull();
  });

  test("resolves the nearest locally introduced card instead of asking which card", () => {
    const question = "A battle card says to return another card to its source. If that card entered battle from Hand rather than Reserve, where does it go?";
    expect(buildAmbiguousReferentClarification(question, [], augmented(question))).toBeNull();
  });

  test("still asks which of two recent Mission cards 'that one' means", () => {
    const history = [
      { role: "user", content: "I have Fog of War and Treason in Hand and both have Mission text." },
      { role: "assistant", content: "Each may be eligible to start as a normal Mission if its printed Mission requirement is usable." }
    ];
    const question = "Can that one start as a Special Operation?";
    const sources = augmented(question, history);
    const clarification = buildAmbiguousReferentClarification(question, history, sources);
    expect(clarification?.responseType).toBe("clarification");
    expect(clarification?.executionPath).toBe("deterministic-clarification");
  });

  test("prioritizes Starting Territory for terse setup-entry questions", () => {
    const question = "setup token placement triggers enter effects?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:starting-territory");
    expect(shouldPromoteR18DirectProcedure(question, sources)).toBe(true);
    expect(normalizeR13RulingStatus("provisional", question, sources)).toBe("explicit");
  });

  test("prioritizes the Mission abort procedure over generic Intel material", () => {
    const question = "I pay Intel to abort my Active Mission. Does that count as the Mission failing and send it to the Graveyard?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:aborting-and-failing");
    expect(String(sources[0]?.body || "")).toContain("Aborting is not failure");
    expect(normalizeR13RulingStatus("provisional", question, sources)).toBe("explicit");
  });

  test("prioritizes Peace Treaty timing for terse six-treaty victory questions", () => {
    const question = "six treaties during their turn. instant win?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:treaty-articles-and-peace-treaty");
    expect(normalizeR13RulingStatus("provisional", question, sources)).toBe("explicit");
  });

  test("prioritizes direct follow-up battle authority for Rout", () => {
    const question = "General uses Rout at the end of an Aftermath and that advance starts another battle. Is the new battle treated as a continuation of the old one for Gambits and once-per-battle opportunities?";
    const sources = augmented(question);
    expect(sources[0]?.canonicalId).toBe("rulebook:initiating-battles");
    expect(normalizeR13RulingStatus("provisional", question, sources)).toBe("explicit");
  });

  test("keeps a direct Rite of Shattering follow-up explicit", () => {
    const history = [
      { role: "user", content: "My Rite of Shattering is active from last turn. Which battle gets its advantage?" },
      { role: "assistant", content: "It applies in the first battle on a later turn that reaches dice." }
    ];
    const question = "What if that first battle ends before dice?";
    const sources = augmented(question, history);
    expect(sources.some((source) => /Rite of Shattering/i.test(source.title))).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("keeps the terse Rite of Echoes loss procedure explicit", () => {
    const question = "lose before echoes completes. bound cards where?";
    const sources = augmented(question);
    expect(sources.some((source) => /Rite of Echoes/i.test(source.title))).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("does not encode the frozen tranche G +1 Action benchmark error", () => {
    const question = "+1 action means two denouement actions?";
    const sources = augmented(question);
    expect(sources.some((source) => String(source.body || "").includes("during the current phase"))).toBe(true);
  });

  test("does not change the explicit harmful-consequence No Martyrs rule", () => {
    const question = "No Martyrs is active after my opponent loses. Does it prevent a harmful effect they control that triggers from that loss?";
    const sources = augmented(question);
    expect(sources.some((source) => /No Martyrs/i.test(source.title))).toBe(true);
    expect(sources.some((source) => String(source.body || "").includes("does not prevent harmful consequences"))).toBe(true);
  });
});

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

function sourceText(source) {
  return [source?.title, source?.heading, source?.body, source?.excerpt]
    .map((value) => String(value || ""))
    .join("\n");
}

describe("Gate 3 tranche J r21 remediation", () => {
  test("bumps production behavior to r21", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260918-21");
  });

  test("generic Gambit-role questions do not trigger referent clarification", () => {
    const question = "A card has a printed Gambit effect but no Tactic or Gambit/Tactic heading. Can I choose it as a Tactic and use that Gambit text?";
    const sources = augmented(question);
    expect(buildAmbiguousReferentClarification(question, [], sources)).toBeNull();
    expect(sourceText(sources[0])).toContain("Gambit means the effect is available only when the card is committed as a Gambit");
  });

  test("no-winner clearing reminder preserves remaining Reserve cards", () => {
    const question = "A battle ends without a winner after Gambits and Tactics were already committed. Unless the ending effect says otherwise, do those cards still clear normally?";
    const sources = augmented(question);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("cards remaining in Reserve");
  });

  test("Capital-limit math prioritizes the governing formula", () => {
    const sources = augmented("I control 3 Territories and my Treasury contains cards totaling value 5. What is my current Capital limit?");
    expect(sources.some((source) =>
      /Capital limit[\s\S]*Territories you control plus total card value in Treasury/i.test(sourceText(source))
    )).toBe(true);
  });

  test("Fieldcraft cost lookup retrieves the 1 Intel leader ability", () => {
    const sources = augmented("How much Intel does Ranger spend to use Fieldcraft?");
    expect(sources.some((source) => /Fieldcraft\s+[—-]\s+1 Intel/i.test(sourceText(source)))).toBe(true);
  });

  test("Guardians battle-loss protection is direct authority", () => {
    const question = "Spirit Walker is in the Ritual of Ascension and would lose a battle, interrupting the Ritual. Can Guardians of the Circle prevent that interruption if its sacrifice requirement is met?";
    const sources = augmented(question);
    expect(sources.some((source) =>
      /Guardians of the Circle[\s\S]*Battle loss would interrupt Rite or Ritual[\s\S]*prevent that interruption/i.test(sourceText(source))
    )).toBe(true);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("explicit");
  });

  test("Assimilation plus Protracted Siege retrieves Front Line capture authority", () => {
    const question = "I win as attacker on an enemy-controlled Territory and use Assimilation to advance my Front Line instead of occupying. The defender has Protracted Siege ready to prevent that capture. Can Protracted Siege stop the Front Line advance?";
    const sources = augmented(question);
    expect(sources.some((source) => /Assimilation/i.test(sourceText(source)) && /advance Front Line 1/i.test(sourceText(source)))).toBe(true);
    expect(sources.some((source) => /Protracted Siege/i.test(sourceText(source)) && /prevent that capture/i.test(sourceText(source)))).toBe(true);
    expect(sources.some((source) =>
      /Normal Capture|Immediate capture effects|capture it by rotating it|Front Line is the complete unbroken sequence/i.test(sourceText(source))
    )).toBe(true);
    expect(buildQuestionSpecificAdjudicationReminder(question, sources, [])).toContain("capture/control change");
  });

  test("Exfiltration losing-trigger interaction retrieves no-winner authority", () => {
    const question = "Intelligence uses Exfiltration to withdraw after opposing Tactics are revealed. Does an opposing effect that triggers only when Intelligence loses the battle still trigger?";
    const sources = augmented(question);
    expect(sources.some((source) => /Exfiltration/i.test(sourceText(source)) && /discard this card to withdraw/i.test(sourceText(source)))).toBe(true);
    expect(sources.some((source) => /withdrawal is not a loss/i.test(sourceText(source)))).toBe(true);
    expect(normalizeR13RulingStatus("provisional", question, sources)).toBe("inferred");
  });

  test("Rearguard plus Rout preserves the stated Order use and retrieves both authorities", () => {
    const question = "Military loses, retreats, and banks Rearguard. Later that turn the opposing General uses Rout to enter Military's Position. Can Rearguard prevent that movement without the General spending the Command anyway?";
    const sources = augmented(question);
    expect(sources.some((source) => /Rearguard/i.test(sourceText(source)) && /No Command is spent/i.test(sourceText(source)))).toBe(true);
    expect(sources.some((source) => /Rout/i.test(sourceText(source)) && /2 Command/i.test(sourceText(source)))).toBe(true);
    expect(buildQuestionSpecificAdjudicationReminder(question, sources, [])).toContain("do not re-litigate Rout's earlier win prerequisite");
  });

  test("literal +N Action follow-up carries shorthand authority from immediate history", () => {
    const history = [
      { role: "user", content: "The card literally says +1 Action and I resolved it during Opening after taking an Action." },
      { role: "assistant", content: "That literal shorthand is governed by the +N Action notation rule." }
    ];
    const sources = augmented("So that doesn't force me to wait until Denouement for the extra Action?", history);
    expect(sources[0]?.canonicalId).toBe("rulebook:actions");
    expect(sourceText(sources[0])).toContain("current phase");
    expect(sources.some((source) => source.canonicalId === "rulebook:additional-actions")).toBe(false);
  });

  test("reveal-zone follow-up carries reveal authority from immediate history", () => {
    const history = [
      { role: "user", content: "An effect tells me to reveal my whole Reserve." },
      { role: "assistant", content: "Reveal the Reserve by showing the entire zone to the opponent." }
    ];
    const sources = augmented("And while it's face up for them to see, is it still my Reserve?", history);
    expect(sources[0]?.canonicalId).toBe("rulebook:revealing-cards-and-zones");
    expect(sourceText(sources[0])).toContain("The cards remain in that zone");
  });

  test("missed-trigger rewind questions remain provisional when no procedure exists", () => {
    const question = "We both forgot a mandatory start-of-turn trigger and only noticed after several later actions. Does v0.7.1 define an official rewind procedure?";
    const sources = augmented(question);
    expect(normalizeR13RulingStatus("inferred", question, sources)).toBe("provisional");
  });

  test("terse Diplomatic Latitude player language retrieves the specific card", () => {
    const sources = augmented("latitude got refused. both refused effects?");
    expect(sources.some((source) =>
      /Diplomatic Latitude/i.test(sourceText(source))
      && /Choose one Proposal before applying its Refused effect/i.test(sourceText(source))
    )).toBe(true);
  });

  test("ASCII Detente player language retrieves Détente", () => {
    const sources = augmented("detente banked, old proposal accepted. +1 influence?");
    expect(sources.some((source) =>
      /Détente/i.test(sourceText(source))
      && /already ratified when you offered it, \+1 Influence/i.test(sourceText(source))
    )).toBe(true);
  });

  test("special op shorthand retrieves the minimum 1 Intel completion rule", () => {
    const sources = augmented("special op math says 0 intel. still pay 1?");
    expect(sources.some((source) => /Minimum payment is 1 Intel/i.test(sourceText(source)))).toBe(true);
  });

  test("terse proposition reminder enforces yes-no polarity", () => {
    const question = "3 conviction purge hits their hand?";
    const sources = augmented(question);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("begin with Yes");
    expect(reminder).toContain("Do not begin with No");
  });
});

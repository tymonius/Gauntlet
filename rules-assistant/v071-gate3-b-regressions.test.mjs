import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  BEHAVIOR_REVISION,
  buildAmbiguousReferentClarification,
  buildQuestionSpecificAdjudicationReminder
} from "./worker-v071.js";

const workerSource = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");

function source(canonicalId, title, excerpt = "") {
  return { id: "S1", canonicalId, title, heading: title, excerpt, body: excerpt, sourcePath: "test" };
}

describe("v0.7.1 Gate 3 blind B promoted regressions", () => {
  test("pins r11 behavior", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260918-29");
  });

  test("duplicate sources for one named ability suppress generic-card clarification", () => {
    const retrieval = [
      source("leader:fieldcraft", "Leader: Ranger — Fieldcraft", "Fieldcraft applies to printed Territory effects."),
      { ...source("faction:fieldcraft", "Faction: Fieldcraft", "Fieldcraft applies to printed Territory effects."), id: "S2" }
    ];
    expect(buildAmbiguousReferentClarification(
      "Fieldcraft is the governing ability here. Does that card effect fall within Fieldcraft?",
      [],
      retrieval
    )).toBeNull();
  });

  test("duplicate sources for one named ability produce one governing-authority reminder", () => {
    const retrieval = [
      source("leader:fieldcraft", "Leader: Ranger — Fieldcraft", "Fieldcraft applies to printed Territory effects."),
      { ...source("faction:fieldcraft", "Faction: Fieldcraft", "Fieldcraft applies to printed Territory effects."), id: "S2" }
    ];
    const reminder = buildQuestionSpecificAdjudicationReminder(
      "Fieldcraft is the governing ability here. Does that card effect fall within Fieldcraft?",
      retrieval
    );
    expect(reminder).toContain("explicitly names a supplied governing authority");
  });

  test("one explicitly named governing card suppresses generic-effect clarification", () => {
    const retrieval = [source("card:intelligence-subversion", "Card: Subversion", "Subversion negates an opposing Asset effect.")];
    expect(buildAmbiguousReferentClarification(
      "Subversion is the card I am using. What happens to that effect?",
      [],
      retrieval
    )).toBeNull();
  });

  test("two explicitly named candidate cards remain ambiguous", () => {
    const retrieval = [
      source("card:neutral-forced-march", "Card: Forced March"),
      { ...source("card:military-give-chase", "Card: Give Chase"), id: "S2" }
    ];
    const history = [
      { role: "user", content: "Forced March and Give Chase are both involved." },
      { role: "assistant", content: "They have different movement instructions." }
    ];
    const result = buildAmbiguousReferentClarification(
      "Forced March and Give Chase are both in play. Can that card start another battle?",
      history,
      retrieval
    );
    expect(result?.responseType).toBe("clarification");
    expect(result?.executionPath).toBe("deterministic-clarification");
  });

  test("a single named component gets the direct-authority anti-invention reminder", () => {
    const reminder = buildQuestionSpecificAdjudicationReminder(
      "Spies revealed the opposing Tactics. What may I do now?",
      [source("card:intelligence-spies", "Card: Spies", "Reveal opposing face-down Tactics. You may then revise your own Tactics or withdraw.")]
    );
    expect(reminder).toContain("explicitly names a supplied governing authority");
    expect(reminder).toContain("classify the ruling explicit");
    expect(reminder).toContain("Do not invent additional procedure");
  });

  test("r11 preserves direct classification and player-stated game state", () => {
    expect(workerSource).toContain("Do not downgrade a directly stated result to inferred merely because other retrieved sources are present");
    expect(workerSource).toContain("Directly enumerated consequences of one rule or effect remain explicit");
    expect(workerSource).toContain("Treat concrete game-state facts stated by the player as premises");
    expect(workerSource).toContain("do not silently replace a stated win with a withdrawal, loss, or other alternative event");
    expect(workerSource).toContain('Resolve possessives such as "their Territory" or "their land" from their grammatical antecedent');
  });
});

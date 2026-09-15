import { describe, expect, test } from "vitest";
import {
  buildGate3CAdjudicationReminder,
  hasReferentialFollowupCue,
  hasTerseSurveillanceLanguage,
  isOccupationControlQuestion,
  recentNamedAuthority,
  shouldCarryImmediateHistory
} from "./v071-gate3-c-remediation.js";

function source(canonicalId, title, excerpt = "") {
  return { id: "S1", canonicalId, title, heading: title.replace(/^(?:Card|Faction):\s*/i, ""), excerpt };
}

describe("v0.7.1 Gate 3 tranche C remediation helpers", () => {
  test("keeps a natural long referential follow-up in immediate context", () => {
    const advanceGuard = "If that extra step is the one that starts the fight, can I still put down a Gambit?";
    const confession = "After I peek at theirs, can I pull this one back into Reserve and pick a different Tactic?";
    expect(hasReferentialFollowupCue(advanceGuard)).toBe(true);
    expect(hasReferentialFollowupCue(confession)).toBe(true);
    expect(shouldCarryImmediateHistory(advanceGuard)).toBe(true);
    expect(shouldCarryImmediateHistory(confession)).toBe(true);
  });

  test("does not treat a relative clause in a self-contained long question as conversation context", () => {
    const question = "Can Intelligence interfere with a Gambit that was already face up?";
    expect(hasReferentialFollowupCue(question)).toBe(true);
    expect(shouldCarryImmediateHistory(question)).toBe(false);
  });

  test("does not carry history across an explicit topic pivot", () => {
    const question = "Separate issue: this Territory effect is slowing my Ranger. How long does Fieldcraft shut that effect off?";
    expect(hasReferentialFollowupCue(question)).toBe(false);
    expect(shouldCarryImmediateHistory(question)).toBe(false);
  });

  test("recognizes terse player language for Surveillance only when a battle commitment is named", () => {
    expect(hasTerseSurveillanceLanguage("i watched their gambit already, can i watch tactics too")).toBe(true);
    expect(hasTerseSurveillanceLanguage("I watched the board all turn")).toBe(false);
  });

  test("recognizes the battle-win versus Territory-control distinction", () => {
    expect(isOccupationControlQuestion(
      "I win an attack on an enemy-controlled Territory and remain there. Does that battle win itself give me control of the Territory?"
    )).toBe(true);
    expect(isOccupationControlQuestion("How many Territories do I control?" )).toBe(false);
  });

  test("identifies the single named authority in the immediately preceding exchange", () => {
    const sources = [
      source("card:neutral-advance-guard", "Card: Advance Guard", "Move one additional Position."),
      source("rulebook:battle-sequence", "Battle Sequence", "Set Gambits after Onset.")
    ];
    const history = [
      { role: "user", content: "I played Advance Guard during Opening. What does the movement part do?" },
      { role: "assistant", content: "During your Movement this turn, Advance Guard may move you one additional Position." }
    ];
    const question = "If that extra step is the one that starts the fight, can I still put down a Gambit?";
    expect(recentNamedAuthority(sources, history, question)?.canonicalId).toBe("card:neutral-advance-guard");
    expect(buildGate3CAdjudicationReminder(question, sources, history)).toContain("Advance Guard");
    expect(buildGate3CAdjudicationReminder(question, sources, history)).toContain("include its source ID");
  });

  test("does not preserve a prior authority when the player explicitly pivots", () => {
    const sources = [source("card:neutral-advance-guard", "Card: Advance Guard")];
    const history = [
      { role: "user", content: "How does Advance Guard work?" },
      { role: "assistant", content: "It grants additional movement during Movement." }
    ];
    expect(recentNamedAuthority(
      sources,
      history,
      "Separate issue: this Territory is slowing my Ranger. How long does Fieldcraft last?"
    )).toBe(null);
  });

  test("warns before generation when a transformed state is referenced but undefined", () => {
    const sources = [
      source(
        "card:neutral-bombardment",
        "Card: Bombardment",
        "Overlay: This Territory's printed effect is inactive. Win — turn this Overlay into Ruins."
      ),
      source(
        "rulebook:complete-rules-15",
        "12. Overlays and Other Shared Card Rules › Complete rules",
        "An Overlay is a persistent card attached to a Territory."
      )
    ];
    const question = "Bombardment can tell me to turn its Overlay into Ruins. What rules does published v0.7.1 give for what a Ruins Overlay actually does after that transformation?";
    const reminder = buildGate3CAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("does not define what that resulting state does");
    expect(reminder).toContain("classify the ruling provisional");
    expect(reminder).toContain("Do not inherit the pre-transformation card text");
  });
});
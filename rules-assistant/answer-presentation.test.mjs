import { expect, test } from "vitest";
import { presentRulesAnswer } from "./answer-presentation.js";

test("territory capture leads with only the requested timing", () => {
  const presented = presentRulesAnswer({
    answer: "Winning an attack on an opposing Territory normally makes you its occupier; it does not capture the Territory immediately. If you are still the occupier at the start of your next turn, capture it during the Capture step by rotating it to face you. A specific effect may cause an earlier capture.",
    subject: "Territory capture",
    topic: "Capture step"
  });

  expect(presented.answer).toBe("An occupied Territory is captured at the start of the occupier’s next turn, provided they are still occupying it.");
  expect(presented.answer).not.toContain("Counterattack");
  expect(presented.details).toContain("Counterattack");
});

test("Defender's Advantage keeps Last Stand information collapsed", () => {
  const presented = presentRulesAnswer({
    answer: "Defender's Advantage is a tie rule, not ordinary advantage. If battle totals are tied and the defender controls the contested Territory, the defender wins. It does not grant an additional die. It also applies during a Last Stand battle; the separate Last Stand +1 bonus still applies as well.",
    subject: "Defender's Advantage",
    topic: "tied battle total"
  });

  expect(presented.answer).toContain("defender wins");
  expect(presented.answer).not.toContain("Last Stand");
  expect(presented.details).toContain("Last Stand");
});

test("Surveillance overview remains useful without leading with every exception", () => {
  const presented = presentRulesAnswer({
    answer: "Surveillance gives Intelligence two independent once-per-battle opportunities. After the opponent sets a face-down Gambit, spend 1 Intel to reveal it. After the opponent chooses one or more face-down Tactics, spend 1 Intel for each opposing Tactic you reveal. Immediately after a Surveillance reveal, you may spend 2 additional Intel per revealed card to Interfere.",
    subject: "Surveillance",
    topic: "overview"
  });

  expect(presented.answer).toContain("1 Intel per card");
  expect(presented.answer.length).toBeLessThan(280);
  expect(presented.details).toContain("Interfere");
});

test("unknown long answers use generic progressive disclosure", () => {
  const presented = presentRulesAnswer({
    answer: "The direct ruling is that the first effect resolves now. This qualification is necessary to apply it correctly. An unrelated adjacent exception is still available for reference. Another edge case also exists but was not asked about.",
    rulingStatus: "inferred"
  });

  expect(presented.answer).toBe("The direct ruling is that the first effect resolves now. This qualification is necessary to apply it correctly.");
  expect(presented.details).toContain("unrelated adjacent exception");
});

test("provisional scope remains visible even when rationale is collapsed", () => {
  const presented = presentRulesAnswer({
    answer: "Provisional Arbiter Ruling: Choose the legal option. The rules do not expressly resolve this interaction. Use this ruling for the rest of this game; it has been logged for designer review. Additional analogous rules support the choice.",
    rulingStatus: "provisional"
  });

  expect(presented.answer).toContain("rest of this game");
  expect(presented.details).toContain("analogous rules");
});

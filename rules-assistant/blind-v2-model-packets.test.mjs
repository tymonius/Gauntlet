import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildRulesCorpus } from "./local-search.js";
import { analyzeQuestionLocally } from "./rules-intelligence.js";
import { enrichPlanFromEntityDocuments } from "./rules-plan-enrichment.js";
import { buildRulePacket } from "./rules-packets.js";
import { resolveDeterministicRuling } from "./rules-deterministic.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md", import.meta.url),
  "utf8"
);
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown });

function planAndPacket(question, history = []) {
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question, history));
  return {
    plan,
    packet: buildRulePacket(corpus, { question, history, plan })
  };
}

test("Operational Reassessment packet supplies role, timing, destination, and explicit classification guidance", () => {
  const start = planAndPacket(
    "Operational Reassessment is my Gambit. After Tactics are revealed, I replace it with an eligible Battle card from my Hand. What happens to both cards?"
  );
  expect(start.packet.id).toBe("operational-reassessment");
  expect(start.packet.sourceIds).toContain("card:intelligence-operational-reassessment");
  expect(start.packet.requiredClaims.join(" ")).toContain("same Gambit or Tactic role");
  expect(start.packet.scopeNotes.join(" ")).toContain("classify them explicit");

  const history = [
    { role: "user", content: "Operational Reassessment is my Gambit.", subject: "Operational Reassessment" },
    { role: "assistant", content: "It is replaced face up in the same role.", subject: "Operational Reassessment", rulingStatus: "explicit" }
  ];
  const followup = planAndPacket(
    "Can that replacement apply a Gambit effect whose reveal timing has already passed?",
    history
  );
  expect(followup.packet.id).toBe("operational-reassessment");
  expect(followup.packet.requiredClaims.join(" ")).toContain("does not reopen");
});

test("Margin Loan packet keeps its Battle effect separate from its banked Action form", () => {
  const start = planAndPacket(
    "I use Margin Loan's Battle effect, place a card beneath it as collateral, and then withdraw from the battle. What happens to Margin Loan and the collateral?"
  );
  expect(start.packet.id).toBe("margin-loan");
  expect(start.packet.sourceIds).toContain("card:financiers-margin-loan");
  expect(start.packet.requiredClaims.join(" ")).toContain("go to the Graveyard");
  expect(start.packet.forbiddenClaims.join(" ")).toContain("remains banked");
  expect(resolveDeterministicRuling(corpus, {
    question: "I use Margin Loan's Battle effect, place a card beneath it as collateral, and then withdraw from the battle. What happens to Margin Loan and the collateral?",
    history: [],
    plan: start.plan,
    packet: start.packet
  })).toBeNull();

  const history = [
    { role: "user", content: "I used Margin Loan as a Battle card.", subject: "Margin Loan", topic: "battle effect" },
    { role: "assistant", content: "If you do not win, both cards go to the Graveyard.", subject: "Margin Loan", topic: "battle effect", rulingStatus: "explicit" }
  ];
  const followup = planAndPacket("What if I win instead?", history);
  expect(followup.packet.id).toBe("margin-loan");
  expect(followup.packet.requiredClaims.join(" ")).toContain("collateral to Hand");
  expect(followup.packet.requiredClaims.join(" ")).toContain("Tactic to Discard Pile");
});

test("Capital Punishment packet marks its absent-target ruling as explicit", () => {
  const { packet } = planAndPacket(
    "I won a battle this turn, but my opponent controls no Assets. Can I play Capital Punishment for its Action and simply choose nothing?"
  );
  expect(packet.id).toBe("capital-punishment");
  expect(packet.sourceIds).toEqual(expect.arrayContaining([
    "card:neutral-capital-punishment",
    "rulebook:action-effects"
  ]));
  expect(packet.scopeNotes.join(" ")).toContain("classify it explicit");
  expect(packet.forbiddenClaims.join(" ")).toContain("choosing no target");
});

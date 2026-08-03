import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildRulesCorpus } from "./local-search.js";
import { analyzeQuestionLocally } from "./rules-intelligence.js";
import { enrichPlanFromEntityDocuments } from "./rules-plan-enrichment.js";
import { buildRulePacket } from "./rules-packets.js";
import { resolveDeterministicRuling } from "./rules-deterministic.js";
import { buildOutOfScopeRuling, isClearlyOutOfScopeQuestion } from "./rules-status.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md", import.meta.url),
  "utf8"
);
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown });

function resolve(question, history = []) {
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question, history));
  const packet = buildRulePacket(corpus, { question, history, plan });
  return resolveDeterministicRuling(corpus, { question, history, plan, packet });
}

test("clear lore and morality questions are rejected before retrieval", () => {
  expect(isClearlyOutOfScopeQuestion("Is the Witch Hunter morally justified in pursuing alleged heretics?"))
    .toBe(true);
  expect(buildOutOfScopeRuling().rulingStatus).toBe("out_of_scope");
  expect(isClearlyOutOfScopeQuestion("When may the Witch Hunter use Relentless Pursuit?"))
    .toBe(false);
});

test("withdrawal never becomes a loss trigger for Valor", () => {
  const ruling = resolve("I withdrew from a battle. Does my banked Valor trigger because I lost the battle?");
  expect(ruling?.rulingStatus).toBe("explicit");
  expect(ruling?.answer).toContain("without a winner or loser");
  expect(ruling?.answer).toContain("does not trigger");
});

test("Commandant gains Command and may spend it on Repel in the same Aftermath", () => {
  const ruling = resolve("I am the Commandant and win my first battle of the turn while defending during my opponent's turn. Do I gain Command, and can that newly gained Command pay for Repel in the same Aftermath?");
  expect(ruling?.rulingStatus).toBe("explicit");
  expect(ruling?.answer).toMatch(/^Yes\./);
  expect(ruling?.answer).toContain("same Aftermath");
});

test("an Active Mission cannot complete on its starting turn", () => {
  const ruling = resolve("I satisfy my Active Mission during the turn I started it. May I complete it after movement that turn?");
  expect(ruling?.rulingStatus).toBe("explicit");
  expect(ruling?.answer).toMatch(/^No\./);
  expect(ruling?.answer).toContain("cannot complete during the turn it begins");
});

test("Safe Conduct prevents Political Capital from triggering", () => {
  const ruling = resolve("Switching subjects: if Safe Conduct makes me withdraw, does Political Capital still trigger?");
  expect(ruling?.rulingStatus).toBe("explicit");
  expect(ruling?.answer).toMatch(/^No\./);
  expect(ruling?.answer).toContain("returns your staked Influence");
});

test("explicit status cases resolve deterministically", () => {
  expect(resolve("After the defender retreats, do attacker and defender remain fixed through the Aftermath?")?.rulingStatus)
    .toBe("explicit");
  expect(resolve("Fortifications lets me choose two Tactics. May I choose one, see the opponent's choice, and then choose the second?")?.rulingStatus)
    .toBe("explicit");
  expect(resolve("The opponent turns an existing face-down Asset face up. Does my banked Rousing Speech trigger?")?.rulingStatus)
    .toBe("explicit");
  expect(resolve("Can Fieldcraft ignore an effect that changes control of a Territory?")?.rulingStatus)
    .toBe("explicit");
});

test("new packets include the exact governing component sections", () => {
  const questions = [
    ["Does withdrawal trigger Valor?", "withdrawal"],
    ["Can the Commandant use Repel?", "commandant-repel"],
    ["Can an Active Mission complete immediately?", "active-mission"],
    ["Does Political Capital trigger after Safe Conduct?", "political-capital"],
    ["Can Fieldcraft change control?", "fieldcraft"]
  ];
  for (const [question, id] of questions) {
    const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question));
    expect(buildRulePacket(corpus, { question, plan }).id).toBe(id);
  }
});

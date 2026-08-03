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

function analyze(question) {
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question));
  const packet = buildRulePacket(corpus, { question, plan });
  const ruling = resolveDeterministicRuling(corpus, { question, plan, packet });
  return { packet, ruling };
}

test("copied cost-1 effects do not trigger Resourcefulness", () => {
  const { packet, ruling } = analyze(
    "I copy the Battle effect of a cost-1 card without playing, setting, or choosing that cost-1 card again. Does Resourcefulness draw me a card?"
  );

  expect(packet.id).toBe("resourcefulness");
  expect(ruling?.rulingStatus).toBe("explicit");
  expect(ruling?.answer).toMatch(/^No\./);
  expect(ruling?.answer).toContain("does not trigger Resourcefulness");
  expect(ruling?.sourceIds).toContain("card:neutral-resourcefulness");
});

test("broader Resourcefulness questions still use the normal packet path", () => {
  const { packet, ruling } = analyze("What does Resourcefulness do?");
  expect(packet.id).toBe("resourcefulness");
  expect(ruling?.id).not.toBe("resourcefulness-copied-effect");
});

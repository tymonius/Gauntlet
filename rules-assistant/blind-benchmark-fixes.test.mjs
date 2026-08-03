import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildRulesCorpus } from "./local-search.js";
import { analyzeQuestionLocally, buildCorpusReviewSnapshot } from "./rules-intelligence.js";
import { enrichPlanFromEntityDocuments } from "./rules-plan-enrichment.js";
import { buildRulePacket, prioritizeRulePacketSources } from "./rules-packets.js";
import { resolveDeterministicRuling } from "./rules-deterministic.js";
import { loadStoredHistoryV2 } from "./rules-history.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md", import.meta.url),
  "utf8"
);
const corpus = buildRulesCorpus({ canonicalData, rulebookMarkdown });

function resolve(question) {
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question));
  const packet = buildRulePacket(corpus, { question, plan });
  return resolveDeterministicRuling(corpus, { question, plan, packet });
}

test("broad destination matcher does not hijack Cleanup or incomplete draws", () => {
  expect(resolve("I reach Cleanup with five cards in Hand. How many do I have to discard?")?.id)
    .toBe("cleanup-hand-limit");
  expect(resolve("I must draw three cards, but my Draw Pile has one card and my Discard Pile has one card. What exactly happens?")?.id)
    .toBe("partial-draw-refill");
});

test("specific components and two-rule interactions override generic deterministic summaries", () => {
  expect(resolve("Armistice resolves as a Battle card and is not negated. Where do Armistice, the other Gambits and Tactics, and the cards still in Reserve go?"))
    .toBeNull();
  expect(resolve("Can Rite of Blood complete if I win without a Gambit or Tactic but I did use Transmutation in that battle?")?.id)
    .toBe("rite-of-blood-transmutation");
});

test("ordinary blind procedures now resolve exactly and explicitly", () => {
  expect(resolve("We tied the initial roll to see who goes first. Does one of us choose, or do we roll again?")?.rulingStatus)
    .toBe("explicit");
  expect(resolve("Our battle totals are tied, but the defender does not control the contested Territory. What happens to the roll and the cards already in use?")?.answer)
    .toContain("Both players reroll");
  expect(resolve("The opponent cannot form a Reserve because both their Draw Pile and Discard Pile are empty. Does the Inquisition immediately win through Purification?")?.answer)
    .toMatch(/^No\./);
});

test("Penance empty-Hand choice becomes a consistent provisional ruling", () => {
  const ruling = resolve("Penance's Action says the opponent chooses either to put a card from Hand in their Graveyard or I gain 1 Conviction. Their Hand is empty. May they choose the first option anyway?");
  expect(ruling?.rulingStatus).toBe("provisional");
  expect(ruling?.answer).toContain("gain 1 Conviction");
});

test("packet sources expose canonical IDs as the model citation tokens", () => {
  const question = "Can Tyranny negate an ordinary Gambit effect after that effect has already been applied?";
  const plan = enrichPlanFromEntityDocuments(corpus, analyzeQuestionLocally(corpus, question));
  const packet = buildRulePacket(corpus, { question, plan });
  const prioritized = prioritizeRulePacketSources({ sources: [], queries: [] }, corpus, packet, { limit: 8 });
  for (const source of prioritized.sources) expect(source.id).toBe(source.canonicalId);
});

test("stored conversation history is keyed by browser session, not formal playtest", async () => {
  let sql = "";
  let bound = null;
  const env = {
    DB: {
      prepare(value) {
        sql = value;
        return {
          bind(value) {
            bound = value;
            return { all: async () => ({ results: [] }) };
          }
        };
      }
    }
  };
  await loadStoredHistoryV2(env, { sessionId: "browser-session", playtestSessionId: "formal-session" });
  expect(sql).toContain("WHERE i.session_id = ?");
  expect(sql).not.toContain("playtest_session_id");
  expect(bound).toBe("browser-session");
});

test("corpus snapshot keeps one exact combined hash without persisting document bodies", async () => {
  const snapshot = await buildCorpusReviewSnapshot(corpus);
  expect(snapshot.corpusHash).toMatch(/^[a-f0-9]{64}$/);
  expect(snapshot.documents.length).toBe(corpus.documents.length);
  expect(snapshot.documents[0]).toHaveProperty("bodyLength");
  expect(snapshot.documents[0]).not.toHaveProperty("body");
});

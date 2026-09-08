import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { augmentRetrievalForContext, contextualQuery } from "./worker-v071.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url),
  "utf8"
);
const workerSource = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");

const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run",
  rulebookBrowserUrl: "https://gauntlet.run/rulebook/",
  canonicalDataUrl: "https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json"
});

// Keep this suite deterministic: it exercises retrieval and prompt contracts without model/API calls.
function augmentedSources(question, history = []) {
  const retrievalQuery = contextualQuery(question, history);
  const raw = retrieveRules(corpus, retrievalQuery, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

function augmentedIds(question, history = []) {
  return augmentedSources(question, history).map((source) => source.canonicalId);
}

describe("v0.7.1 Intelligence Surveillance and Interference", () => {
  const cases = [
    {
      question: "Can Intelligence interfere with a Gambit that was already face up?",
      expected: ["rulebook:direct-interference", "rulebook:gambit-surveillance"]
    },
    {
      question: "If Surveillance reveals an opposing Gambit, when can I interfere and where does it go?",
      expected: ["rulebook:gambit-surveillance", "rulebook:interference-after-surveillance"]
    },
    {
      question: "After I interfere with a Tactic, can my opponent replace it and can I revise my own Tactic?",
      expected: ["rulebook:tactic-surveillance", "rulebook:interference-after-surveillance", "rulebook:replacing-a-gambit-or-tactic", "rulebook:revising-a-choice"]
    },
    {
      question: "Does using Gambit Surveillance stop me using Tactic Surveillance later in the same battle?",
      expected: ["rulebook:gambit-surveillance", "rulebook:tactic-surveillance"]
    },
    {
      question: "Can I interfere with more than one opposing Tactic after revealing them?",
      expected: ["rulebook:tactic-surveillance", "rulebook:interference-after-surveillance"]
    },
    {
      question: "Do I get another Surveillance after my opponent replaces the card I interfered with?",
      expected: ["rulebook:interference-after-surveillance", "rulebook:replacing-a-gambit-or-tactic", "rulebook:revising-a-choice"]
    }
  ];

  for (const item of cases) {
    test(item.question, () => {
      const ids = augmentedIds(item.question);
      for (const expected of item.expected) expect(ids).toContain(expected);
    });
  }

  test("preserves the reviewed Surveillance -> face-up -> cost follow-up chain", () => {
    const surveillanceQuestion = "How does Surveillance work?";
    const surveillanceSources = augmentedSources(surveillanceQuestion);
    const surveillanceIds = surveillanceSources.map((source) => source.canonicalId);
    for (const expected of [
      "rulebook:gambit-surveillance",
      "rulebook:tactic-surveillance",
      "rulebook:interference-after-surveillance",
      "rulebook:direct-interference",
      "rulebook:intelligence-mirrors"
    ]) {
      expect(surveillanceIds).toContain(expected);
    }

    const surveillanceHistory = [
      { role: "user", content: surveillanceQuestion },
      {
        role: "assistant",
        content: "Surveillance reveals opposing face-down Gambits or Tactics for Intel and may be followed by Interference."
      }
    ];
    const faceUpQuestion = "What if the commitment is already face up?";
    const faceUpSources = augmentedSources(faceUpQuestion, surveillanceHistory);
    const faceUpIds = faceUpSources.map((source) => source.canonicalId);
    expect(faceUpIds).toContain("rulebook:direct-interference");
    expect(faceUpIds).toContain("rulebook:interference-after-surveillance");
    const directAuthority = faceUpSources.find((source) => source.canonicalId === "rulebook:direct-interference");
    expect(String(directAuthority?.body || "")).toContain("spend 2 Intel to Interfere with that card directly");

    const costHistory = [
      ...surveillanceHistory,
      { role: "user", content: faceUpQuestion },
      {
        role: "assistant",
        content: "A face-up opposing commitment may use Direct Interference at the same response timing for 2 Intel."
      }
    ];
    const costQuestion = "Does that change the cost of Interference?";
    const costSources = augmentedSources(costQuestion, costHistory);
    const costIds = costSources.map((source) => source.canonicalId);
    expect(costIds).toContain("rulebook:direct-interference");
    expect(costIds).toContain("rulebook:interference-after-surveillance");
    const surveillanceInterference = costSources.find((source) => source.canonicalId === "rulebook:interference-after-surveillance");
    expect(String(surveillanceInterference?.body || "")).toContain("spend 2 additional Intel per revealed card you remove");
  });

  test("does not pin Intelligence authority after the conversation pivots to another topic", () => {
    const history = [
      { role: "user", content: "Can I use Interference on that Gambit?" },
      { role: "assistant", content: "Yes, at the applicable Intelligence response timing." }
    ];
    const question = "How much does my Deed cost?";
    const retrievalQuery = contextualQuery(question, history);
    expect(retrievalQuery).toBe(question);
    const raw = retrieveRules(corpus, retrievalQuery, { limit: 10, excerptLength: 1300 });
    const rawIds = raw.map((source) => source.canonicalId);
    const augmented = augmentRetrievalForContext(corpus, question, history, raw).map((source) => source.canonicalId);
    expect(augmented).toEqual(rawIds);
  });

  test("prompt preserves the full procedure instead of collapsing Surveillance and Interference", () => {
    expect(workerSource).toContain("export const BEHAVIOR_REVISION = ");
    expect(workerSource).toContain("reconstruct the whole applicable sequence");
    expect(workerSource).toContain("replacement-or-pass choices");
    expect(workerSource).toContain("does not reopen an earlier window");
    expect(workerSource).toContain("Do not collapse distinct Faction Features into one procedure");
  });
});

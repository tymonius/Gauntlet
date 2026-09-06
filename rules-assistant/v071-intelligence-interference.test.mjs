import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { augmentRetrievalForContext } from "./worker-v071.js";

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

function augmentedIds(question, history = []) {
  const raw = retrieveRules(corpus, question, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, raw).map((source) => source.canonicalId);
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

  test("prompt preserves the full procedure instead of collapsing Surveillance and Interference", () => {
    expect(workerSource).toContain('export const BEHAVIOR_REVISION = "v071-qa-20260906-1"');
    expect(workerSource).toContain("reconstruct the whole applicable sequence");
    expect(workerSource).toContain("replacement-or-pass choices");
    expect(workerSource).toContain("does not reopen an earlier window");
    expect(workerSource).toContain("Do not collapse distinct Faction Features into one procedure");
  });
});

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

function sourcesFor(question) {
  const retrievalQuery = contextualQuery(question, []);
  const raw = retrieveRules(corpus, retrievalQuery, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, [], raw);
}

describe("v0.7.1 reviewed battle-sequence state question", () => {
  test("retrieves the complete procedure and keeps advantage distinct from Defensive Edge", () => {
    const question = "I am the defender, I currently have advantage, and both players have committed their Battle Hands. What happens next?";
    const sources = sourcesFor(question);
    const topSix = sources.slice(0, 6);
    const ids = topSix.map((source) => source.canonicalId);

    expect(ids).toContain("rulebook:quick-battle-reference");
    expect(ids).toContain("rulebook:advantage-and-disadvantage");
    expect(ids).toContain("rulebook:battle-sequence");
    expect(ids).toContain("rulebook:defensive-edge");

    const sequence = topSix.find((source) => source.canonicalId === "rulebook:battle-sequence");
    expect(String(sequence?.body || "")).toContain("Reveal Gambits");
    expect(String(sequence?.body || "")).toContain("Choose Tactics");
    expect(String(sequence?.body || "")).toContain("Reveal Tactics");
    expect(String(sequence?.body || "")).toContain("Determine the Outcome");

    const advantage = topSix.find((source) => source.canonicalId === "rulebook:advantage-and-disadvantage");
    expect(String(advantage?.body || "")).toContain("Before rolling battle dice");
    expect(String(advantage?.body || "")).toContain("roll N + 1 dice and use the highest result");

    const defensiveEdge = topSix.find((source) => source.canonicalId === "rulebook:defensive-edge");
    expect(String(defensiveEdge?.body || "")).toContain("the defender wins tied battle totals");
  });

  test("retrieves the battle sequence for natural next-step paraphrases", () => {
    for (const question of [
      "Both players have committed for battle. What happens next?",
      "We have set our battle cards. What is the next step?"
    ]) {
      const ids = sourcesFor(question).map((source) => source.canonicalId);
      expect(ids, question).toContain("rulebook:battle-sequence");
      expect(ids, question).toContain("rulebook:quick-battle-reference");
    }
  });

  test("the current prompt requires whole-sequence reconstruction and precise distinctions", () => {
    expect(workerSource).toContain("For a multi-step procedure, reconstruct the whole applicable sequence");
    expect(workerSource).toContain("Prefer precise distinctions between game concepts");
  });
});

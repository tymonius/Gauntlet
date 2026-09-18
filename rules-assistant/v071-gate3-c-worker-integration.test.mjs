import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  BEHAVIOR_REVISION,
  augmentRetrievalForContext,
  buildQuestionSpecificAdjudicationReminder,
  contextualQuery
} from "./worker-v071.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url),
  "utf8"
);

const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run",
  rulebookBrowserUrl: "https://gauntlet.run/rulebook/",
  canonicalDataUrl: "https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json"
});

function augmentedSources(question, history = []) {
  const query = contextualQuery(question, history);
  const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1300 });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

function sourceTitles(sources) {
  return sources.map((source) => String(source.title || source.heading || ""));
}

describe("v0.7.1 Gate 3 tranche C Worker integration", () => {
  test("uses the remediated behavior revision", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260918-26");
  });

  test("carries the long Advance Guard follow-up and preserves the named card authority", () => {
    const history = [
      { role: "user", content: "I played Advance Guard during Opening. What does the movement part do?" },
      { role: "assistant", content: "During your Movement this turn, Advance Guard may move you one additional Position." }
    ];
    const question = "If that extra step is the one that starts the fight, can I still put down a Gambit?";
    const query = contextualQuery(question, history);
    expect(query).toContain("Advance Guard");

    const sources = augmentedSources(question, history);
    expect(sourceTitles(sources).some((title) => /Advance Guard/i.test(title))).toBe(true);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, history);
    expect(reminder).toContain("Advance Guard");
    expect(reminder).toContain("include its source ID");
  });

  test("carries the long Confession follow-up and preserves the named card authority", () => {
    const history = [
      { role: "user", content: "I chose Confession and used it to reveal the opposing face-down Tactic. What can Confession do next?" },
      { role: "assistant", content: "Confession has a follow-up instruction after revealing that opposing Tactic." }
    ];
    const question = "After I peek at theirs, can I pull this one back into Reserve and pick a different Tactic?";
    const query = contextualQuery(question, history);
    expect(query).toContain("Confession");

    const sources = augmentedSources(question, history);
    expect(sourceTitles(sources).some((title) => /Confession/i.test(title))).toBe(true);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, history);
    expect(reminder).toContain("Confession");
  });

  test("does not carry prior card context across an explicit topic switch", () => {
    const history = [
      { role: "user", content: "I played Advance Guard during Opening. What does the movement part do?" },
      { role: "assistant", content: "During your Movement this turn, Advance Guard may move you one additional Position." }
    ];
    const question = "Separate issue: a printed Territory effect is slowing my Ranger. How long does Fieldcraft shut that effect off?";
    expect(contextualQuery(question, history)).toBe(question);

    const sources = augmentedSources(question, history);
    expect(sourceTitles(sources).some((title) => /Fieldcraft/i.test(title))).toBe(true);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, history);
    expect(reminder).not.toContain("Advance Guard");
  });

  test("puts direct Occupation authority into a battle-win versus control question", () => {
    const question = "I win an attack on an enemy-controlled Territory and remain there. Does that battle win itself give me control of the Territory?";
    const sources = augmentedSources(question);
    const ids = sources.map((source) => source.canonicalId);
    expect(ids).toContain("rulebook:occupation");
    const occupation = sources.find((source) => source.canonicalId === "rulebook:occupation");
    expect(String(occupation?.body || occupation?.excerpt || "")).toMatch(/does not itself change control/i);
  });

  test("maps terse player language to both Surveillance stages", () => {
    const question = "i watched their gambit already, can i watch tactics too";
    const sources = augmentedSources(question);
    const ids = sources.map((source) => source.canonicalId);
    expect(ids).toContain("rulebook:gambit-surveillance");
    expect(ids).toContain("rulebook:tactic-surveillance");
  });

  test("places the undefined Ruins state guard in the pre-generation reminder", () => {
    const question = "Bombardment can tell me to turn its Overlay into Ruins. What rules does published v0.7.1 give for what a Ruins Overlay actually does after that transformation?";
    const sources = augmentedSources(question);
    const reminder = buildQuestionSpecificAdjudicationReminder(question, sources, []);
    expect(reminder).toContain("does not define what that resulting state does");
    expect(reminder).toContain("classify the ruling provisional");
    expect(reminder).toContain("Do not inherit the pre-transformation card text");
  });
});
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  BEHAVIOR_REVISION,
  augmentRetrievalForContext,
  buildAmbiguousReferentClarification,
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

function sourcesFor(question, history = []) {
  const query = contextualQuery(question, history);
  const retrieved = retrieveRules(corpus, query, {
    limit: 10,
    excerptLength: 1300
  });
  return augmentRetrievalForContext(corpus, question, history, retrieved);
}

function sourceIds(sources) {
  return sources.map((source) => source.canonicalId);
}

function sourceText(source) {
  return String(source?.body || source?.excerpt || "").toLowerCase();
}

describe("v0.7.1 Gate 3 blind A promoted regressions", () => {
  test("pins r10 behavior", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260914-12");
  });

  test("ordinary player language for battle-card quantity retrieves the direct one-Gambit/one-Tactic rule", () => {
    const sources = sourcesFor("how many battle card do i get to use");
    expect(sourceIds(sources)).toContain("rulebook:game-at-a-glance");
    const authority = sources.find((source) => source.canonicalId === "rulebook:game-at-a-glance");
    expect(sourceText(authority)).toContain("one card from hand as a gambit");
    expect(sourceText(authority)).toContain("one card as a tactic");
  });

  test("ordinary player language for a Tactic destination retrieves clearing authority", () => {
    const sources = sourcesFor("what about the tactic, discard or graveyard?");
    expect(sourceIds(sources)).toContain("rulebook:clearing-battle-cards");
    const authority = sources.find((source) => source.canonicalId === "rulebook:clearing-battle-cards");
    expect(sourceText(authority)).toContain("tactics");
    expect(sourceText(authority)).toContain("discard pile");
  });

  test("ordinary player language for accepted Terms retrieves Accepted Terms", () => {
    const sources = sourcesFor("if they say yes to my deal do we still fight");
    expect(sourceIds(sources)).toContain("rulebook:accepted-terms");
    const authority = sources.find((source) => source.canonicalId === "rulebook:accepted-terms");
    expect(sourceText(authority)).toContain("no battle is fought");
  });

  test("history-bound Forced March follow-up preserves the named-card authority", () => {
    const history = [
      { role: "user", content: "I played Forced March during Opening. What does its extra movement do?" },
      { role: "assistant", content: "Forced March lets you move one additional Position during your Movement this turn." }
    ];
    const sources = sourcesFor(
      "Could that extra step be the one that starts a battle?",
      history
    );
    expect(sourceIds(sources)).toContain("card:neutral-forced-march");
    const authority = sources.find((source) => source.canonicalId === "card:neutral-forced-march");
    expect(sourceText(authority)).toContain("cannot initiate a battle");
  });

  test("two recent movement cards preserve both authorities and trigger deterministic clarification", () => {
    const history = [
      { role: "user", content: "I have Forced March and Give Chase in mind. They both move me farther, right?" },
      { role: "assistant", content: "They can both move you, but at different timings and under different instructions." }
    ];
    const question = "Can that card's movement be the move that starts a battle?";
    const sources = sourcesFor(question, history);
    expect(sourceIds(sources)).toContain("card:neutral-forced-march");
    expect(sourceIds(sources)).toContain("card:military-give-chase");
    const clarification = buildAmbiguousReferentClarification(question, history, sources);
    expect(clarification?.rulingStatus).toBe("unresolved");
    expect(clarification?.responseType).toBe("clarification");
    expect(clarification?.executionPath).toBe("deterministic-clarification");
    expect(clarification?.answer).toContain("Which card do you mean?");
  });
});
